import { BlockNbt, BlockPos, BlockState, StructureProvider } from "@webmc/core";

export class EmptyStructure implements StructureProvider{
    getSize(): BlockPos {
        return [0,0,0]
    }

    getBlocks(): { pos: BlockPos; state: BlockState; nbt: BlockNbt; }[] {
        return []
    }

    getBlock(pos: BlockPos): { pos: BlockPos; state: BlockState; nbt: BlockNbt; } {
        return undefined
    }

    getAnnotations(): { pos: BlockPos; annotation: string; data: any; }[] {
        return [{
            pos: [0.5, 0.5, 0.5],
            annotation: "empty",
            data: undefined
        }]
    }

}