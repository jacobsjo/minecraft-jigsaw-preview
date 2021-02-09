
import { BlockPos } from '@webmc/core';
import * as path from 'path';
import { CompoundStructure, Rotation } from './CompoundStructure';
import { ConfiguedStructureFeature } from './worldgen/ConfiguredStructureFeature';
import { TemplatePool } from './worldgen/TemplatePool';
import { shuffleArray, getRandomInt } from './util'
import { BoundingBox } from './BoundingBox';


export class StructureFeatureManger{
    private world: CompoundStructure

    constructor(
        private datapackRoot: string,
        private startingPool: string,
        private depth: number,
        private doExpansionHack: boolean
    ){
        this.world = new CompoundStructure()
    }


    private directionRelative(pos: BlockPos, dir: string): BlockPos {
        const newPos : BlockPos = [pos[0], pos[1], pos[2]]
        switch (dir) {
            case "north":
                newPos[2] --
                break;
            case "west":
                newPos[0] --
                break;
            case "south":
                newPos[2] ++
                break;
            case "east":
                newPos[0] ++
                break;
            case "up":
                newPos[1] ++
                break;
            case "down":
                newPos[1] --
        }
        return newPos
    }

    private getRotation(forward1: string, up1: string, forward2: string, up2: string, rollable: boolean): Rotation | undefined{
        if (forward1 === "up"){
            if (forward2 !== "down") return undefined
            if (rollable) return getRandomInt(4)
            if (up1 === up2) return Rotation.Rotate0
            return undefined
        } else if (forward1 === "down"){
            if (forward2 !== "up") return undefined
            if (rollable) return getRandomInt(4)
            if (up1 === up2) return Rotation.Rotate0
            return undefined
        } else {
            if (forward2 === "up" || forward2 === "down") return undefined
            for (let i = 0 ; i<4 ; i++){
                if (Rotation.getFacingMapping(i)[forward2] === forward1)
                    return (i + 2) % 4
            }
            throw "Error finding Rotation"
        }
    }

    public async generate(): Promise<void>{
        const pool = await TemplatePool.fromName(this.datapackRoot, this.startingPool)
        const poolElement = pool.getShuffeledElements().pop()
        const startingPiece = await CompoundStructure.StructureFromId(this.datapackRoot, poolElement.location)

        const startingPieceNr = this.world.addStructure(startingPiece, [0,0,0], Rotation.Rotate0, {check: [], inside: undefined})
        const placing : {"piece": number, "check": number[], "inside": number|undefined, "depth": number}[] = [{"piece": startingPieceNr, "check": [startingPieceNr], "inside": undefined, "depth": this.depth}]
        
        while (placing.length > 0){
            const piece = placing.shift()

            const bb = this.world.getBB(piece.piece)
            //getElementBlocks returns blocks rotated and moved correctly

            const checkInsideList: number[] = []

            const jigsawBlocks = shuffleArray(this.world.getElementBlocks(piece.piece).filter(block => { return block.state.getName() === "minecraft:jigsaw"; }))
            for (let i = 0 ; i < jigsawBlocks.length ; i++){
                const block = jigsawBlocks[i]
                if (typeof block.nbt.pool.value !== "string")
                    throw "pool element nbt of wrong type";

                const orientation: string = block.state.getProperties()['orientation'];
                const [forward, up] = orientation.split("_");
                const parentJigsasPos: BlockPos = block.pos;
                const parentJigsawFacingPos: BlockPos = this.directionRelative(parentJigsasPos, forward);

                const isInside: boolean = bb.isInside(parentJigsawFacingPos);

                let check: number[], inside: number;
                if (isInside) {
                    check = checkInsideList;
                    inside = piece.piece;
                } else {
                    check = piece.check;
                    inside = piece.inside;
                }

                const rollable: boolean = (typeof block.nbt.rollable === "boolean") ? block.nbt.rollable : true;
                const target: string = (typeof block.nbt.target.value === "string") ? block.nbt.target.value : "minecraft:empty"

                const pool: TemplatePool = await TemplatePool.fromName(this.datapackRoot, block.nbt.pool.value);
                const fallbackPool: TemplatePool = await TemplatePool.fromName(this.datapackRoot, pool.fallback);

                const poolElements = (piece.depth > 0 ? pool.getShuffeledElements() : [])
                    .concat(fallbackPool.getShuffeledElements());

                try_all_pool_element:
                for (let j = 0 ; j < poolElements.length ; j++){
                    const placingElement = poolElements[j]

                    if (placingElement.element_type === "minecraft:empty_pool_element")
                        break

                    if (placingElement.element_type !== "minecraft:legacy_single_pool_element" && placingElement.element_type !== "minecraft:single_pool_element"){
                        console.warn("encountered unsupported pool element type " + placingElement.element_type + " (treating as minecraft:empty_pool_element)")
                        break
                    }

                    if (placingElement.location === "minecraft:empty")
                        break

                    const placingStructure = await CompoundStructure.StructureFromId(this.datapackRoot, placingElement.location);
                    const placingJigsawBlocks = shuffleArray(placingStructure.getBlocks().filter(block => { return block.state.getName() === "minecraft:jigsaw"; }))
                    nextPlacingJigsawBlocks:
                    for (let k = 0 ; k < placingJigsawBlocks.length ; k++){
                        const placingBlock = placingJigsawBlocks[k]
                        const placingOrientation: string = placingBlock.state.getProperties()['orientation'];
                        const [placingForward, placingUp] = placingOrientation.split("_");

                        const name: string = (typeof placingBlock.nbt.name.value === "string") ? placingBlock.nbt.name.value : "minecraft:empty"

                        if (target !== name)
                            continue

                        const rotation = this.getRotation(forward, up, placingForward, placingUp, rollable);
                        if (rotation === undefined)
                            continue

                        const size = placingStructure.getSize();
                        const placingJigsasPos: BlockPos = placingBlock.pos;
                        const rotatedPlacingJigsawPos: BlockPos = CompoundStructure.mapPos(rotation, placingJigsasPos, [0, 0, 0], size);

                        const offset: BlockPos = [parentJigsawFacingPos[0] - rotatedPlacingJigsawPos[0],
                        parentJigsawFacingPos[1] - rotatedPlacingJigsawPos[1],
                        parentJigsawFacingPos[2] - rotatedPlacingJigsawPos[2]];

                        const newSize: BlockPos = [size[0], size[1], size[2]]
                        if (rotation === Rotation.Rotate90 || rotation === Rotation.Rotate270) {
                            newSize[0] = size[2];
                            newSize[2] = size[0];
                        }

                        const placingBB = new BoundingBox(offset, newSize);

                        if (inside !== undefined && !placingBB.containedIn(this.world.getBB(inside), this.doExpansionHack))
                            continue

                        for (let l=0 ; l < check.length ; l++){
                            if (placingBB.intersects(this.world.getBB(check[l])))
                                continue nextPlacingJigsawBlocks
                        }

                        const placingNr = this.world.addStructure(placingStructure, offset, rotation, {"check": Object.assign([], check), "inside": inside});
                        check.push(placingNr);
                        placing.push({ "piece": placingNr, "check": check, "inside": inside, "depth": piece.depth - 1 });
                        break try_all_pool_element // successfully placed structure, don't try more
                    }
                }
            }
        }
    }

    public getWorld(): CompoundStructure{
        return this.world
    }

    public static async loadFromFile(file: string): Promise<StructureFeatureManger>{
        if (file.slice(-5) !== ".json")
            throw "Not a JSON file"

        const splitFile = file.split(path.sep)
        const names = [splitFile.pop().slice(0, -5)]

        for(;;){
            const namepart = splitFile.pop()
            if (namepart === "configured_structure_feature")
                break
            
            names.push(namepart)

            if (splitFile.length > 0)
                throw "Invalid Datapack format (not part of configured_structure_feature)"
        }

        const name = path.join(...names.reverse())

        if (splitFile.pop() !== "worldgen")
            throw "Invalid Datapack format (not part of worldgen)"

        const namespace = splitFile.pop()

        if (splitFile.pop() !== "data")
            throw "Invalid Datapack format (not part of data)"

        const datapackRoot = path.join("/", ...splitFile)

        const csf = await ConfiguedStructureFeature.fromName(datapackRoot, namespace + ":" + name)

        return new StructureFeatureManger(datapackRoot, csf.getStartPool(), csf.getDepth(), csf.doExpansionHack())
//        return new StructureFeatureManger(datapackRoot, csf.getStartPool(), 2)
    }


}