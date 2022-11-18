import { NbtCompound, BlockPos, BlockState, StructureProvider } from "deepslate";

export class EmptyStructure implements StructureProvider{
    getSize(): BlockPos {
        return [0,0,0]
    }

    getBlocks(): { pos: BlockPos; state: BlockState; nbt: NbtCompound; }[] {
        return []
    }

    getBlock(pos: BlockPos): { pos: BlockPos; state: BlockState; nbt: NbtCompound; } {
        return undefined
    }

    // TODO: empty annotation
    /*
    getAnnotations(): { pos: BlockPos; annotation: string; data: any; }[] {
        return [{
            pos: [0.5, 0.5, 0.5],
            annotation: "empty",
            data: undefined
        }]
    }*/

}