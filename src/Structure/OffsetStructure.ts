import { BlockPos, BlockState, Identifier, NbtCompound, StructureProvider } from "deepslate";
import { Rotation } from "../Util/Rotation";
import { AnnotationProvider, StructureAnnotation } from "./AnnotationProvider";



export class OffsetStructure implements StructureProvider, AnnotationProvider {
    constructor(
        private readonly baseStructure: StructureProvider & AnnotationProvider,
        private readonly offset: BlockPos
    ) { }

    getOffset(): BlockPos{
        return this.offset
    }

    getSize(): BlockPos {
        return this.baseStructure.getSize()
    }

    getBlocks(): { pos: BlockPos; state: BlockState; nbt?: NbtCompound; }[] {
        const blocks = this.baseStructure.getBlocks()
        return blocks.map(block => {
            return {
                "pos": [block.pos[0] + this.offset[0], block.pos[1] + this.offset[1], block.pos[2] + this.offset[2]],
                "state": block.state,
                "nbt": block.nbt
            }
        });
    }

    getBlock(pos: BlockPos): { pos: BlockPos; state: BlockState; nbt?: NbtCompound; } {
        return this.baseStructure.getBlock([pos[0] - this.offset[0], pos[1] - this.offset[1], pos[2] - this.offset[2]])
    }

    getAnnotations(): StructureAnnotation[] {
        return this.baseStructure.getAnnotations().map(a => {
            return {
                pos: [a.pos[0] + this.offset[0], a.pos[1] + this.offset[1], a.pos[2] + this.offset[2]],
                annotation: a.annotation,
                data: a.data
            }
        })
    }
}