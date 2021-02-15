import * as path from 'path';
import { shuffleArray } from '../util'

export class TemplatePool{
    constructor(
        readonly fallback: string,
        private elements : {
            weight: number;
            element: {
                location: string;
                processors: string;
                projection: string;
                element_type: string;
            },
        }[]
        ){}

    public getShuffeledElements():{
        location: string;
        processors: string;
        projection: string;
        element_type: string;
    }[]{

        const list :{
            location: string;
            processors: string;
            projection: string;
            element_type: string;
        }[] = []

        this.elements.forEach(element => {
            for (let i = 0 ; i < element.weight ; i++){
                list.push(element.element)
            }
        });

        return shuffleArray(list)
    }

    public static async fromName(reader: DatapackReader, id: string): Promise<TemplatePool>{
        const [namespace, name] = id.split(":")
        const p = path.join('data', namespace, 'worldgen', 'template_pool', name + ".json")
        const json = await reader.readFileAsJson(p)
        return new TemplatePool(json.fallback, json.elements)
    }
}