import { BlockPos, BlockState, NbtCompound, StructureProvider } from "deepslate";


export class YExpandedStructure implements StructureProvider{
    constructor(
        private readonly baseStructure: StructureProvider,
        private readonly height: number
    ){}

    getSize(): BlockPos {
        const base_size = this.baseStructure.getSize()
        return [base_size[0], Math.max(this.height, base_size[1]), base_size[2]]
    }

    getBlocks(): { pos: BlockPos; state: BlockState; nbt?: NbtCompound; }[] {
        return this.baseStructure.getBlocks()
    }

    getBlock(pos: BlockPos): { pos: BlockPos; state: BlockState; nbt?: NbtCompound; } {
        return this.baseStructure.getBlock(pos)
    }
    
}