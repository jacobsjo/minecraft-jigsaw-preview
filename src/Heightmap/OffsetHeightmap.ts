import { Heightmap } from "./Heightmap";


export class OffsetHeightmap extends Heightmap {
    constructor(
        private base: Heightmap,
        private offsetX: number,
        private offsetZ: number
    ) {
        super();
    }

    getHeight(x: number, z: number): number {
        return this.base.getHeight(x - this.offsetX, z - this.offsetZ);
    }
}
