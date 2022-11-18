import jszip from 'jszip'
import { BlockDefinition, BlockDefinitionProvider, BlockModel, BlockModelProvider, BlockPropertiesProvider, Identifier, Resources, TextureAtlas } from 'deepslate'
import { isOpaque } from './OpaqueHelper'

export class ResourceManager implements Resources {
  private blockDefinitions: { [id: string]: BlockDefinition }
  private blockModels: { [id: string]: BlockModel } 
  private blockAtlas: TextureAtlas

  constructor() {
    this.blockDefinitions = {}
    this.blockModels = {}
    this.blockAtlas = TextureAtlas.empty()
  }

  getTextureAtlas(): ImageData {
    return this.blockAtlas.getTextureAtlas()
  }

  getBlockProperties(id: Identifier): Record<string, string[]> {
    return null
  }

  getDefaultBlockProperties(id: Identifier): Record<string, string> {
    return null;
  }

  public getBlockDefinition(id: Identifier): BlockDefinition {
    return this.blockDefinitions[id.toString()]
  }

  public getBlockModel(id: Identifier): BlockModel {
    return this.blockModels[id.toString()]
  }

  public getTextureUV(id: Identifier) {
    return this.blockAtlas.getTextureUV(id)
  }

  public getBlockAtlas() {
    return this.blockAtlas
  }

  public getBlockFlags(id: Identifier) {
    return {
      opaque: isOpaque(id)
    }
  }

  public async loadFromZip(url: string) {
    const assetsBuffer = await (await fetch(url)).arrayBuffer()
    const assets = await jszip.loadAsync(assetsBuffer)
    await this.loadFromFolderJson(assets.folder('minecraft/blockstates')!, async (id, data) => {
      id = 'minecraft:' + id
      this.blockDefinitions[id] = BlockDefinition.fromJson(id, data)
    })
    await this.loadFromFolderJson(assets.folder('minecraft/models/block')!, async (id, data) => {
      id = 'minecraft:block/' + id
      this.blockModels[id] = BlockModel.fromJson(id, data)
    })
    const textures: { [id: string]: Blob } = {}
    await this.loadFromFolderPng(assets.folder('minecraft/textures/block')!, async (id, data) => {
      textures['minecraft:block/' + id] = data
    })

    /*
    await this.loadFromFolderPng(assets.folder('minecraft/textures/entity/chest')!, async (id, data) => {
      Object.assign(textures, ChestResourceManagerHelper.convertTextures(id, data))      
    })

    Object.assign(this.blockDefinitions, ChestResourceManagerHelper.getBlockDefinitions())
    Object.assign(this.blockModels, ChestResourceManagerHelper.getBlockModels())
    */

    /*
    textures['webmc:annotation/entity'] = await (await fetch("/annotation_icons/entity.png")).blob()
    textures['webmc:annotation/feature'] = await (await fetch("/annotation_icons/feature.png")).blob()
    textures['webmc:annotation/empty'] = await (await fetch("/annotation_icons/empty.png")).blob()
    */

    this.blockAtlas = await TextureAtlas.fromBlobs(textures)
    Object.values(this.blockModels).forEach(m => m.flatten(this))
  }

  private loadFromFolderJson(folder: jszip, callback: (id: string, data: any) => Promise<void>) {
    const promises: Promise<void>[] = []
    folder.forEach((path, file) => {
      if (file.dir || !path.endsWith('.json')) return
      const id = path.replace(/\.json$/, '')
      promises.push(file.async('text').then(data => callback(id, JSON.parse(data))))
    })
    return Promise.all(promises)
  }

  private loadFromFolderPng(folder: jszip, callback: (id: string, data: Blob) => Promise<void>) {
    const promises: Promise<void>[] = []
    folder.forEach((path, file) => {
      if (file.dir || !path.endsWith('.png')) return
      const id = path.replace(/\.png$/, '')
      promises.push(file.async('blob').then(data => callback(id, data)))
    })
    return Promise.all(promises)
  }
}
