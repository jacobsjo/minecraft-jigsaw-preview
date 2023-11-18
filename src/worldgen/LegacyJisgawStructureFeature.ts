import { HeightProvider, Heightmap, Identifier, VerticalAnchor } from 'deepslate';
import * as path from 'path';
import { PoolAliasBinding } from './PoolAlias';
import { StructureFeature } from './StructureFeature';

export class LegacyJigsawStructureFeature implements StructureFeature{
    constructor(
        private type: string,
        private id: Identifier,
        private start_pool: Identifier,
        private depth: number,
    ){}

    getIdentifier(): Identifier {
        return this.id
    }

    public getStartPool(): Identifier{
        return this.start_pool
    }

    public getDepth(): number{
        return this.depth
    }

    public getStartHeight(): HeightProvider {
        return HeightProvider.constant(VerticalAnchor.absolute((this.type === "minecraft:village" || this.type === "minecraft:pillager_outpost") ? 0 : 30))
    }
    
    public getHeightmap(): Heightmap {
        return (this.type === "minecraft:village" || this.type === "minecraft:pillager_outpost") ? "WORLD_SURFACE_WG" : undefined
    }

    public doExpansionHack(): boolean{
        return this.type === 'minecraft:village'
    }

    public getRadius(): number{
        return this.type === "minecraft:ancient_city" ? 128 : 80
    }

    public getStartJigsawName(): string | undefined {
        return undefined
    }

    public getPoolAliases(): PoolAliasBinding[] {
        return []
    }

    public getTerrainAdaptation(): string {
        return "none"
    }

}