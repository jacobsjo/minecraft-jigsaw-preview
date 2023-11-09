export async function getAnnotationAtlas(){
    const atlas = await new Promise<HTMLImageElement>(res => {
        const image = new Image()
        image.onload = () => res(image)
        image.crossOrigin = 'Anonymous'
        image.src = `annotation_icons/atlas.png`
    })


    const atlasCanvas = document.createElement('canvas')
    atlasCanvas.width = 32
    atlasCanvas.height = 32
    const atlasCtx = atlasCanvas.getContext('2d')!
    atlasCtx.drawImage(atlas, 0, 0)
    const atlasData = atlasCtx.getImageData(0, 0, 32, 32)
    return atlasData
}

export const ANNOTATION_UVs: {[key: string]: [number, number, number, number]} = {
    "empty": [0, 0, 0.5, 0.5],
    "entity": [0.5, 0, 1, 0.5],
    "feature": [0, 0.5, 0.5, 1]
}