import { StructureProvider, Identifier, PlacedBlock } from "deepslate"
import { Datapack } from "mc-datapack-loader";
import { AnnotationProvider } from "../../Structure/AnnotationProvider";

export abstract class PoolElement{
    public async doExpansionHack(): Promise<number>{
        return 0
    }

    public abstract getStructure(): Promise<StructureProvider & AnnotationProvider>
    public abstract getProjection(): "rigid" | "terrain_matching"

    public abstract getShuffledJigsawBlocks(): Promise<PlacedBlock[]>

    public abstract getType(): string

    public abstract getDescription(): string
}

import { SinglePoolElement } from "./SinglePoolElement";
import { ListPoolElement } from "./ListPoolElement";
import { FeaturePoolElement } from "./FeaturePoolElement";
import { EmptyPoolElement } from "./EmptyPoolElement";

export namespace PoolElement{
    export function fromElement(datapack: Datapack, element: {
        element_type: string;
        [key: string]: any;
    }): PoolElement {
        switch (element?.element_type) {
            case "minecraft:empty_pool_element":
                return new EmptyPoolElement()

            case "minecraft:single_pool_element":
            case "minecraft:legacy_single_pool_element":
                return new SinglePoolElement(datapack, Identifier.parse(element.location), element.processors, element.projection)

            case "minecraft:feature_pool_element" :
                return new FeaturePoolElement(datapack, element.feature, element.projection)
            
            case "minecraft:list_pool_element" :
                return new ListPoolElement(datapack, element.elements, element.projection)

            default:
                console.warn("Pool element not readable: " + element?.element_type)
        }
    }
}


