import { BlockPos, BlockState, NbtCompound, StructureProvider } from "deepslate";
import { AnnotationProvider, StructureAnnotation } from "./AnnotationProvider";


export class InsetStructure implements StructureProvider, AnnotationProvider{
    
    constructor(
        private readonly inset: StructureProvider & AnnotationProvider,
        private readonly baseStructure: StructureProvider
    ){}
    
    getSize(): BlockPos {
        return this.inset.getSize()
    }
    getBlocks(): { pos: BlockPos; state: BlockState; nbt?: NbtCompound; }[] {
        return this.inset.getBlocks()
    }
    getBlock(pos: BlockPos): { pos: BlockPos; state: BlockState; nbt?: NbtCompound; } {
        return this.inset.getBlock(pos) ?? this.baseStructure.getBlock(pos)
    }

    getAnnotations(): StructureAnnotation[] {
        return this.inset.getAnnotations()
    }
}