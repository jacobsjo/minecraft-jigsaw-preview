import { NbtCompound, BlockPos, BlockState, StructureProvider } from "deepslate";
import { EmptyStructure } from "../../Structure/EmptyStructure";
import { AnnotationProvider } from "../../Structure/AnnotationProvider";
import { PoolElement } from "./PoolElement";


export class EmptyPoolElement extends PoolElement {
    public async getStructure(): Promise<StructureProvider & AnnotationProvider> {
        return new EmptyStructure();
    }

    public getProjection(): "rigid" | "terrain_matching" {
        return "rigid";
    }

    public getType(): string {
        return "minecraft:empty_pool_element";
    }

    public async getShuffledJigsawBlocks(): Promise<{ pos: BlockPos; state: BlockState; nbt: NbtCompound; }[]> {
        return [];
    }

    public getDescription() {
        return `{
  "element_type": "minecraft:empty_pool_element"
}`;
    }

    public getShortDescription(): string {
        return `[empty]`
    }
}
