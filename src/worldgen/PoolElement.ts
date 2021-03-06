import { BlockNbt, BlockPos, BlockState, Structure, StructureProvider } from "@webmc/core"
import { FeatureStructure } from "../Structure/FeatrueStructure";
import { CompoundStructure, Rotation } from "../Structure/CompoundStructure";
import { EmptyStructure} from "../Structure/EmptyStructure"
import { shuffleArray } from "../util";

export abstract class PoolElement{
    public abstract getStructure(): Promise<StructureProvider>

    public abstract getShuffledJigsawBlocks(): Promise<{
        pos: BlockPos;
        state: BlockState;
        nbt: BlockNbt;
    }[]>

    public abstract getType(): string

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

    public toString(){
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
        console.warn("Feature Pool element not yet implemented")
        return new FeatureStructure(this.feature)
    }

    public async getShuffledJigsawBlocks(): Promise<{ pos: BlockPos; state: BlockState; nbt: BlockNbt; }[]> {
        return [FeaturePoolElement.JIGSAW]
    }


    public toString(){
        return `{
  "element_type": "minecraft:feature_pool_element",
  "feature": "`+this.feature+`",
  "projection": "`+this.projection+`"
}`
    }
}

export class SinglePoolElement extends PoolElement{
    private structure : Promise<StructureProvider>
    constructor(
        reader: DatapackReader,
        private location: string,
        private processors: string,
        private projection: string
    ){
        super()
        this.structure = CompoundStructure.StructurefromName(reader, this.location);
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

    public toString(){
        return `{
  "element_type": "minecraft:single_pool_element",
  "location": "`+this.location+`",
  "processors": "`+this.processors+`",
  "projection": "`+this.projection+`"
}`
    }
}

export class ListPoolElement extends PoolElement{
    private pool_elements: PoolElement[]
    private structure: Promise<CompoundStructure>

    constructor(
        reader: DatapackReader,
        elements: {
            element_type: string;
            [key: string]: string;
        }[],
        private projection: string
    ){
        super()
        this.pool_elements = elements.map(element => PoolElement.fromElement(reader, element))

        this.structure = new Promise(async (resolve) => {
            const s = new CompoundStructure();
            for (const element of this.pool_elements) {
                s.addStructure(await element.getStructure(), [0,0,0], Rotation.Rotate0, undefined)
            }
            resolve(s)
        })
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

    public toString(){
        return `{
  "element_type": "minecraft:list_pool_element",
  "elements": [
`+this.pool_elements.map(e => {
    return "    " + e.toString().split("\n").join("\n    ")
}).join(",\n")+`
  ],
  "projection": "`+this.projection+`"
}`
    }
}