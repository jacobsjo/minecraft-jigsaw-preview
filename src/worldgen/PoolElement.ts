import { Structure, StructureProvider } from "@webmc/core"
import { CompoundStructure, Rotation } from "../Structure/CompoundStructure";
import { EmptyStructure} from "../Structure/EmptyStructure"

export abstract class PoolElement{
    constructor(
        protected reader: DatapackReader
    ){

    }

    public abstract getStructure(): Promise<StructureProvider>


    public static fromElement(reader: DatapackReader, element: {
        element_type: string;
        [key: string]: any;
    }): PoolElement {
        switch (element?.element_type) {
            case "minecraft:empty_pool_element":
                return new EmptyPoolElement(reader)

            case "minecraft:single_pool_element":
            case "minecraft:legacy_single_pool_element":
                return new SinglePoolElement(reader, element.location)

            case "minecraft:feature_pool_element" :
                return new FeaturePoolElement(reader, element.feature)
            
            case "minecraft:list_pool_element" :
                return new ListPoolElement(reader, element.elements)

            default:
                console.warn("Pool element not readable: " + element?.element_type)
        }
    }
}

export class EmptyPoolElement extends PoolElement{
    public async getStructure(): Promise<StructureProvider> {
        return new EmptyStructure()
    }
}

export class FeaturePoolElement extends PoolElement{
    constructor(
        reader: DatapackReader,
        private feature: string
    ){
        super(reader)
    }

    public async getStructure(): Promise<StructureProvider> {
        console.warn("Feature Pool element not yet implemented")
        return new EmptyStructure()
    }
}

export class SinglePoolElement extends PoolElement{
    private structure : Promise<StructureProvider>
    constructor(
        reader: DatapackReader,
        private location: string
    ){
        super(reader)
        this.structure = CompoundStructure.StructurefromName(this.reader, this.location);
    }

    public getStructure(): Promise<StructureProvider>{
        return this.structure
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
        }[]
    ){
        super(reader)
        this.pool_elements = elements.map(element => PoolElement.fromElement(reader, element))

        this.structure = new Promise(async (resolve) => {
            const s = new CompoundStructure();
            for (const element of this.pool_elements) {
                s.addStructure(await element.getStructure(), [0,0,0], Rotation.Rotate0, undefined)
            }
            resolve(s)
        })
    }

    public getStructure(): Promise<StructureProvider>{
        return this.structure
    }
}