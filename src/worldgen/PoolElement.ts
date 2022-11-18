import { NbtCompound, BlockPos, BlockState, Structure, StructureProvider, Identifier, PlacedBlock, RawDataInput, NbtFile } from "deepslate"
import { FeatureStructure } from "../Structure/FeatrueStructure";
import { EmptyStructure} from "../Structure/EmptyStructure"
import { directionRelative, shuffleArray } from "../util";
import { BoundingBox } from "../BoundingBox";
import { TemplatePool } from "./TemplatePool";
import { ListStructure } from "../Structure/ListStructure";
import { Datapack } from "mc-datapack-loader";
import { YExpandedStructure } from "../Structure/YExpandedStructure";

export abstract class PoolElement{
    public async doExpansionHack(): Promise<number>{
        return 0
    }

    public abstract getStructure(): Promise<StructureProvider>
    public abstract getProjection(): "rigid" | "terrain_matching"

    public abstract getShuffledJigsawBlocks(): Promise<PlacedBlock[]>

    public abstract getType(): string

    public abstract getDescription(): string

    public static fromElement(datapack: Datapack, element: {
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

export class EmptyPoolElement extends PoolElement{
    public async getStructure(): Promise<StructureProvider> {
        return new EmptyStructure()
    }

    public getProjection(): "rigid" | "terrain_matching" {
        return "rigid";
    }

    public getType(): string{
        return "minecraft:empty_pool_element"
    }

    public async getShuffledJigsawBlocks(): Promise<{ pos: BlockPos; state: BlockState; nbt: NbtCompound; }[]> {
        return []
    }

    public getDescription(){
        return `{
  "element_type": "minecraft:empty_pool_element"
}`
    }
}

export class FeaturePoolElement extends PoolElement{
    private static JIGSAW = {
        pos: [0, 0, 0] as BlockPos,
        state: new BlockState("minecraft:jigsaw", {"orientation": "down_south"}),
        nbt: NbtCompound.fromJson({
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
        })
    }

    constructor(
        datapack: Datapack,
        private feature: Identifier,
        private projection: "rigid" | "terrain_matching"
    ){
        super()
    }

    public getType(): string{
        return "minecraft:feature_pool_element"
    }

    public async getStructure(): Promise<StructureProvider> {
        return new FeatureStructure(this.feature)
    }

    public getProjection(): "rigid" | "terrain_matching" {
        return this.projection
    }

    public async getShuffledJigsawBlocks(): Promise<{ pos: BlockPos; state: BlockState; nbt: NbtCompound; }[]> {
        return [FeaturePoolElement.JIGSAW]
    }


    public getDescription(){
        return `{
  "element_type": "minecraft:feature_pool_element",
  "feature": "`+this.feature+`",
  "projection": "`+this.projection+`"
}`
    }
}

export class SinglePoolElement extends PoolElement{
    private structure : Promise<StructureProvider>
    private expansionHackString = ""
    constructor(
        private datapack: Datapack,
        private id: Identifier,
        private processors: string,
        private projection: "rigid" | "terrain_matching",
    ){
        super()
        this.structure = new Promise(async (resolve) => {
            try {
                const arrayBuffer = (await datapack.get("structures", id)) as ArrayBuffer
                  const nbt = NbtFile.read(new Uint8Array(arrayBuffer))
                resolve(Structure.fromNbt(nbt.root))
            } catch (e) {
                console.warn(`Could not load structure ${id.toString()}: ${e}`)
                resolve(new Structure([1,1,1]))
            }
        });
    }

    public async doExpansionHack(){
        const oldHeight = (await this.structure).getSize()[1]
        if (oldHeight > 16){
            return 0
        }

        try{
            var minHeight = 0;
            for (const jigsaw of await this.getShuffledJigsawBlocks()){
                const orientation: string = jigsaw.state.getProperties()['orientation'] ?? 'north_up';
                const [forward, _] = orientation.split("_");
                const facingPos: BlockPos = directionRelative(jigsaw.pos, forward);
                const isInside: boolean = new BoundingBox([0,0,0] as BlockPos, (await this.structure).getSize()).isInside(facingPos);

                if (!isInside)
                    continue
                
                const pool: TemplatePool = await TemplatePool.fromName(this.datapack, Identifier.parse(jigsaw.nbt.getString("pool")), false);
                const fallbackPool: TemplatePool = await TemplatePool.fromName(this.datapack, pool.fallback, false);

                const maxHeight = await pool.getMaxHeight()
                const maxHeightFallback = await fallbackPool.getMaxHeight()

                minHeight = Math.max(minHeight, Math.max(maxHeight, maxHeightFallback) + 2)
            }
            this.structure = new Promise(async (resolve) => {
                resolve(new YExpandedStructure(await this.structure, minHeight))
            })
            if (minHeight > oldHeight)
                this.expansionHackString = "\n\nBounding box height expanded from " + oldHeight + " to " + minHeight + " blocks."
        } catch (e) {
            this.expansionHackString = "\n\nFailed to calculate expansion of bounding box: " + e
        }
        return minHeight
    }

    public getType(): string{
        return "minecraft:single_pool_element"
    }

    public getStructure(): Promise<StructureProvider>{
        return this.structure
    }

    public getProjection(): "rigid" | "terrain_matching" {
        return this.projection
    }

    public async getShuffledJigsawBlocks(): Promise<PlacedBlock[]> {
        return shuffleArray((await this.structure).getBlocks().filter(block => { return block.state.getName().namespace === "minecraft" && block.state.getName().path === "jigsaw"; }))
    }

    public getDescription(){
        return `{
  "element_type": "minecraft:single_pool_element",
  "location": "`+this.id.toString+`",
  "processors": "`+this.processors+`",
  "projection": "`+this.projection+`"
}` + this.expansionHackString
    }
}

export class ListPoolElement extends PoolElement{
    private pool_elements: PoolElement[]
    private structure: Promise<ListStructure>

    constructor(
        datapack: Datapack,
        elements: {
            element_type: string;
            [key: string]: string;
        }[],
        private projection: "rigid" | "terrain_matching",
    ){
        super()
        this.pool_elements = elements.map(element => PoolElement.fromElement(datapack, element))
        this.structure = new Promise(async (resolve) => {
            resolve(new ListStructure(await Promise.all(this.pool_elements.map(element => element.getStructure()))));
        })
    }

    public async doExpansionHack(){
        const minY = await this.pool_elements[0].doExpansionHack()
        ;(await this.structure).expandY(minY)
        return minY
    }

    public getType(): string{
        return "minecraft:list_pool_element"
    }

    public getStructure(): Promise<StructureProvider>{
        return this.structure
    }

    public getProjection(): "rigid" | "terrain_matching" {
        return this.projection
    }

    public async getShuffledJigsawBlocks(): Promise<PlacedBlock[]> {
        return this.pool_elements[0].getShuffledJigsawBlocks()
    }

    public getDescription(){
        return `{
  "element_type": "minecraft:list_pool_element",
  "elements": [
`+this.pool_elements.map(async e => {
    return "    " + e.getDescription().split("\n").join("\n    ")
}).join(",\n")+`
  ],
  "projection": "`+this.projection+`"
}`
    }
}