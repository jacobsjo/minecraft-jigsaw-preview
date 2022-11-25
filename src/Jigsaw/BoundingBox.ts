import { BlockPos } from "deepslate";
import { vec3 } from "gl-matrix";


export class BoundingBox{
    readonly max: BlockPos

    constructor(
        readonly min : BlockPos,
        readonly size: BlockPos
    ){
        this.max = [min[0] + size[0] - 1, min[1] + size[1] - 1, min[2] + size[2] - 1]
    }

    public isInside(pos : BlockPos):boolean{
        return pos[0] >= this.min[0] && pos[0] <= this.max[0] &&
               pos[1] >= this.min[1] && pos[1] <= this.max[1] &&
               pos[2] >= this.min[2] && pos[2] <= this.max[2]
    }

    public containedIn(other : BoundingBox, allowYExtrusion: boolean): boolean{
        const min: BlockPos = [this.min[0], this.min[1], this.min[2]]
        const max: BlockPos = [this.max[0], this.max[1], this.max[2]]
        if (allowYExtrusion){
            if (max[1] > other.max[1]){
                max[1] = other.max[1]
            }
        }
        return other.isInside(min) && other.isInside(max)
    }
    
    public intersects(other : BoundingBox): boolean{
        const x = this.max[0] < other.min[0] || this.min[0] > other.max[0]
        const y = this.max[1] < other.min[1] || this.min[1] > other.max[1]
        const z = this.max[2] < other.min[2] || this.min[2] > other.max[2]

        return !(x || y || z)
    }

    public getAffectedChunks(chunkSize: number): vec3[]{
        const chunkMin = [Math.floor((this.min[0]-1)/chunkSize), Math.floor((this.min[1]-1)/chunkSize), Math.floor((this.min[2]-1)/chunkSize)]
        const chunkMax = [Math.floor((this.max[0]+1)/chunkSize), Math.floor((this.max[1]+1)/chunkSize), Math.floor((this.max[2]+1)/chunkSize)]

        const affected: vec3[] = []
        for (let x = chunkMin[0] ; x<= chunkMax[0] ; x++){
            for (let y = chunkMin[1] ; y<= chunkMax[1] ; y++){
                for (let z = chunkMin[2] ; z<= chunkMax[2] ; z++){
                    affected.push([x,y,z])
                }
            }
        }

        return affected
    }
}