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

    public static async fromName(root: DirectoryEntry, id: string): Promise<TemplatePool>{
        const [namespace, name] = id.split(":")

        return new Promise<TemplatePool>((resolve, reject) => {
            root.getFile(path.join('/data', namespace, 'worldgen', 'template_pool', name + ".json"), {},
                (fileEntry) => {
                    fileEntry.file(async (file) => {
                        const json = JSON.parse(await file.text())
                        resolve(new TemplatePool(json.fallback, json.elements))
                    }, () => reject("Could not read file"))
                }, () => reject("id " + id + " not found")
            )
        })
    }
}