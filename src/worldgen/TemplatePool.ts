import { Identifier } from 'deepslate';
import { Datapack } from 'mc-datapack-loader';
import * as path from 'path';
import { shuffleArray } from '../util'
import { PoolElement } from './PoolElement';

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

        const list : PoolElement[] = []

        this.elements.forEach(element => {
            for (let i = 0 ; i < element.weight ; i++){
                list.push(element.element)
            }
        });

        return shuffleArray(list)
    }

    public async getMaxHeight(): Promise<number>{
        var maxHeight = -1;
        for (const element of this.elements){
            const structure = await element.element.getStructure()
            maxHeight = Math.max(maxHeight, structure.getSize()[1])
        }
        return maxHeight
    }

    public static fromName(datapack: Datapack, id: Identifier, doExpansionHack: boolean): Promise<TemplatePool>{
        if (this.templatePoolMap.has(id + "|" + doExpansionHack)){
            return this.templatePoolMap.get(id + "|" + doExpansionHack)
        }

        const promise: Promise<TemplatePool> = new Promise(async (resolve, reject) => {
            var json
            try {
                json = await datapack.get("worldgen/template_pool", id) as TemplatePoolJson
            } catch (e){
                if (e instanceof URIError){
                    reject(new EvalError("Cound not load Template Pool " + id))
                } else if (e instanceof DOMException){
                    reject(new EvalError("Permission error while loading Template Pool " + id + "\nTry reloading the datapack using the Open Datapack buttons"))
                } else {
                    reject(e)
                }

                json = await datapack.get("worldgen/template_pool", EMPTY) as TemplatePoolJson
            } 

            try {
                const pool_element = new TemplatePool(Identifier.parse(json.fallback), await Promise.all(json.elements.map(async (e: any) => {
                    const element = PoolElement.fromElement(datapack, e.element)
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