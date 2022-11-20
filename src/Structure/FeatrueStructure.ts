import { NbtCompound, BlockPos, BlockState, StructureProvider, Identifier } from "deepslate";
import { AnnotationProvider, AnnotationType, StructureAnnotation } from "./AnnotationProvider";

export class FeatureStructure implements StructureProvider, AnnotationProvider{
    constructor(
        private feature: Identifier
    ){}

    getSize(): BlockPos {
        return [0,0,0]
    }

    getBlocks(): { pos: BlockPos; state: BlockState; nbt: NbtCompound; }[] {
        return []
    }

    getBlock(pos: BlockPos): { pos: BlockPos; state: BlockState; nbt: NbtCompound; } {
        return undefined
    }

    getAnnotations(): StructureAnnotation[] {
        return [{
            pos: [0.5, 0.5, 0.5],
            annotation: "feature",
            data: this.feature
        }]
    }

}