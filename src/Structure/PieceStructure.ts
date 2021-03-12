import { NamedNbtTag, getTag, getListTag, getOptional } from "@webmc/nbt";
import { BlockState } from "@webmc/core";
import { StructureProvider, BlockPos, BlockNbt } from "@webmc/core";
import { read as readNbt } from '@webmc/nbt'
import * as path from 'path';

export class PieceStructure implements StructureProvider {
  private blocksMap: { pos: BlockPos, state: number, nbt?: BlockNbt }[] = []

  constructor(
    private size: BlockPos,
    private palette: BlockState[] = [],
    private blocks: { pos: BlockPos, state: number, nbt?: BlockNbt }[] = [],
    private entities: { pos: BlockPos, nbt: BlockNbt | undefined }[] = []
  ) {
    blocks.forEach(block => {
      this.blocksMap[block.pos[0] * size[1] * size[2] + block.pos[1] * size[2] + block.pos[2]] = block
    });
  }

  public getSize() {
    return this.size
  }

  public expandY(minY: number){
    this.size[1] = Math.max(this.size[1], minY)
  }

  public addBlock(pos: BlockPos, name: string, properties?: { [key: string]: string }, nbt?: BlockNbt) {
    const blockState = new BlockState(name, properties)
    let state = this.palette.findIndex(b => b.equals(blockState))
    if (state === -1) {
      state = this.palette.length
      this.palette.push(blockState)
    }
    this.blocks.push({ pos, state, nbt })
    this.blocksMap[pos[0] * this.size[1] * this.size[2] + pos[1] * this.size[2] + pos[2]] = { pos, state, nbt }
    return this
  }

  public getBlocks() {
    return this.blocks.map(b => ({
      pos: b.pos,
      state: this.palette[b.state],
      nbt: b.nbt
    }))
  }

  public getBlock(pos: BlockPos) {
    if (pos[0] < 0 || pos[1] < 0 || pos[2] < 0 || pos[0] >= this.size[0] || pos[1] >= this.size[1] || pos[2] >= this.size[2])
      return null


    const block = this.blocksMap[pos[0] * this.size[1] * this.size[2] + pos[1] * this.size[2] + pos[2]]
    //    const block = this.blocks.find(b => b.pos[0] === pos[0] && b.pos[1] === pos[1] && b.pos[2] === pos[2])
    if (!block) return null
    return {
      pos: block.pos,
      state: this.palette[block.state],
      nbt: block.nbt
    }
  }

  getAnnotations(): { pos: BlockPos, annotation: string; data: any; }[] {
    return this.entities.map(entity => {
      return { pos: [entity.pos[0], entity.pos[1] + 0.5, entity.pos[2]], annotation: "entity", data: entity.nbt }
    })
  }


  public static async fromName(reader: DatapackReader, id: string): Promise<PieceStructure>{
    try{
      const [namespace, name] = id.split(":")
      const p = path.join('data', namespace, 'structures', name + ".nbt")
      const blob = await reader.readFileAsBlob(p)
      const nbt = readNbt(new Uint8Array(blob))
      return PieceStructure.fromNbt(nbt.result)
    } catch (e) {
      if (e instanceof URIError)
        throw "Cound not load Structure " + id
      else if (e instanceof DOMException)
        throw "Permission error while loading Structure " + id + "\nTry reloading the datapack using the Open Datapack buttons"
    }
  }

  public static fromNbt(nbt: NamedNbtTag) {
    const size = getListTag(nbt.value, 'size', 'int', 3) as BlockPos
    const palette = getListTag(nbt.value, 'palette', 'compound')
      .map(tags => BlockState.fromNbt({ name: '', value: tags }))
    const blocks = getListTag(nbt.value, 'blocks', 'compound')
      .map(tags => {
        const pos = getListTag(tags, 'pos', 'int', 3) as BlockPos
        const state = getTag(tags, 'state', 'int')
        const nbt = getOptional(() => getTag(tags, 'nbt', 'compound'), undefined)
        return { pos, state, nbt }
      })
    const entities = getOptional(() => getListTag(nbt.value, 'entities', 'compound')
      .map(tags => {
        const pos = getListTag(tags, 'pos', 'double', 3) as BlockPos
        const nbt = getTag(tags, 'nbt', 'compound')!
        return { pos, nbt }
      }), undefined)
    return new PieceStructure(size, palette, blocks, entities)
  }
}
