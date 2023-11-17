import { NbtCompound, BlockPos, BlockState, StructureProvider, Identifier, StringReader } from "deepslate";
import { FeatureStructure } from "../../Structure/FeatrueStructure";
import { AnonymousDatapack, Datapack } from "mc-datapack-loader";
import { AnnotationProvider } from "../../Structure/AnnotationProvider";
import { PoolElement } from "./PoolElement";


export class FeaturePoolElement extends PoolElement {
    private static JIGSAW = {
        pos: [0, 0, 0] as BlockPos,
        state: new BlockState("minecraft:jigsaw", { "orientation": "down_south" }),
        nbt: NbtCompound.fromString(new StringReader(`{joint: "rollable", name: "minecraft:bottom", pool: "minecraft:empty", final_state: "minecraft:air", target: "minecraft:empty"}`)) as NbtCompound
    };

    constructor(
        datapack: AnonymousDatapack,
        private feature: Identifier,
        private projection: "rigid" | "terrain_matching"
    ) {
        super();
    }

    public getType(): string {
        return "minecraft:feature_pool_element";
    }

    public async getStructure(): Promise<StructureProvider & AnnotationProvider> {
        return new FeatureStructure(this.feature);
    }

    public getProjection(): "rigid" | "terrain_matching" {
        return this.projection;
    }

    public async getShuffledJigsawBlocks(): Promise<{ pos: BlockPos; state: BlockState; nbt: NbtCompound; }[]> {
        return [FeaturePoolElement.JIGSAW];
    }


    public getDescription() {
        return `{
  "element_type": "minecraft:feature_pool_element",
  "feature": "` + this.feature + `",
  "projection": "` + this.projection + `"
}`;
    }

    public getShortDescription(): string {
        return `[feature] ${this.feature}`
    }
}
