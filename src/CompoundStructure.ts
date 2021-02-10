//import { NamedNbtTag, NbtTag, getTag, getListTag, getOptional } from "@webmc/nbt";
import { BlockNbt, BlockPos, BlockState, StructureProvider, Structure} from "@webmc/core";
import { read as readNbt } from '@webmc/nbt'
import * as path from 'path';
import fs from 'fs';
import {BoundingBox} from "./BoundingBox"

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
          "ascending": "ascending"  // ascending: hack to allow easy use of facing mapping with rails
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

export class CompoundStructure implements StructureProvider {
  private elements: { structure: StructureProvider, pos: BlockPos, rot: Rotation, annotation: {check: number[], inside: number | undefined}} [] = []
  private minPos: BlockPos = [0,0,0]
  private maxPos: BlockPos = [0,0,0]

  private displayMaxStep = 1

  private cachedBlocks: {
    pos: BlockPos;
    state: BlockState;
    nbt: BlockNbt;
  }[] | undefined = undefined

  private getBounds(): [BlockPos, BlockPos]{
    return [this.minPos, this.maxPos]
  }

  public nextStep(): void{
    this.displayMaxStep = Math.min(this.displayMaxStep+1, this.elements.length)
    this.cachedBlocks = undefined
  }

  public prevStep(): void{
    this.displayMaxStep = Math.max(this.displayMaxStep-1, 1)
    this.cachedBlocks = undefined
  }

  public getSize(): BlockPos {
    const [minPos, maxPos] = this.getBounds()
    return [maxPos[0] - minPos[0] + 1, maxPos[1] - minPos[1] + 1, maxPos[2] - minPos[2] + 1]
  }

  public static mapElementBlocks(element: { structure: StructureProvider; rot: Rotation; pos: number[]; }) : {
    pos: BlockPos;
    state: BlockState;
    nbt: BlockNbt;
}[]  {
    const size = element.structure.getSize()
    const blocks = element.structure.getBlocks()
    return blocks.map(block => {
      return {
        "pos": CompoundStructure.mapPos(element.rot, block.pos, element.pos, size),
        "state": CompoundStructure.getRotatedBlockState(block.state, element.rot),
        "nbt": block.nbt
      }
    });
  }

  public static mapPos(rot: Rotation, pos: BlockPos, offset: number[], size: BlockPos): BlockPos{
    const newPos : BlockPos = [offset[0],offset[1],offset[2]]
    switch (rot) {
      case Rotation.Rotate0:
        newPos[0] += pos[0]
        newPos[1] += pos[1]
        newPos[2] += pos[2]
        break
      case Rotation.Rotate90:
        newPos[0] += size[2] - 1 - pos[2]
        newPos[1] += pos[1]
        newPos[2] += pos[0]
        break
      case Rotation.Rotate180:
        newPos[0] += size[0] - 1 - pos[0]
        newPos[1] += pos[1]
        newPos[2] += size[2] - 1 - pos[2]
        break
      case Rotation.Rotate270:
        newPos[0] += pos[2]
        newPos[1] += pos[1]
        newPos[2] += size[0] - 1 - pos[0]
        break
    } 
    return newPos
  }

  public static inverseMapPos(rot: Rotation, pos: BlockPos, offset: number[], size: BlockPos): BlockPos{
    const invRot = [0,3,2,1][rot]
    const newSize : BlockPos = [size[0], size[1], size[2]]
    if (rot === Rotation.Rotate90 || rot === Rotation.Rotate270){
      newSize[0] = size[2]
      newSize[2] = size[0]
    }
    const newPos: BlockPos = [pos[0] - offset[0], pos[1] - offset[1], pos[2] - offset[2]]
    return this.mapPos(invRot, newPos, [0, 0, 0], newSize)
  }

  public getBB(nr: number) : BoundingBox{
    const size =  this.elements[nr].structure.getSize()
    const newSize : BlockPos = [size[0], size[1], size[2]]
    if (this.elements[nr].rot === Rotation.Rotate90 || this.elements[nr].rot === Rotation.Rotate270){
      newSize[0] = size[2]
      newSize[2] = size[0]
    }

    const min: BlockPos = [this.elements[nr].pos[0], this.elements[nr].pos[1], this.elements[nr].pos[2]]
    return new BoundingBox(min, newSize)
  }

  public getElementBlocks(nr: number) : {
    pos: BlockPos;
    state: BlockState;
    nbt: BlockNbt;
  }[]{
    return CompoundStructure.mapElementBlocks(this.elements[nr])
  }

  public getDisplayBoundingBoxes(): [BoundingBox, BoundingBox | undefined, BoundingBox[]]{
    const ownBB = this.getBB(this.displayMaxStep-1)
    const newOwnBB = new BoundingBox([ownBB.min[0] - this.minPos[0], ownBB.min[1] - this.minPos[1],ownBB.min[2] - this.minPos[2]], ownBB.size)

    const inside = this.elements[this.displayMaxStep-1].annotation.inside
    let newInsideBB = undefined
    if (inside !== undefined){
      const insideBB = inside !== undefined ? this.getBB(inside) : undefined
      newInsideBB = new BoundingBox([insideBB.min[0] - this.minPos[0], insideBB.min[1] - this.minPos[1], insideBB.min[2] - this.minPos[2]], insideBB.size)
    }

    const check = this.elements[this.displayMaxStep-1].annotation.check
    const checkBBs = check.map(c => {
      const BB = this.getBB(c)
      const newBB = new BoundingBox([BB.min[0] - this.minPos[0], BB.min[1] - this.minPos[1], BB.min[2] - this.minPos[2]], BB.size)
      return newBB
    })

    return [newOwnBB, newInsideBB, checkBBs]
  }


  public getBlocks() : {
    pos: BlockPos;
    state: BlockState;
    nbt: BlockNbt;
  }[] {
    if (!this.cachedBlocks)
      this.cachedBlocks = this.elements.slice(0, this.displayMaxStep).flatMap(CompoundStructure.mapElementBlocks).map(block => {
        const newPos : BlockPos = [
          block.pos[0] - this.minPos[0],
          block.pos[1] - this.minPos[1],
          block.pos[2] - this.minPos[2]
        ]
        return {"pos": newPos, "state": block.state, "nbt": block.nbt}
      })

    return this.cachedBlocks
  }

  public getBlock(pos: BlockPos) : {
    pos: BlockPos;
    state: BlockState;
    nbt: BlockNbt;
  } {
    const newPos : BlockPos = [
      pos[0] + this.minPos[0],
      pos[1] + this.minPos[1],
      pos[2] + this.minPos[2]
    ]

    //search reverse to find inner blocks first
    for (let i=this.displayMaxStep-1 ; i>=0 ; i--){
      if (this.getBB(i).isInside(newPos)){
        const b = this.elements[i].structure.getBlock(CompoundStructure.inverseMapPos(this.elements[i].rot, newPos, this.elements[i].pos, this.elements[i].structure.getSize()))
        if (b && b.state.getName() !== "minecraft:air") return b
      }
    }
    
    return undefined

//    return this.getBlocks().find(b => b.pos[0] === pos[0] && b.pos[1] === pos[1] && b.pos[2] === pos[2])
  }

  public addStructure(structure: StructureProvider, pos: BlockPos, rot: Rotation, annotation: {check: number[], inside: number | undefined}): number{

    const size = structure.getSize()
    const newSize : BlockPos = [size[0], size[1], size[2]]
    if (rot === Rotation.Rotate90 || rot === Rotation.Rotate270){
      newSize[0] = size[2]
      newSize[2] = size[0]
    }

    if (this.elements.length === 0){
      this.minPos[0] = pos[0]
      this.minPos[1] = pos[1]
      this.minPos[2] = pos[2]
      this.maxPos[0] = pos[0] + newSize[0] - 1
      this.maxPos[1] = pos[1] + newSize[1] - 1
      this.maxPos[2] = pos[2] + newSize[2] - 1
    } else {
      this.minPos[0] = Math.min(this.minPos[0], pos[0])
      this.minPos[1] = Math.min(this.minPos[1], pos[1])
      this.minPos[2] = Math.min(this.minPos[2], pos[2])

      this.maxPos[0] = Math.max(this.maxPos[0], pos[0] + newSize[0] - 1)
      this.maxPos[1] = Math.max(this.maxPos[1], pos[1] + newSize[1] - 1)
      this.maxPos[2] = Math.max(this.maxPos[2], pos[2] + newSize[2] - 1)
    }

    return this.elements.push({
      structure: structure,
      pos: pos,
      rot: rot,
      annotation: annotation
    }) - 1
  }

  private static getRotatedBlockState(state: BlockState, rot: Rotation): BlockState{
    const swapXZ : {[name: string]: string} = {'x': 'z', 'y': 'y', 'z': 'x'}
    
    const properties = Object.assign({}, state.getProperties())

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
      let shape = facingMapping[facings[0]] + "_" + facingMapping[facings[1]]

      //fix wrong order
      switch (shape) {
        case "west_east":
          shape = "east_west"
          break;
        case "east_north":
          shape = "north_east"
          break;
        case "south_north":
          shape = "north_south"
          break;
        case "west_north":
          shape = "north_west"
          break;
        case "east_south":
          shape = "south_east"
          break;
        case "west_south":
          shape = "south_west"
          break;
      }
      properties['shape'] = shape
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

  static async StructureFromId(datapackRoot: string, id: string): Promise<Structure>{
    const [namespace, name] = id.split(":")
    const Data = fs.readFileSync(path.join(datapackRoot, 'data', namespace, 'structures', name + ".nbt"));
    const Nbt = readNbt(new Uint8Array(Data))
    return Structure.fromNbt(Nbt.result)
  }
}
