import * as path from 'path';
import { start } from 'repl';
import { JigsawStructureFeature } from './JisgasStructureFeature';
import { LegacyJigsawStructureFeature } from './LegacyJisgasStructureFeature';

const LEGACY_STRUCUTE_TYPES = ['minecraft:village', 'minecraft:pillager_outpost', 'minecraft:bastion_remnant']

export interface StructureFeature{
    getIdentifier(): string
    getStartPool(): string
    getDepth(): number
    getStaringY(): number | "heightmap"
    doExpansionHack(): boolean
    getRadius(): number
}

export namespace StructureFeature{
    export async function getAll(reader: DatapackReader, version: "legacy" | "exp" | "default"): Promise<StructureFeature[]>{
        console.log(`getting all structures for version ${version}`)

        const features: StructureFeature[] = []
        
        const namespaces = reader.getFilesInPath("data")

        for (const namespace of namespaces){
            const ns_p = path.join('data', namespace, 'worldgen', version === "default" ? 'structure' : 'configured_structure_feature')
            const files = reader.getPathsInPath(ns_p)
            for (const file of files){
                if (!file.endsWith('.json'))
                    continue
                    
                const id = file.slice(0,-5)
                const p = path.join(ns_p, file)

                try {
                    const json =  await reader.readFileAsJson(p)

                    if (!json){
                        continue
                    }

                    if (((version === "legacy" || version === "exp") && LEGACY_STRUCUTE_TYPES.includes(json.type)) || (version === "exp" && json.type === "minecraft:ancient_city" )){
                        if (json.config?.start_pool === undefined ||json.config?.size === undefined){
                            console.warn(`Missing config in structure ${namespace}:${id} - ignoring`)
                            continue;
                        }

                        features.push(new LegacyJigsawStructureFeature(json.type, namespace, id, json.config.start_pool, json.config.size))
                    }

                    if (version === "default" && json.type === "minecraft:jigsaw"){
                        if (json.start_height === undefined || json.start_pool === undefined || json.use_expansion_hack === undefined || json.size === undefined){
                            console.warn(`Missing config in structure ${namespace}:${id} - ignoring`)
                            continue;
                        }

                        //TODO read height provider
                        var start_height = 30

                        features.push(new JigsawStructureFeature(namespace, id, start_height, json.use_expansion_hack, json.start_pool, json.size, json.project_start_to_heightmap))
                    }

                } catch (e){
                    console.warn("Cound not Parse JSON File " + p + " - ignoring")
                }
            }
        }

        return features
    }
}