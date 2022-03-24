import * as path from 'path';
import { StructureFeature } from './StructureFeature';

export class JigsawStructureFeature implements StructureFeature{
    constructor(
        private namespace: string,
        private id: string,
        private start_height: number,
        private use_expansion_hack: boolean,
        private start_pool: string,
        private size: number,
        private radius: number,
        private project_start_to_heightmap?: string
    ){
        if (size > 7){
            console.warn("size > 7 is not supported by vanilla minecraft")
        }

        if (radius > 128){
            console.warn("max_distance_from_center > 128 is not supported by vanilla minecraft")
        }

    }

    getIdentifier(): string {
        return this.namespace + ":" + this.id
    }

    public getStartPool(): string{
        return this.start_pool
    }

    public getDepth(): number{
        return this.size
    }

    public getStaringY(): number | "heightmap"{
        return this.project_start_to_heightmap ? "heightmap" : this.start_height
    }

    public doExpansionHack(): boolean{
        return this.use_expansion_hack
    }

    public getRadius(): number{
        return this.radius
    }

}