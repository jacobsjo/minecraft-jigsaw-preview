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

    public getShuffeledElements():PoolElement[]{

        const list : PoolElement[] = []

        this.elements.forEach(element => {
            for (let i = 0 ; i < element.weight ; i++){
                list.push(element.element)
            }
        });

        return shuffleArray(list)
    }

    public static fromName(reader: DatapackReader, id: string): Promise<TemplatePool>{
        if (this.templatePoolMap.has(id)){
            return this.templatePoolMap.get(id)
        }

        const promise: Promise<TemplatePool> = new Promise(async (resolve, reject) => {
            try {
                const [namespace, name] = id.split(":")
                const p = path.join('data', namespace, 'worldgen', 'template_pool', name + ".json")
                const json = await reader.readFileAsJson(p)
                resolve(new TemplatePool(json.fallback, json.elements.map((e: any) => {
                    return {weight: e.weight, element: PoolElement.fromElement(reader, e.element)}
                })))
            } catch (e){
                if (e instanceof URIError)
                    reject("Cound not load Template Pool " + id)
                else if (e instanceof DOMException)
                    reject("Permission error while loading Template Pool " + id + "\nTry reloading the datapack using the Open Datapack buttons")
            }
        })

        this.templatePoolMap.set(id, promise)
        return promise
    }

    public static reload(){
        this.templatePoolMap.clear()
    }

    private static templatePoolMap: Map<string, Promise<TemplatePool>> = new Map()
}