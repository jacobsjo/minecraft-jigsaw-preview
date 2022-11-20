import { BlockPos, BlockState, NbtCompound, NbtType, Structure } from "deepslate";
import { AnnotationProvider, StructureAnnotation } from "./AnnotationProvider";



export class EntityAnnotatedStructure extends Structure implements AnnotationProvider{

	constructor(
		size: BlockPos,
		palette: BlockState[] = [],
		blocks: { pos: BlockPos, state: number, nbt?: NbtCompound }[] = [],
        private readonly entities: { pos: BlockPos, blockPos: BlockPos, nbt: NbtCompound}[] = []
	) {
        super(size, palette, blocks)
    }

    getAnnotations(): StructureAnnotation[] {
        return this.entities.map(entity => {
            return {
                pos: entity.pos,
                annotation: "entity",
                data: entity.nbt
            }
        })
    }


	public static fromNbt(nbt: NbtCompound) {
		const size = BlockPos.fromNbt(nbt.getList('size'))
		const palette = nbt.getList('palette', NbtType.Compound).map(tag => BlockState.fromNbt(tag))
		const blocks = nbt.getList('blocks', NbtType.Compound).map(tag => {
			const pos = BlockPos.fromNbt(tag.getList('pos'))
			const state = tag.getNumber('state')
			const nbt = tag.getCompound('nbt')
			return { pos, state, nbt: nbt.size > 0 ? nbt : undefined }
		})
        const entities = nbt.getList('entities', NbtType.Compound).map(tag => {
            const pos = tag.getList('pos').getAsTuple(3, e => e?.isDouble() ? e.getAsNumber() : 0)
            const blockPos = BlockPos.fromNbt(tag.getList('blockPos'))
            const nbt = tag.getCompound('nbt')
            return { pos, blockPos, nbt }
        })
		return new EntityAnnotatedStructure(size, palette, blocks, entities)
	}
}