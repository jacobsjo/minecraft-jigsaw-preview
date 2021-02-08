import * as path from 'path';
import fs from 'fs';

export class ConfiguedStructureFeature{
    constructor(
        private start_pool: string,
        private depth: number
    ){}

    public getStartPool(): string{
        return this.start_pool
    }

    public getDepth(): number{
        return this.depth
    }

    public static async fromName(datapackRoot: string, id: string): Promise<ConfiguedStructureFeature>{
        const [namespace, name] = id.split(":")
        const file = path.join(datapackRoot, 'data', namespace, 'worldgen', 'configured_structure_feature', name + ".json")
        return this.fromJsonFile(file)
    }

    public static async fromJsonFile(file: string): Promise<ConfiguedStructureFeature>{
        const filecontent = fs.readFileSync(file);
        const json = JSON.parse(filecontent.toString())
        if (json.type !== 'minecraft:village' && json.type !== 'minecraft:pillager_outpost' && json.type !== 'minecraft:bastion'){
            throw "Only Jigsaw Configured Structures are Supported (Village, Pillager Outpose, Bastion)"
        }

        if (json.config.start_pool === undefined ||json.config.size === undefined){
            throw "Configured Structure Config not correct"
        }

        return new ConfiguedStructureFeature(json.config.start_pool, json.config.size)
    }
}