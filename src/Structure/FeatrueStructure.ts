import { NbtCompound, BlockPos, BlockState, StructureProvider, Identifier } from "deepslate";

export class FeatureStructure implements StructureProvider{
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

    // TODO Feature annotation
    /*
    getAnnotations(): { pos: BlockPos; annotation: string; data: any; }[] {
        return [{
            pos: [0.5, 0.5, 0.5],
            annotation: "feature",
            data: this.feature
        }]
    }*/

}