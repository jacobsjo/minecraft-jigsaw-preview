import { BlockDefinition, BlockModel, Identifier, Resources, TextureAtlas, upperPowerOfTwo, UV } from "deepslate";
import { getJigsawModel } from "../Util/util";
import { isOpaque, isSelfCulling, isTransparent } from "../Util/OpaqueHelper";

const MCMETA = 'https://raw.githubusercontent.com/misode/mcmeta/'
const JIGSAW_MODEL_ID = Identifier.create("block/jigsaw")

export class McmetaResourceManager implements Resources {

    private constructor(
        private blockDefinitions: { [key: string]: BlockDefinition },
        private blockModels: { [key: string]: BlockModel },
        private textureAtlas: TextureAtlas
    ) { }

    getBlockDefinition(id: Identifier): BlockDefinition {
        return this.blockDefinitions[id.toString()] 
    }
    getBlockModel(id: Identifier): BlockModel {
        if (id.equals(JIGSAW_MODEL_ID)){
            return getJigsawModel()
        }

        return this.blockModels[id.toString()];
    }
    getTextureAtlas(): ImageData {
        return this.textureAtlas.getTextureAtlas()
    }
    getTextureUV(texture: Identifier): UV {
        return this.textureAtlas.getTextureUV(texture)
    }

    getBlockFlags(id: Identifier): { opaque?: boolean, transparent?: boolean, self_culling?: boolean } {
        return {
            opaque: isOpaque(id),
            transparent: isTransparent(id),
            self_culling: isSelfCulling(id)
        }
    }

    getBlockProperties(id: Identifier): Record<string, string[]> {
        return null;
    }
    getDefaultBlockProperties(id: Identifier): Record<string, string> {
        return null;
    }

    public static async create(version?: string) {
        const base_url = version ? `${MCMETA}${version}-` : MCMETA

        const [blockstates, models, uvMap, atlas] = await Promise.all([
            fetch(`${base_url}summary/assets/block_definition/data.min.json`).then(r => r.json()),
            fetch(`${base_url}summary/assets/model/data.min.json`).then(r => r.json()),
            fetch(`${base_url}atlas/all/data.min.json`).then(r => r.json()),
            new Promise<HTMLImageElement>(res => {
                const image = new Image()
                image.onload = () => res(image)
                image.crossOrigin = 'Anonymous'
                image.src = `${base_url}atlas/all/atlas.png`
            }),
        ])
        const blockDefinitions: { [key: string]: BlockDefinition } = {}
        Object.keys(blockstates).forEach(id => {
            blockDefinitions['minecraft:' + id] = BlockDefinition.fromJson(id, blockstates[id])
        })

        const blockModels: { [key: string]: BlockModel } = {}
        Object.keys(models).forEach(id => {
            blockModels['minecraft:' + id] = BlockModel.fromJson(id, models[id])
        })

        Object.values(blockModels).forEach((m) => m.flatten({ getBlockModel: (id) => blockModels[id.toString()] }))


        const atlasCanvas = document.createElement('canvas')
        const atlasSize = upperPowerOfTwo(Math.max(atlas.width, atlas.height))
        atlasCanvas.width = atlasSize
        atlasCanvas.height = atlasSize
        const atlasCtx = atlasCanvas.getContext('2d')!
        atlasCtx.drawImage(atlas, 0, 0)
        const atlasData = atlasCtx.getImageData(0, 0, atlasSize, atlasSize)

        const part = 16 / atlasData.width
        const idMap: { [key: string]: [number, number, number, number] } = {}
        Object.keys(uvMap).forEach(id => {
            const u = uvMap[id][0] / atlasSize
            const v = uvMap[id][1] / atlasSize
            idMap['minecraft:' + id] = [u, v, u + part, v + part]
        })
        const textureAtlas = new TextureAtlas(atlasData, idMap)

        return new McmetaResourceManager(blockDefinitions, blockModels, textureAtlas)
    }


}