import { HeightProvider, Heightmap, Identifier, Json } from 'deepslate';
import { AnonymousDatapack, ResourceLocation } from 'mc-datapack-loader';
import { JigsawStructureFeature } from './JisgawStructureFeature';
import { LegacyJigsawStructureFeature } from './LegacyJisgawStructureFeature';
import { PoolAliasBinding } from './PoolAlias';

const LEGACY_STRUCUTE_TYPES = ['minecraft:village', 'minecraft:pillager_outpost', 'minecraft:bastion_remnant']

export interface StructureFeature {
    getIdentifier(): Identifier
    getStartPool(): Identifier
    getDepth(): number
    getStartHeight(): HeightProvider
    getHeightmap(): Heightmap | undefined
    doExpansionHack(): boolean
    getRadius(): number
    getStartJigsawName(): string | undefined
    getPoolAliases(): PoolAliasBinding[]
    getTerrainAdaptation(): string
}

export namespace StructureFeature {
    export async function getAll(datapack: AnonymousDatapack, version: "legacy" | "exp" | "default"): Promise<StructureFeature[]> {
        const location: ResourceLocation = version === "default" ? ResourceLocation.WORLDGEN_STRUCTURE : ResourceLocation.LEGACY_WORLDGEN_CONFIGURED_STRUCTURE_FEATURE
        const features: StructureFeature[] = []

        for (const id of await datapack.getIds(location)) {

            try {
                const json = await datapack.get(location, id) as any

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

                    features.push(new JigsawStructureFeature(
                        id,
                        HeightProvider.fromJson(json.start_height),
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