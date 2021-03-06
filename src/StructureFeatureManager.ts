
import { BlockPos } from '@webmc/core';
import { Annotation, CompoundStructure, Rotation } from './Structure/CompoundStructure';
import { TemplatePool } from './worldgen/TemplatePool';
import { shuffleArray, getRandomInt } from './util'
import { BoundingBox } from './BoundingBox';
import { ConfiguedStructureFeature } from './worldgen/ConfiguredStructureFeature';
import { EmptyPoolElement } from './worldgen/PoolElement';


export class StructureFeatureManger{
    private world: CompoundStructure

    constructor(
        private reader: DatapackReader,
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
        const pool = await TemplatePool.fromName(this.reader, this.startingPool)
        const poolElement = pool.getShuffeledElements().pop()
        const startingPiece = await poolElement.getStructure()

        const annotation: Annotation = {
            check: [],
            inside: undefined,

            pool: this.startingPool,
            fallback_from: undefined,
            element: poolElement.toString(),
            element_type: poolElement.getType(),
            joint: undefined,
            joint_type: undefined,
            depth: 0
        }
        const startingPieceNr = this.world.addStructure(startingPiece, [0,0,0], Rotation.Rotate0, annotation)
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

                const orientation: string = block.state.getProperties()['orientation'] ?? 'north_up';
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

                const rollable: boolean = (block.nbt.joint !== undefined &&  typeof block.nbt.joint.value === "string") ? block.nbt.joint.value === "rollable" : true;
                const target: string = (typeof block.nbt.target.value === "string") ? block.nbt.target.value : "minecraft:empty"

                const pool: TemplatePool = await TemplatePool.fromName(this.reader, block.nbt.pool.value);
                const fallbackPool: TemplatePool = await TemplatePool.fromName(this.reader, pool.fallback);

                const poolElements = (piece.depth > 0 ? pool.getShuffeledElements() : [])
                    .concat([undefined])
                    .concat(fallbackPool.getShuffeledElements())
                    .concat([new EmptyPoolElement()])

                var using_fallback = false

                try_all_pool_element:
                for (const placingElement of poolElements){
                    if (placingElement === undefined){
                        using_fallback = true;
                        continue
                    }

                    const annotation: Annotation = {
                        "check": Object.assign([], check),
                        "inside": inside,

                        "pool": using_fallback ? pool.fallback : block.nbt.pool.value,
                        "fallback_from": using_fallback ? block.nbt.pool.value : undefined,
                        "element": placingElement.toString(),
                        "element_type": placingElement.getType(),
                        "joint": target,
                        "joint_type": (forward == "up" || forward == "down") ? (rollable ? "rollable" : "alligned") : undefined,
                        "depth": this.depth - piece.depth + 1
                    }

                    const placingStructure = await placingElement.getStructure();

                    if (placingElement instanceof EmptyPoolElement){
                        this.world.addStructure(placingStructure, parentJigsawFacingPos, Rotation.Rotate0, annotation);
                        break;
                    }

                    const placingJigsawBlocks = await placingElement.getShuffledJigsawBlocks()
                    nextPlacingJigsawBlocks:
                    for (let k = 0 ; k < placingJigsawBlocks.length ; k++){
                        const placingBlock = placingJigsawBlocks[k]
                        const placingOrientation: string = placingBlock.state.getProperties()['orientation'] ?? 'north_up';
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

                        const offset: BlockPos = [
                            parentJigsawFacingPos[0] - rotatedPlacingJigsawPos[0],
                            parentJigsawFacingPos[1] - rotatedPlacingJigsawPos[1],
                            parentJigsawFacingPos[2] - rotatedPlacingJigsawPos[2]
                        ];

                        const newSize: BlockPos = [size[0], size[1], size[2]]
                        if (rotation === Rotation.Rotate90 || rotation === Rotation.Rotate270) {
                            newSize[0] = size[2];
                            newSize[2] = size[0];
                        }

                        const placingBB = new BoundingBox(offset, newSize);

                        if (!placingBB.containedIn(this.world.getBB(inside), this.doExpansionHack))
                            continue

                        for (let l=0 ; l < check.length ; l++){
                            if (placingBB.intersects(this.world.getBB(check[l])))
                                continue nextPlacingJigsawBlocks
                        }


                        const placingNr = this.world.addStructure(placingStructure, offset, rotation, annotation);
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

    public static fromConfiguredStructureFeature(reader: DatapackReader, feature: ConfiguedStructureFeature){
        return new StructureFeatureManger(reader, feature.getStartPool(), feature.getDepth(), feature.doExpansionHack())
    }
}