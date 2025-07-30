import { HeightProvider, Heightmap, Identifier } from 'deepslate';
import * as path from 'path';
import { PoolAliasBinding } from './PoolAlias';
import { StructureFeature } from './StructureFeature';

export class JigsawStructureFeature implements StructureFeature{
    constructor(
        private id: Identifier,
        private start_height: HeightProvider,
        private use_expansion_hack: boolean,
        private start_pool: Identifier,
        private size: number,
        private radius: number,
        private height: number,
        private project_start_to_heightmap?: Heightmap,
        private start_jigsaw_name?: string,
        private pool_aliases?: PoolAliasBinding[],
        private terrain_adaptation?: string,
    ){
        if (size > 20){
            console.warn("size > 20 is not supported by vanilla minecraft")
        }

        if (radius > 128){
            console.warn("max_distance_from_center > 128 is not supported by vanilla minecraft")
        }

    }

    getIdentifier(): Identifier {
        return this.id
    }

    public getStartPool(): Identifier{
        return this.start_pool
    }

    public getDepth(): number{
        return this.size
    }

    public getStartHeight(): HeightProvider{
        return this.start_height
    }

    public getHeightmap(): Heightmap | undefined {
        return this.project_start_to_heightmap
    }

    public doExpansionHack(): boolean{
        return this.use_expansion_hack
    }

    public getRadius(): number{
        return this.radius
    }

    public getHeight(): number{
        return this.height
    }

    public getStartJigsawName(): string | undefined{
        return this.start_jigsaw_name
    }

    public getPoolAliases(): PoolAliasBinding[] {
        return this.pool_aliases
    }

    public getTerrainAdaptation(): string {
        return this.terrain_adaptation
    }

}