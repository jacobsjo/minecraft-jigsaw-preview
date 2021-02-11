import jszip from 'jszip'
import { BlockAtlas, BlockDefinition, BlockModel, BlockModelProvider } from '@webmc/render'

export class ResourceManager implements BlockModelProvider {
  private blockDefinitions: { [id: string]: BlockDefinition }
  private blockModels: { [id: string]: BlockModel }
  private blockAtlas: BlockAtlas

  constructor() {
    this.blockDefinitions = {}
    this.blockModels = {}
    this.blockAtlas = BlockAtlas.empty()
  }

  public getBlockDefinition(id: string): BlockDefinition {
    return this.blockDefinitions[id]
  }

  public getBlockModel(id: string): BlockModel {
    return this.blockModels[id]
  }

  public getTextureUV(id: string): [number, number] {
    return this.blockAtlas.getUV(id)
  }

  public getBlockAtlas(): BlockAtlas {
    return this.blockAtlas
  }

  public async loadFromMinecraftJar(): Promise<void> {
    const manifest = await (await fetch('https://launchermeta.mojang.com/mc/game/version_manifest.json')).json()
    const latestReleaseUrl = manifest.versions.find((v: any) => v.id === manifest.latest.release).url
    const version = await (await fetch(latestReleaseUrl)).json()
    const clientJarUrl = version.downloads.client.url
    const client = await (await fetch(clientJarUrl)).arrayBuffer()
    const assets = await jszip.loadAsync(client)
  
    await this.loadFromFolderJson(assets.folder('assets/minecraft/blockstates'), async (id, data) => {
      id = 'minecraft:' + id
      this.blockDefinitions[id] = BlockDefinition.fromJson(id, data)
    })
    await this.loadFromFolderJson(assets.folder('assets/minecraft/models/block'), async (id, data) => {
      id = 'minecraft:block/' + id
      this.blockModels[id] = BlockModel.fromJson(id, data)
    })
    const textures: { [id: string]: Blob } = {}
    await this.loadFromFolderPng(assets.folder('assets/minecraft/textures/block'), async (id, data) => {
      textures['minecraft:block/' + id] = data
    })
    this.blockAtlas = await BlockAtlas.fromBlobs(textures)
    Object.values(this.blockModels).forEach(m => m.flatten(this))

  }

  public async loadFromZip(url: string): Promise<void> {
    const assetsBuffer = await (await fetch(url)).arrayBuffer()
    const assets = await jszip.loadAsync(assetsBuffer)
    await this.loadFromFolderJson(assets.folder('minecraft/blockstates'), async (id, data) => {
      id = 'minecraft:' + id
      this.blockDefinitions[id] = BlockDefinition.fromJson(id, data)
    })
    await this.loadFromFolderJson(assets.folder('minecraft/models/block'), async (id, data) => {
      id = 'minecraft:block/' + id
      this.blockModels[id] = BlockModel.fromJson(id, data)
    })
    const textures: { [id: string]: Blob } = {}
    await this.loadFromFolderPng(assets.folder('minecraft/textures/block'), async (id, data) => {
      textures['minecraft:block/' + id] = data
    })
    this.blockAtlas = await BlockAtlas.fromBlobs(textures)
    Object.values(this.blockModels).forEach(m => m.flatten(this))
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
