import * as path from 'path';
import { StructureFeature } from './StructureFeature';

export class LegacyJigsawStructureFeature implements StructureFeature{
    constructor(
        private type: string,
        private namespace: string,
        private id: string,
        private start_pool: string,
        private depth: number,
    ){}

    getIdentifier(): string {
        return this.namespace + ":" + this.id
    }

    public getStartPool(): string{
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

}