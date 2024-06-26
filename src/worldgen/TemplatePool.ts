import { Identifier } from 'deepslate';
import { AnonymousDatapack, Datapack, ResourceLocation } from 'mc-datapack-loader';
import * as path from 'path';
import { shuffleArray, weightedShuffleArray } from '../Util/util'
import { PoolElement } from './PoolElements/PoolElement';
import { PoolElements } from './PoolElements/PoolElements';

const EMPTY = new Identifier("minecraft", "empty")

export type TemplatePoolJson = {
    fallback: string,
    elements: {
        [key: string]: any;
        element_type: string;
    }[]
}

export class TemplatePool{
    
    private constructor(
        readonly fallback: Identifier,
        private elements : {
            weight: number;
            element: PoolElement;
        }[]
    ){
    }

    public getShuffeledElements(): PoolElement[]{
        return weightedShuffleArray(this.elements)
    }

    public async getMaxHeight(): Promise<number>{
        var maxHeight = -1;
        for (const element of this.elements){
            const structure = await element.element.getStructure()
            maxHeight = Math.max(maxHeight, structure.getSize()[1])
        }
        return maxHeight
    }

    public static fromName(datapack: AnonymousDatapack, id: Identifier, doExpansionHack: boolean, useLegacyStructuresFolder: boolean): Promise<TemplatePool>{
        if (this.templatePoolMap.has(id + "|" + doExpansionHack)){
            return this.templatePoolMap.get(id + "|" + doExpansionHack)
        }

        const promise: Promise<TemplatePool> = new Promise(async (resolve, reject) => {
            var json
            try {
                json = await datapack.get(ResourceLocation.WORLDGEN_TEMPLATE_POOL, id) as TemplatePoolJson
            } catch (e){
                if (e instanceof URIError){
                    reject(new EvalError("Cound not load Template Pool " + id))
                } else if (e instanceof DOMException){
                    reject(new EvalError("Permission error while loading Template Pool " + id + "\nTry reloading the datapack using the Open Datapack buttons"))
                } else {
                    reject(e)
                }

                json = await datapack.get(ResourceLocation.WORLDGEN_TEMPLATE_POOL, EMPTY) as TemplatePoolJson
            } 

            try {
                const pool_element = new TemplatePool(Identifier.parse(json.fallback), await Promise.all(json.elements.map(async (e: any) => {
                    const element = PoolElements.fromElement(datapack, e.element, useLegacyStructuresFolder)
                    if (doExpansionHack)
                        await element.doExpansionHack()
                    if (e.weight > 150){
                        throw EvalError("Template pool element weight " + e.weight + " in " + id + " too large. Maximum weight is 150 since Minecraft 1.17 for performance reasons. Higher weights are possible in 1.16 but highly discouraged. \n \n Affected Pool element: \n" + element.getDescription() )
                    } else if (e.weight < 1){
                        throw EvalError("Template pool element weight " + e.weight + " in " + id + " too small. Minimum weight is 1. \n \n Affected Pool element: \n" + element.getDescription() )
                    }
                    return {weight: e.weight, element: element}
                })))
                resolve(pool_element)
            } catch (e) {
                reject(e)
            }
        })

        this.templatePoolMap.set(id + "|" + doExpansionHack, promise)

        return promise
    }

    public static reload(){
        this.templatePoolMap.clear()
    }

    private static templatePoolMap: Map<string, Promise<TemplatePool>> = new Map()
}