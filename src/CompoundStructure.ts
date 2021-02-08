//import { NamedNbtTag, NbtTag, getTag, getListTag, getOptional } from "@webmc/nbt";
import { BlockNbt, BlockPos, BlockState, Structure} from "@webmc/core";
import { stat } from "fs";

export enum Rotation {
  Rotate0 = 0,
  Rotate90 = 1,
  Rotate180 = 2,
  Rotate270 = 3,
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Rotation {
  export function getFacingMapping(rot: Rotation): {[name: string]: string}{
    switch (rot) {
      case Rotation.Rotate0:
        return {
          "north": "north",
          "east": "east",
          "south": "south",
          "west": "west",
          "up": "up",
          "down": "down",
          "ascending": "ascending"
        }
      case Rotation.Rotate270:
        return {
          "north": "west",
          "east": "north",
          "south": "east",
          "west": "south",
          "up": "up",
          "down": "down",
          "ascending": "ascending"
        }
      case Rotation.Rotate180:
        return {
          "north": "south",
          "east": "west",
          "south": "north",
          "west": "east",
          "up": "up",
          "down": "down",
          "ascending": "ascending"
        }
    case Rotation.Rotate90:
      return {
        "north": "east",
        "east": "south",
        "south": "west",
        "west": "north",
        "up": "up",
        "down": "down",
        "ascending": "ascending"
    }
    }
  }  
}

export class CompoundStructure extends Structure {
  private elements: { structure: Structure, pos: BlockPos, rot: Rotation } [] = []
  private minPos: BlockPos = [0,0,0]
  private maxPos: BlockPos = [0,0,0]

  constructor() {
    super([0,0,0], [], []);
  }

  private getBounds(): [BlockPos, BlockPos]{
    return [this.minPos, this.maxPos]
  }


  public getSize(): BlockPos {
    const [minPos, maxPos] = this.getBounds()
    return [maxPos[0] - minPos[0] + 1, maxPos[1] - minPos[1] + 1, maxPos[2] - minPos[2] + 1]
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public addBlock(pos: BlockPos, name: string, properties?: { [key: string]: string }, nbt?: BlockNbt): this {
    throw "addBlock not supported in CompoundStructure"
  }

  public getBlocks() : {
    pos: BlockPos;
    state: BlockState;
    nbt: BlockNbt;
  }[] {
    return this.elements.flatMap(element => {
      const size = element.structure.getSize()
      const blocks = element.structure.getBlocks()
      blocks.forEach(block => {
        block.state = CompoundStructure.getRotatedBlockState(block.state, element.rot)
        const pos_0 = block.pos[0]
        switch (element.rot) {
          case Rotation.Rotate0:
            block.pos[0] = element.pos[0] + block.pos[0] - this.minPos[0]
            block.pos[1] = element.pos[1] + block.pos[1] - this.minPos[1]
            block.pos[2] = element.pos[2] + block.pos[2] - this.minPos[2]
            break
          case Rotation.Rotate90:
            block.pos[0] = element.pos[0] + size[0] - 1 - block.pos[2] - this.minPos[0]
            block.pos[1] = element.pos[1] + block.pos[1] - this.minPos[1]
            block.pos[2] = element.pos[2] + pos_0 - this.minPos[2]
            break
          case Rotation.Rotate180:
            block.pos[0] = element.pos[0] + size[0] - 1 - block.pos[0] - this.minPos[0]
            block.pos[1] = element.pos[1] + block.pos[1] - this.minPos[1]
            block.pos[2] = element.pos[2] + size[2] - 1 - block.pos[2] - this.minPos[2]
            break
          case Rotation.Rotate270:
            block.pos[0] = element.pos[0] + block.pos[2] - this.minPos[0]
            block.pos[1] = element.pos[1] + block.pos[1] - this.minPos[1]
            block.pos[2] = element.pos[2] + size[2] - 1 - pos_0 - this.minPos[1]
            break
        } 
      });
      return blocks
    })
  }

  public getBlock(pos: BlockPos) : {
    pos: BlockPos;
    state: BlockState;
    nbt: BlockNbt;
  } {
    return this.getBlocks().find(b => b.pos[0] === pos[0] && b.pos[1] === pos[1] && b.pos[2] === pos[2])
  }

  public addStructure(structure: Structure, pos: BlockPos, rot: Rotation): void{

    const size = structure.getSize()
    if (rot === Rotation.Rotate90 || rot === Rotation.Rotate270){
      const size0 = size[0]
      size[0] = size[2]
      size[2] = size0
    }

    if (this.elements.length === 0){
      this.minPos[0] = pos[0]
      this.minPos[1] = pos[1]
      this.minPos[2] = pos[2]
      this.maxPos[0] = pos[0] + size[0] - 1
      this.maxPos[1] = pos[1] + size[1] - 1
      this.maxPos[2] = pos[2] + size[2] - 1
    } else {
      this.minPos[0] = Math.min(this.minPos[0], pos[0])
      this.minPos[1] = Math.min(this.minPos[1], pos[1])
      this.minPos[2] = Math.min(this.minPos[2], pos[2])

      this.maxPos[0] = Math.max(this.maxPos[0], pos[0] + size[0] - 1)
      this.maxPos[1] = Math.max(this.maxPos[1], pos[1] + size[1] - 1)
      this.maxPos[2] = Math.max(this.maxPos[2], pos[2] + size[2] - 1)
    }

    this.elements.push({
      structure: structure,
      pos: pos,
      rot: rot
    })
  }

  private static getRotatedBlockState(state: BlockState, rot: Rotation): BlockState{
    const swapXZ : {[name: string]: string} = {'x': 'z', 'y': 'y', 'z': 'x'}
    
    const properties = state.getProperties()

    const facingMapping = Rotation.getFacingMapping(rot)
    
    //General Rotation of Blocks on an axis (logs etc.)
    if ('axis' in properties && (rot === Rotation.Rotate90 || rot === Rotation.Rotate270)){
      properties['axis'] = swapXZ[properties['axis']]
    }

    //General Facing of Most Blocks
    if ('facing' in properties){
      properties['facing'] = facingMapping[properties['facing']]
    }

    //Jigsaw orientations
    if ('orientation' in properties){
      const facings = properties['orientation'].split("_");
      properties['orientation'] = facingMapping[facings[0]] + "_" + facingMapping[facings[1]]
    }

    //Rotation of Signs and Banners
    if ('rotation' in properties){
      properties['rotation'] = properties['rotation'] + 4
    }

    //Rail shapes
    if ('shape' in properties){
      const facings = properties['shape'].split("_");
      properties['shape'] = facingMapping[facings[0]] + "_" + facingMapping[facings[1]]
    }

    //Connections of Fences, Glass-Pains, Redstone etc.
    if ('east' in properties){
      const east = properties['east']
      const west = properties['west']
      const north = properties['north']
      const south = properties['south']

      properties[facingMapping['east']] = east
      properties[facingMapping['west']] = west
      properties[facingMapping['north']] = north
      properties[facingMapping['south']] = south
    }

    return new BlockState(state.getName(), properties)
  }



}
