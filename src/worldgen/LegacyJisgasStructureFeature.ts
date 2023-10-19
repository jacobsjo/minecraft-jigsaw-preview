import { Identifier } from 'deepslate';
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

    public getStaringY(): number | "heightmap"{
        return (this.type === "minecraft:village" || this.type === "minecraft:pillager_outpost") ? "heightmap" : 30
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

}