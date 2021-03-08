import { StructureProvider, BlockPos } from "@webmc/core";

export class ListStructure implements StructureProvider {
  private size: BlockPos = [0, 0, 0]

  constructor(
      private pieces: StructureProvider[]
    ) {
      for (const piece of this.pieces){
        const piece_size = piece.getSize()
        this.size[0] = Math.max(this.size[0], piece_size[0])
        this.size[1] = Math.max(this.size[1], piece_size[1])
        this.size[2] = Math.max(this.size[2], piece_size[2])
      }
  }

  public getSize() {
    return this.size
  }

  public expandY(minY: number){
    this.size[1] = Math.max(this.size[1], minY)
  }

  public getBlocks() {
    return this.pieces.flatMap(piece => piece.getBlocks())
  }

  public getBlock(pos: BlockPos) {
    return this.pieces[this.pieces.length - 1].getBlock(pos)
  }

  getAnnotations(): { pos: BlockPos, annotation: string; data: any; }[] {
    return this.pieces.flatMap(piece => piece.getAnnotations())
  }
}
