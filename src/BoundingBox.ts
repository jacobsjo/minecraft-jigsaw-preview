import { BlockPos } from "@webmc/core";


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

//        return Math.abs(this.min[0] + this.size[0]/2 - other.min[0] + other.size[0]/2) * 2 < (this.size[0] + other.size[0]) &&
//               Math.abs(this.min[1] + this.size[1]/2 - other.min[1] + other.size[1]/2) * 2 < (this.size[1] + other.size[1]) &&
//               Math.abs(this.min[2] + this.size[2]/2 - other.min[2] + other.size[2]/2) * 2 < (this.size[2] + other.size[2])
    }
}