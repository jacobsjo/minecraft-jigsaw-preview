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

    public static async getAll(root: DirectoryEntry, namespaces: string[]): Promise<ConfiguedStructureFeature[]>{
        return (await Promise.all(namespaces.map(namespace => {
            return new Promise<ConfiguedStructureFeature[]>((accept, reject) => {
                root.getDirectory(path.join('data', namespace, 'worldgen', 'configured_structure_feature'), {},
                (directoryEntry: DirectoryEntry) => {
                    const features: Promise<ConfiguedStructureFeature>[] = []
                    let done = false;
                    while (!done){
                        directoryEntry.createReader().readEntries(entries => {
                            if (entries.length === 0)
                                done = true

                            features.concat(entries.map(entry => entry.isFile?this.fromFile(entry as FileEntry, namespace):undefined))
                        })
                    }
                    accept(Promise.all(features))
                }, () => {reject("no conf")});
            });
        }))).flat()
    }

    public static async fromFile(fileEntry: FileEntry, namespace: string): Promise<ConfiguedStructureFeature>{
        return new Promise<ConfiguedStructureFeature>((resolve, reject) => {
            fileEntry.file(async (file) => {
                const json = JSON.parse(await file.text())
                if (json.type !== 'minecraft:village' && json.type !== 'minecraft:pillager_outpost' && json.type !== 'minecraft:bastion_remnant'){
                    reject("Only Jigsaw Configured Structures are Supported (Village, Pillager Outpose, Bastion)")
                }
        
                if (json.config.start_pool === undefined ||json.config.size === undefined){
                    reject("Configured Structure Config not correct")
                }
        
                resolve(new ConfiguedStructureFeature(namespace, fileEntry.name, json.config.start_pool, json.config.size, json.type === 'minecraft:village'))
            }, () => reject("Could not read file"))
        })
    }
}