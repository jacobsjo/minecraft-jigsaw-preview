import { Heightmap } from "./Heightmap";
import { OffsetHeightmap } from "./OffsetHeightmap";

export class ImageHeightmap extends Heightmap {
    private offset: number;
    private centerX: number;
    private centerZ: number;
    constructor(
        private width: number,
        private depth: number,
        private data: number[]
    ) {
        super();
        this.centerX = Math.floor(width / 2) - 1;
        this.centerZ = Math.floor(depth / 2) - 1;
        this.offset = -64; // -data[this.centerZ * this.width + this.centerX]  //TODO maybe make this fixed?
    }

    public getHeight(x: number, z: number): number {
        x += this.centerX;
        z += this.centerZ;
        if (x < 0 || x >= this.width || z < 0 || z >= this.depth)
            throw new Error("Position out of bounds: " + x + ", " + z);

        return this.data[z * this.width + x] + this.offset;
    }

    public getOffsetHeightmap(offsetX: number, offsetZ: number) {
        return new OffsetHeightmap(this, offsetX, offsetZ);
    }

    public static async fromImage(path: string): Promise<ImageHeightmap>{
        const blob = await (await fetch(path)).blob()

        const canvas = document.createElement('canvas')
        canvas.width = 162
        canvas.height = 162
        const ctx = canvas.getContext('2d')!
        const img = await createImageBitmap(blob)
        ctx.drawImage(img, 0, 0)

        const image_data = ctx.getImageData(0,0,162,162).data
        const data = new Array(162 * 162)
        for (let i = 0 ; i < 162 * 162 ; i++){
            data[i] = Math.round((image_data[4*i] + image_data[4*i + 1] + image_data[4*i + 2])/3)
        }

        return new ImageHeightmap(162, 162, data)
    }    
}