import * as path from 'path';
import fs from 'fs';

export class ConfiguedStructureFeature{
    constructor(
        private namespace: string,
        private id: string,
        private start_pool: string,
        private depth: number,
        private exp_hack: boolean
    ){}

    public toString(): string{
        return this.namespace + ":" + this.id
    }

    public getStartPool(): string{
        return this.start_pool
    }

    public getDepth(): number{
        return this.depth
    }

    public doExpansionHack(): boolean{
        return this.exp_hack
    }

    public static async getAll(reader: DatapackReader): Promise<ConfiguedStructureFeature[]>{
        const features: ConfiguedStructureFeature[] = []
        
        const namespaces = reader.getFilesInPath("data")

        for (const namespace of namespaces){
            const p = path.join('data', namespace, 'worldgen', 'configured_structure_feature')
            const files = reader.getPathsInPath(p)
            for (const file of files){
                if (!file.endsWith('.json'))
                    continue
                    
                const id = file.slice(0,-5)
                const p = path.join('data', namespace, 'worldgen', 'configured_structure_feature', file)
                
                try {
                    const json =  await reader.readFileAsJson(p)
                    if (json && json.type !== 'minecraft:village' && json.type !== 'minecraft:pillager_outpost' && json.type !== 'minecraft:bastion_remnant'){
                        continue; 
                    }
            
                    if (json.config.start_pool === undefined ||json.config.size === undefined){
                        continue;
                    }
            
                    features.push(new ConfiguedStructureFeature(namespace, id, json.config.start_pool, json.config.size, json.type === 'minecraft:village'))
                } catch (e){
                    console.warn("Cound not Parse JSON File " + p + " - ignoring")
                }
            }
        }

        return features
    }
}