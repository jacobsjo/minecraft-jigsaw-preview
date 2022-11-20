import { NbtCompound, BlockPos, BlockState, StructureProvider } from "deepslate";
import { AnnotationProvider, StructureAnnotation } from "./AnnotationProvider";

export class EmptyStructure implements StructureProvider, AnnotationProvider{
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
            annotation: "empty",
            data: undefined
        }]
    }

}