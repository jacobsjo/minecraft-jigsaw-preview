//import { NamedNbtTag, NbtTag, getTag, getListTag, getOptional } from "@webmc/nbt";
import { BlockNbt, BlockPos, BlockState, Structure} from "@webmc/core";

export enum Rotation {
  Rotate0 = 0,
  Rotate90 = 1,
  Rotate180 = 2,
  Rotate270 = 3,
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
      switch (element.rot) {
        case Rotation.Rotate0:
          blocks.forEach(block => {
            block.pos[0] = element.pos[0] + block.pos[0] - this.minPos[0]
            block.pos[1] = element.pos[1] + block.pos[1] - this.minPos[1]
            block.pos[2] = element.pos[2] + block.pos[2] - this.minPos[2]
          });
          return blocks
        case Rotation.Rotate90:
          blocks.forEach(block => {
            const pos_0 = block.pos[0]
            block.pos[0] = element.pos[0] + size[2] - 1 - block.pos[2] - this.minPos[0]
            block.pos[1] = element.pos[1] + block.pos[1] - this.minPos[1]
            block.pos[2] = element.pos[2] + pos_0 - this.minPos[2]
          });
          return blocks
        case Rotation.Rotate180:
          blocks.forEach(block => {
            block.pos[0] = element.pos[0] + size[0] - 1 - block.pos[0] - this.minPos[0]
            block.pos[1] = element.pos[1] + block.pos[1] - this.minPos[1]
            block.pos[2] = element.pos[2] + size[2] - 1 - block.pos[2] - this.minPos[2]
          });
          return blocks
        case Rotation.Rotate270:
          blocks.forEach(block => {
            const pos_0 = block.pos[0]
            block.pos[0] = element.pos[0] + block.pos[2] - this.minPos[0]
            block.pos[1] = element.pos[1] + block.pos[1] - this.minPos[1]
            block.pos[2] = element.pos[2] + size[0] - 1 - pos_0 - this.minPos[1]
          });
          return blocks
      }
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
      const tmp = size[0]
      size[2] = size[0]
      size[0] = tmp
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
}
