import * as path from 'path';
import fs from 'fs';
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

    public static async fromName(datapackRoot: string, id: string): Promise<TemplatePool>{
        const [namespace, name] = id.split(":")
        const file = path.join(datapackRoot, 'data', namespace, 'worldgen', 'template_pool', name + ".json")
        return this.fromJsonFile(file)
    }

    public static async fromJsonFile(file: string): Promise<TemplatePool>{
        const filecontent = fs.readFileSync(file);
        const json = JSON.parse(filecontent.toString())
        return new TemplatePool(json.fallback, json.elements)
    }
}