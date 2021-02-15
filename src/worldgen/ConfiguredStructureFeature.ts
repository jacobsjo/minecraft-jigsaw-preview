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

    public static async getAll(reader: DatapackReader): Promise<string[]>{
        const namespaces = await reader.getFilesInPath("data")

        const features: string[] = []
        for (const namespace of namespaces){
            const p = path.join('data', namespace, 'worldgen', 'configured_structure_feature')
            features.concat((await reader.getFilesInPath(p)).map((file)=>{
                return namespace + ":" + file
            }))
        }

        return features
    }

    public static async fromName(reader: DatapackReader, id: string): Promise<ConfiguedStructureFeature>{
        const [namespace, name] = id.split(":")
        const p = path.join('/data', namespace, 'worldgen', 'template_pool', name + ".json")
        const json = await reader.readFileAsJson(p)
        if (json.type !== 'minecraft:village' && json.type !== 'minecraft:pillager_outpost' && json.type !== 'minecraft:bastion_remnant'){
            throw "Only Jigsaw Configured Structures are Supported (Village, Pillager Outpose, Bastion)"
        }

        if (json.config.start_pool === undefined ||json.config.size === undefined){
            throw "Configured Structure Config not correct"
        }

        return new ConfiguedStructureFeature(namespace, id, json.config.start_pool, json.config.size, json.type === 'minecraft:village')
    }
}