import { BlockNbt, BlockPos, BlockState, StructureProvider } from "@webmc/core";

export class FeatureStructure implements StructureProvider{
    private static JIGSAW = {
        pos: [0, 0, 0] as BlockPos,
        state: new BlockState("minecraft:jigsaw", {"orientation": "down_south"}),
        nbt: {
            "name": {
                "type": "string",
                "value": "minecraft:bottom"
            },
            "final_state": {
                "type": "string",
                "value": "minecraft:air"
            },
            "pool": {
                "type": "string",
                "value": "minecraft:empty"
            },
            "target": {
                "type": "string",
                "value": "minecraft:empty"
            },
            "joint": {
                "type": "string",
                "value": "rollable"
            },
        } as BlockNbt
    }

    getSize(): BlockPos {
        return [0, 0, 0]
    }

    getBlocks(): { pos: BlockPos; state: BlockState; nbt: BlockNbt; }[] {
        return [FeatureStructure.JIGSAW]
    }

    getBlock(pos: BlockPos): { pos: BlockPos; state: BlockState; nbt: BlockNbt; } {
        if (pos[0] === 0 && pos[1] ===0 && pos[2] === 0){
            return FeatureStructure.JIGSAW
        } else {
            return undefined
        }
    }
}