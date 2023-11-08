import { Identifier, Json } from 'deepslate';
import { Datapack, DataType } from 'mc-datapack-loader';
import { JigsawStructureFeature } from './JisgasStructureFeature';
import { LegacyJigsawStructureFeature } from './LegacyJisgasStructureFeature';
import { PoolAliasBinding } from './PoolAlias';

const LEGACY_STRUCUTE_TYPES = ['minecraft:village', 'minecraft:pillager_outpost', 'minecraft:bastion_remnant']

export interface StructureFeature {
    getIdentifier(): Identifier
    getStartPool(): Identifier
    getDepth(): number
    getStaringY(): number | "heightmap"
    doExpansionHack(): boolean
    getRadius(): number
    getStartJigsawName(): string | undefined
    getPoolAliases(): PoolAliasBinding[]
    getTerrainAdaptation(): string
}

export namespace StructureFeature {
    export async function getAll(datapack: Datapack, version: "legacy" | "exp" | "default"): Promise<StructureFeature[]> {
        console.log(`getting all structures for version ${version}`)

        const type: DataType = version === "default" ? "worldgen/structure" : "worldgen/configured_structure_feature"

        const features: StructureFeature[] = []

        for (const id of await datapack.getIds(type)) {

            try {
                const json = await datapack.get(type, id) as any

                if (!json) {
                    continue
                }

                if (((version === "legacy" || version === "exp") && LEGACY_STRUCUTE_TYPES.includes(json.type)) || (version === "exp" && json.type === "minecraft:ancient_city")) {
                    if (json.config?.start_pool === undefined || json.config?.size === undefined) {
                        console.warn(`Missing config in structure ${id.toString()} - ignoring`)
                        continue;
                    }

                    features.push(new LegacyJigsawStructureFeature(json.type, id, Identifier.parse(json.config.start_pool), json.config.size))
                }


                if (version === "default" && (Identifier.parse(json.type).equals(Identifier.create("jigsaw")))) {
                    if (json.start_height === undefined || json.start_pool === undefined || json.use_expansion_hack === undefined || json.size === undefined) {
                        console.warn(`Missing config in structure ${id.toString()} - ignoring`)
                        continue;
                    }

                    //TODO read height provider
                    var start_height = 30

                    features.push(new JigsawStructureFeature(
                        id,
                        start_height,
                        json.use_expansion_hack,
                        Identifier.parse(json.start_pool),
                        json.size,
                        json.max_distance_from_center,
                        json.project_start_to_heightmap,
                        json.start_jigsaw_name,
                        json.pool_aliases ? Json.readArray(json.pool_aliases, PoolAliasBinding.fromJson) : [],
                        json.terrain_adaptation ?? "none"
                    ))
                }

            } catch (e) {
                console.warn(`Cound not Parse JSON File ${id.toString()} - ignoring`)
                console.warn(e)
            }
        }

        return features
    }
}