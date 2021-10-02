import * as path from 'path';
import { shuffleArray } from '../util'
import { PoolElement } from './PoolElement';

export class TemplatePool{

    private constructor(
        readonly fallback: string,
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

    public static fromName(reader: DatapackReader, id: string, doExpansionHack: boolean): Promise<TemplatePool>{
        if (this.templatePoolMap.has(id + "|" + doExpansionHack)){
            return this.templatePoolMap.get(id + "|" + doExpansionHack)
        }

        const promise: Promise<TemplatePool> = new Promise(async (resolve, reject) => {
            var json
            try {
                const [namespace, name] = id.split(":")
                const p = path.join('data', namespace, 'worldgen', 'template_pool', name + ".json")
                json = await reader.readFileAsJson(p)
            } catch (e){
                if (e instanceof URIError){
                    console.warn("Cound not load Template Pool " + id)
                } else if (e instanceof DOMException)
                    console.warn("Permission error while loading Template Pool " + id + "\nTry reloading the datapack using the Open Datapack buttons")
                else if (e instanceof EvalError)
                    console.warn(e.message)
                else
                    console.warn(e)

                json = await reader.readFileAsJson(path.join('data', 'minecraft', 'worldgen', 'template_pool', 'empty.json'))
            } 

            try {
                const pool_element = new TemplatePool(json.fallback, await Promise.all(json.elements.map(async (e: any) => {
                    const element = PoolElement.fromElement(reader, e.element)
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