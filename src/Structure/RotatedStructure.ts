import { BlockPos, BlockState, Identifier, NbtCompound, StructureProvider } from "deepslate";
import { Rotation } from "../Util/Rotation";
import { AnnotationProvider, StructureAnnotation } from "./AnnotationProvider";



export class RotatedStructure implements StructureProvider, AnnotationProvider {
    constructor(
        private readonly baseStructure: StructureProvider & AnnotationProvider,
        private readonly rotation: Rotation
    ) { }

    getSize(): BlockPos {
        const size = this.baseStructure.getSize()
        const newSize: BlockPos = [size[0], size[1], size[2]]
        if (this.rotation === Rotation.Rotate90 || this.rotation === Rotation.Rotate270) {
            newSize[0] = size[2]
            newSize[2] = size[0]
        }
        return newSize
    }

    getBlocks(): { pos: BlockPos; state: BlockState; nbt?: NbtCompound; }[] {
        const size = this.baseStructure.getSize()
        const blocks = this.baseStructure.getBlocks()
        return blocks.map(block => {
            return {
                "pos": this.mapPos(block.pos),
                "state": RotatedStructure.getRotatedBlockState(block.state, this.rotation),
                "nbt": block.nbt
            }
        });
    }

    getBlock(pos: BlockPos): { pos: BlockPos; state: BlockState; nbt?: NbtCompound; } {
        const block = this.baseStructure.getBlock(this.invMapPos(pos))

        if (block === null)
            return null

        return {
            "pos": pos,
            "state": RotatedStructure.getRotatedBlockState(block.state, this.rotation),
            "nbt": block.nbt
        }
    }

    getAnnotations(): StructureAnnotation[] {
        return this.baseStructure.getAnnotations().map(a => {
            const mappedPos = this.mapPos([a.pos[0] - 0.5, a.pos[1], a.pos[2] - 0.5])
            return {
                pos: [mappedPos[0] + 0.5, mappedPos[1], mappedPos[2] + 0.5],
                annotation: a.annotation,
                data: a.data
            }
        })
    }

    private static rotatePos(pos: BlockPos, rotation: Rotation, size: BlockPos): BlockPos {
        switch (rotation) {
            case Rotation.Rotate0:
                return pos
            case Rotation.Rotate90:
                return [size[2] - 1 - pos[2], pos[1], pos[0]]
            case Rotation.Rotate180:
                return [size[0] - 1 - pos[0], pos[1], size[2] - 1 - pos[2]]
            case Rotation.Rotate270:
                return [pos[2], pos[1], size[0] - 1 - pos[0]]
        }
    }

    public mapPos(pos: BlockPos): BlockPos{
        return RotatedStructure.rotatePos(pos, this.rotation, this.baseStructure.getSize()) // use base size
    }

    public invMapPos(pos: BlockPos): BlockPos{
        return RotatedStructure.rotatePos(pos, Rotation.invert(this.rotation), this.getSize()) // use rotated size
    }

    private static getRotatedBlockState(state: BlockState, rot: Rotation): BlockState {
        const swapXZ: { [name: string]: string } = { 'x': 'z', 'y': 'y', 'z': 'x' }

        const name: Identifier = state.getName()
        const properties = Object.assign({}, state.getProperties())

        const facingMapping = Rotation.getFacingMapping(rot)

        //General Rotation of Blocks on an axis (logs etc.)
        if ('axis' in properties && (rot === Rotation.Rotate90 || rot === Rotation.Rotate270)) {
            properties['axis'] = swapXZ[properties['axis']]
        }

        //General Facing of Most Blocks
        if ('facing' in properties) {
            properties['facing'] = facingMapping[properties['facing']]
        }

        //Jigsaw orientations
        if ('orientation' in properties) {
            const facings = properties['orientation'].split("_");
            properties['orientation'] = facingMapping[facings[0]] + "_" + facingMapping[facings[1]]
        }

        //Rotation of Signs and Banners
        if ('rotation' in properties) {
            properties['rotation'] = properties['rotation'] + 4
        }

        //Rail shapes
        if (name.path.endsWith('rail') && 'shape' in properties) {
            const facings = properties['shape'].split("_");
            let shape = facingMapping[facings[0]] + "_" + facingMapping[facings[1]]

            //fix wrong order
            switch (shape) {
                case "west_east":
                    shape = "east_west"
                    break;
                case "east_north":
                    shape = "north_east"
                    break;
                case "south_north":
                    shape = "north_south"
                    break;
                case "west_north":
                    shape = "north_west"
                    break;
                case "east_south":
                    shape = "south_east"
                    break;
                case "west_south":
                    shape = "south_west"
                    break;
            }
            properties['shape'] = shape
        }

        //Connections of Fences, Glass-Pains, Redstone etc.
        if ('east' in properties) {
            const east = properties['east']
            const west = properties['west']
            const north = properties['north']
            const south = properties['south']

            properties[facingMapping['east']] = east
            properties[facingMapping['west']] = west
            properties[facingMapping['north']] = north
            properties[facingMapping['south']] = south
        }

        return new BlockState(state.getName(), properties)
    }

}