import { SinglePoolElement } from "./SinglePoolElement";
import { ListPoolElement } from "./ListPoolElement";
import { FeaturePoolElement } from "./FeaturePoolElement";
import { EmptyPoolElement } from "./EmptyPoolElement";
import { PoolElement } from "./PoolElement";
import { AnonymousDatapack, Datapack } from "mc-datapack-loader";
import { Identifier } from "deepslate";

export namespace PoolElements{
    export function fromElement(datapack: AnonymousDatapack, element: {
        element_type: string;
        [key: string]: any;
    }, useLegacyStructuresFolder: boolean): PoolElement {
        switch (element?.element_type) {
            case "minecraft:empty_pool_element":
                return new EmptyPoolElement()

            case "minecraft:single_pool_element":
            case "minecraft:legacy_single_pool_element":
                return new SinglePoolElement(datapack, Identifier.parse(element.location), element.processors, element.projection, useLegacyStructuresFolder)

            case "minecraft:feature_pool_element" :
                return new FeaturePoolElement(datapack, element.feature, element.projection)
            
            case "minecraft:list_pool_element" :
                return new ListPoolElement(datapack, element.elements, element.projection, useLegacyStructuresFolder)

            default:
                console.warn("Pool element not readable: " + element?.element_type)
        }
    }
}