import { StructureProvider, BlockPos } from "deepslate";
import { AnnotationProvider, StructureAnnotation } from "./AnnotationProvider";

export class ListStructure implements StructureProvider, AnnotationProvider {
  private size: BlockPos = [0, 0, 0]

  constructor(
      private pieces: (StructureProvider & AnnotationProvider)[]
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

  getAnnotations(): StructureAnnotation[] {
    return this.pieces.flatMap(piece => piece.getAnnotations())
  }
}
