import { BlockDefinition, BlockModel, Identifier, Resources, TextureAtlas, upperPowerOfTwo, UV } from "deepslate";
import { getJigsawModel, getUnkownModel } from "../Util/util";
import { opaqueSet, selfCullingSet, transparentSet } from "../Util/OpaqueHelper";

const MCMETA = 'https://raw.githubusercontent.com/misode/mcmeta/'
const JIGSAW_MODEL_ID = Identifier.create("block/jigsaw")
const UNKNOWN_MODEL_ID = new Identifier("jacobsjo","unkown")
const UNKNOWN_BLOCK_DEFINITION = new BlockDefinition(Identifier.parse("jacobsjo:unkown"), {"": {"model": UNKNOWN_MODEL_ID.toString()}}, [])

type BlockFlags = {
	opaque?: boolean,
	semi_transparent?: boolean,
	self_culling?: boolean,
}

export class McmetaResourceManager implements Resources {


    private constructor(
        private blockDefinitions: { [key: string]: BlockDefinition },
        private blockModels: { [key: string]: BlockModel },
        private textureAtlas: TextureAtlas,
        private blockFlags: { [key: string]: BlockFlags}
    ) { 

    }

    getBlockDefinition(id: Identifier): BlockDefinition {
        return this.blockDefinitions[id.toString()] ?? UNKNOWN_BLOCK_DEFINITION; 
    }
    getBlockModel(id: Identifier): BlockModel {
        return this.blockModels[id.toString()];
    }
    getTextureAtlas(): ImageData {
        return this.textureAtlas.getTextureAtlas()
    }
    getTextureUV(texture: Identifier): UV {
        return this.textureAtlas.getTextureUV(texture)
    }

    getBlockFlags(id: Identifier): BlockFlags {
        if (id.toString() in this.blockDefinitions) {
            return this.blockFlags[id.toString()]
        } else {
            return {opaque: true}
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

        const idMap: { [key: string]: [number, number, number, number] } = {}
        Object.keys(uvMap).forEach(id => {
            var [u, v, du, dv] = uvMap[id]
            if (du !== dv && id.startsWith('block/'))
                dv = du
            idMap[Identifier.create(id).toString()] = [u / atlasSize, v / atlasSize, (u + du) / atlasSize, (v + dv) / atlasSize]
        })
        const textureAtlas = new TextureAtlas(atlasData, idMap)

        const blockFlags: { [key: string]: BlockFlags} = {}

        opaqueSet.forEach(o => blockFlags[o] = {opaque: true, self_culling: true})
        transparentSet.forEach(t => {
            const f = blockFlags[t] ?? {self_culling: true}
            f.semi_transparent = true
            blockFlags[t] = f
        })

        selfCullingSet.forEach(c => {
            const f = blockFlags[c] ?? {}
            f.self_culling = true
            blockFlags[c] = f
        })

        blockModels[JIGSAW_MODEL_ID.toString()] = getJigsawModel()
        blockModels[UNKNOWN_MODEL_ID.toString()] = getUnkownModel()

        return new McmetaResourceManager(blockDefinitions, blockModels, textureAtlas, blockFlags)
    }


}