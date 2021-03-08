import { BlockNbt, BlockPos, BlockState, Structure, StructureProvider } from "@webmc/core"
import { FeatureStructure } from "../Structure/FeatrueStructure";
import { CompoundStructure, Rotation } from "../Structure/CompoundStructure";
import { EmptyStructure} from "../Structure/EmptyStructure"
import { directionRelative, shuffleArray } from "../util";
import { PieceStructure } from "../Structure/PieceStructure";
import { BoundingBox } from "../BoundingBox";
import { TemplatePool } from "./TemplatePool";
import { ListStructure } from "../Structure/ListStructure";

export abstract class PoolElement{
    public async doExpansionHack(): Promise<number>{
        return 0
    }

    public abstract getStructure(): Promise<StructureProvider>

    public abstract getShuffledJigsawBlocks(): Promise<{
        pos: BlockPos;
        state: BlockState;
        nbt: BlockNbt;
    }[]>

    public abstract getType(): string

    public abstract getDescription(): string

    public static fromElement(reader: DatapackReader, element: {
        element_type: string;
        [key: string]: any;
    }): PoolElement {
        switch (element?.element_type) {
            case "minecraft:empty_pool_element":
                return new EmptyPoolElement()

            case "minecraft:single_pool_element":
            case "minecraft:legacy_single_pool_element":
                return new SinglePoolElement(reader, element.location, element.processors, element.projection)

            case "minecraft:feature_pool_element" :
                return new FeaturePoolElement(reader, element.feature, element.projection)
            
            case "minecraft:list_pool_element" :
                return new ListPoolElement(reader, element.elements, element.projection)

            default:
                console.warn("Pool element not readable: " + element?.element_type)
        }
    }
}

export class EmptyPoolElement extends PoolElement{

    public async getStructure(): Promise<StructureProvider> {
        return new EmptyStructure()
    }

    public getType(): string{
        return "minecraft:empty_pool_element"
    }

    public async getShuffledJigsawBlocks(): Promise<{ pos: BlockPos; state: BlockState; nbt: BlockNbt; }[]> {
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

    constructor(
        reader: DatapackReader,
        private feature: string,
        private projection: string
    ){
        super()
    }

    public getType(): string{
        return "minecraft:feature_pool_element"
    }

    public async getStructure(): Promise<StructureProvider> {
        return new FeatureStructure(this.feature)
    }

    public async getShuffledJigsawBlocks(): Promise<{ pos: BlockPos; state: BlockState; nbt: BlockNbt; }[]> {
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
    private structure : Promise<PieceStructure>
    private expansionHackString = ""
    constructor(
        private reader: DatapackReader,
        private location: string,
        private processors: string,
        private projection: string,
    ){
        super()
        this.structure = PieceStructure.fromName(reader, this.location);
    }

    public async doExpansionHack(){
        const oldHeight = (await this.structure).getSize()[1]
        if (oldHeight > 16){
            return 0
        }

        var minHeight = 0;
        for (const jigsaw of await this.getShuffledJigsawBlocks()){
            if (typeof jigsaw.nbt.pool.value !== "string")
                throw "pool element nbt of wrong type";

            const orientation: string = jigsaw.state.getProperties()['orientation'] ?? 'north_up';
            const [forward, _] = orientation.split("_");
            const facingPos: BlockPos = directionRelative(jigsaw.pos, forward);
            const isInside: boolean = new BoundingBox([0,0,0] as BlockPos, (await this.structure).getSize()).isInside(facingPos);

            if (!isInside)
                continue
            
            const pool: TemplatePool = await TemplatePool.fromName(this.reader, jigsaw.nbt.pool.value, false);
            const fallbackPool: TemplatePool = await TemplatePool.fromName(this.reader, pool.fallback, false);

            const maxHeight = await pool.getMaxHeight()
            const maxHeightFallback = await fallbackPool.getMaxHeight()

            minHeight = Math.max(minHeight, Math.max(maxHeight, maxHeightFallback))
        }
        ;(await this.structure).expandY(minHeight)
        if (minHeight > oldHeight)
            this.expansionHackString = "\n\nBounding box height expanded from " + oldHeight + " to " + minHeight + " blocks."
        return minHeight
    }

    public getType(): string{
        return "minecraft:single_pool_element"
    }

    public getStructure(): Promise<StructureProvider>{
        return this.structure
    }

    public async getShuffledJigsawBlocks(): Promise<{ pos: BlockPos; state: BlockState; nbt: BlockNbt; }[]> {
        return shuffleArray((await this.structure).getBlocks().filter(block => { return block.state.getName() === "minecraft:jigsaw"; }))
    }

    public getDescription(){
        return `{
  "element_type": "minecraft:single_pool_element",
  "location": "`+this.location+`",
  "processors": "`+this.processors+`",
  "projection": "`+this.projection+`"
}` + this.expansionHackString
    }
}

export class ListPoolElement extends PoolElement{
    private pool_elements: PoolElement[]
    private structure: Promise<ListStructure>

    constructor(
        reader: DatapackReader,
        elements: {
            element_type: string;
            [key: string]: string;
        }[],
        private projection: string,
    ){
        super()
        this.pool_elements = elements.map(element => PoolElement.fromElement(reader, element))
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

    public async getShuffledJigsawBlocks(): Promise<{ pos: BlockPos; state: BlockState; nbt: BlockNbt; }[]> {
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