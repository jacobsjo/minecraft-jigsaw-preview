import { ImageHeightmap } from "./ImageHeightmap"

export abstract class Heightmap{
    protected constructor() {}

    public abstract getHeight(x : number, z : number) : number

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

