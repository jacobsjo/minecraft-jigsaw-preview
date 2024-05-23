import { StructureProvider, PlacedBlock } from "deepslate";
import { ListStructure } from "../../Structure/ListStructure";
import { AnonymousDatapack, Datapack } from "mc-datapack-loader";
import { AnnotationProvider } from "../../Structure/AnnotationProvider";
import { PoolElement } from "./PoolElement";
import { PoolElements } from "./PoolElements";


export class ListPoolElement extends PoolElement {
    private pool_elements: PoolElement[];
    private structure: Promise<ListStructure>;

    constructor(
        datapack: AnonymousDatapack,
        elements: {
            element_type: string;
            [key: string]: string;
        }[],
        private projection: "rigid" | "terrain_matching",
        useLegacyStructuresFolder: boolean
    ) {
        super();
        this.pool_elements = elements.map(element => PoolElements.fromElement(datapack, element, useLegacyStructuresFolder));
        this.structure = new Promise(async (resolve) => {
            resolve(new ListStructure(await Promise.all(this.pool_elements.map(element => element.getStructure()))));
        });
    }

    public async doExpansionHack() {
        const minY = await this.pool_elements[0].doExpansionHack(); (await this.structure).expandY(minY);
        return minY;
    }

    public getType(): string {
        return "minecraft:list_pool_element";
    }

    public getStructure(): Promise<StructureProvider & AnnotationProvider> {
        return this.structure;
    }

    public getProjection(): "rigid" | "terrain_matching" {
        return this.projection;
    }

    public async getShuffledJigsawBlocks(): Promise<PlacedBlock[]> {
        return this.pool_elements[0].getShuffledJigsawBlocks();
    }

    public getDescription() {
        return `{
  "element_type": "minecraft:list_pool_element",
  "elements": [
` + this.pool_elements.map((e) => {
            return "    " + e.getDescription().split("\n").join("\n    ");
        }).join(",\n") + `
  ],
  "projection": "` + this.projection + `"
}`;
    }

    public getShortDescription(): string {
        return `[list] ${this.pool_elements[0].getShortDescription()} et al.`
    }
}
