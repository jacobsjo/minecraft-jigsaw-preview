
import { BlockPos } from 'deepslate';
import { Annotation, CompoundStructure, Rotation } from './Structure/CompoundStructure';
import { TemplatePool } from './worldgen/TemplatePool';
import { shuffleArray, getRandomInt, directionRelative } from './util'
import { BoundingBox } from './BoundingBox';
import { EmptyPoolElement } from './worldgen/PoolElement';
import { Heightmap } from './Heightmap';
import { StructureFeature } from './worldgen/StructureFeature';
import { Datapack } from 'mc-datapack-loader';
import { Identifier } from 'deepslate';


export class StructureFeatureManger {
    private world: CompoundStructure

    constructor(
        private datapack: Datapack,
        private startingPool: Identifier,
        private depth: number,
        private doExpansionHack: boolean,
        private startingY: number | "heightmap",
        private radius: number,
        private heightmap: Heightmap,
        private startJisawName: string | undefined
    ) {
        this.world = new CompoundStructure()
    }


    private getRotation(forward1: string, up1: string, forward2: string, up2: string, rollable: boolean): Rotation | undefined {
        if (forward1 === "up" || forward1 === "down") {
            if (forward2 !== "up" && forward2 !== "down") return undefined
            if (forward2 === forward1) return undefined
            if (rollable) return getRandomInt(4)

            for (let i = 0; i < 4; i++) {
                if (Rotation.getFacingMapping(i)[up2] === up1)
                    return i
            }
            throw "Error finding Rotation"
        } else {
            if (forward2 === "up" || forward2 === "down") return undefined
            for (let i = 0; i < 4; i++) {
                if (Rotation.getFacingMapping(i)[forward2] === forward1)
                    return (i + 2) % 4
            }
            throw "Error finding Rotation"
        }
    }

    public async generate(): Promise<void> {
        const pool = await TemplatePool.fromName(this.datapack, this.startingPool, false) // starting pool has no expansion hack (TODO: check this ingame)
        const poolElement = pool.getShuffeledElements().pop()
        const startingPiece = await poolElement.getStructure()

        const annotation: Annotation = {
            check: [],
            inside: undefined,

            pool: this.startingPool,
            fallback_from: undefined,
            element: await poolElement.getDescription(),
            element_type: poolElement.getType(),
            joint: undefined,
            joint_type: undefined,
            depth: 0
        }

        const startingPieceY = this.startingY === "heightmap" ? this.heightmap.getHeight(0, 0) - 1 : this.startingY
        this.world.setStartingY(startingPieceY)
        this.world.setMaxRadius(this.radius)

        const startRotation = getRandomInt(4)

        var start_pos: BlockPos = [0, startingPieceY, 0]
        if (this.startJisawName !== undefined){
            const placingJigsawBlocks = await poolElement.getShuffledJigsawBlocks()
            for (const placingBlock of placingJigsawBlocks) {
                const name: string = placingBlock.nbt.getString("name")
                if (name === this.startJisawName){
                    const rotatedAnchorJigsawPos: BlockPos = CompoundStructure.mapPos(startRotation, placingBlock.pos, [0, 0, 0], startingPiece.getSize());
                    start_pos = [
                        start_pos[0] - rotatedAnchorJigsawPos[0],
                        start_pos[1] - rotatedAnchorJigsawPos[1],
                        start_pos[2] - rotatedAnchorJigsawPos[2],
                    ]
                }
            }
        }

        const startingPieceNr = this.world.addStructure(startingPiece, start_pos, startRotation, annotation)
        const placing: { "piece": number, "check": number[], "inside": number | undefined, "rigid": boolean, "depth": number }[]
            = [{ "piece": startingPieceNr, "check": [startingPieceNr], "inside": undefined, "rigid": poolElement.getProjection() === "rigid", "depth": this.depth }]

        while (placing.length > 0) {
            const parent = placing.shift()

            const bb = this.world.getBB(parent.piece)
            //getElementBlocks returns blocks rotated and moved correctly

            const checkInsideList: number[] = []
            const jigsawBlocks = shuffleArray(this.world.getElementBlocks(parent.piece).filter(block => { return block.state.getName().namespace === "minecraft" && block.state.getName().path === "jigsaw"; }))
            for (const block of jigsawBlocks) {
                const orientation: string = block.state.getProperties()['orientation'] ?? 'north_up';
                const [forward, up] = orientation.split("_");
                const parentJigsasPos: BlockPos = block.pos;
                const parentJigsawFacingPos: BlockPos = directionRelative(parentJigsasPos, forward);

                const isInside: boolean = bb.isInside(parentJigsawFacingPos);

                let check: number[], inside: number;
                if (isInside) {
                    check = checkInsideList;
                    inside = parent.piece;
                } else {
                    check = parent.check;
                    inside = parent.inside;
                }

                const rollable: boolean = block.nbt.getString("joint") === "rollable";
                const target: string = block.nbt.getString("target")

                try {
                    var using_fallback = false

                    const pool: TemplatePool = await TemplatePool.fromName(this.datapack, Identifier.parse(block.nbt.getString("pool")), this.doExpansionHack);
                    const fallbackPool: TemplatePool = await TemplatePool.fromName(this.datapack, pool.fallback, this.doExpansionHack);

                    const poolElements = (parent.depth > 0 ? pool.getShuffeledElements() : [])
                        .concat([undefined])
                        .concat(fallbackPool.getShuffeledElements())
                        .concat([new EmptyPoolElement()])


                    try_all_pool_element:
                    for (const placingElement of poolElements) {
                        if (placingElement === undefined) {
                            using_fallback = true;
                            continue
                        }

                        const annotation: Annotation = {
                            "check": Object.assign([], check),
                            "inside": inside,

                            "pool": using_fallback ? pool.fallback : Identifier.parse(block.nbt.getString("pool")),
                            "fallback_from": using_fallback ? Identifier.parse(block.nbt.getString("pool")) : undefined,
                            "element": placingElement.getDescription(),
                            "element_type": placingElement.getType(),
                            "joint": target,
                            "joint_type": (forward == "up" || forward == "down") ? (rollable ? "rollable" : "alligned") : undefined,
                            "depth": this.depth - parent.depth + 1
                        }
                        const placingRigid = placingElement.getProjection() === "rigid"
                        const placingStructure = await placingElement.getStructure();
                        if (placingElement instanceof EmptyPoolElement) {
                            this.world.addStructure(placingStructure, parentJigsawFacingPos, Rotation.Rotate0, annotation);
                            break;
                        }

                        const placingJigsawBlocks = await placingElement.getShuffledJigsawBlocks()

                        nextPlacingJigsawBlocks:
                        for (const placingBlock of placingJigsawBlocks) {

                            const placingOrientation: string = placingBlock.state.getProperties()['orientation'] ?? 'north_up';
                            const [placingForward, placingUp] = placingOrientation.split("_");

                            const name: string = placingBlock.nbt.getString("name")
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

                            if (!parent.rigid || !placingRigid) {
                                offset[1] = this.heightmap.getHeight(parentJigsasPos[0], parentJigsasPos[2]) - rotatedPlacingJigsawPos[1]
                            }

                            const newSize: BlockPos = [size[0], size[1], size[2]]
                            if (rotation === Rotation.Rotate90 || rotation === Rotation.Rotate270) {
                                newSize[0] = size[2];
                                newSize[2] = size[0];
                            }

                            const placingBB = new BoundingBox(offset, newSize);

                            if (!placingBB.containedIn(this.world.getBB(inside), false))
                                continue

                            for (let l = 0; l < check.length; l++) {
                                if (placingBB.intersects(this.world.getBB(check[l])))
                                    continue nextPlacingJigsawBlocks
                            }


                            const placingNr = this.world.addStructure(placingStructure, offset, rotation, annotation);
                            check.push(placingNr);
                            placing.push({ "piece": placingNr, "check": check, "inside": inside, "rigid": placingRigid, "depth": parent.depth - 1 });
                            break try_all_pool_element // successfully placed structure, don't try more
                        }
                    }
                } catch (e) {

                    const parent_annotation = this.world.getAnnotation(parent.piece)

                    const error_message = "Error while generating structure: " + e ;

                    const annotation: Annotation = {
                        "check": Object.assign([], check),
                        "inside": inside,

                        "pool": using_fallback ? pool.fallback : Identifier.parse(block.nbt.getString("pool")),
                        "fallback_from": using_fallback ? Identifier.parse(block.nbt.getString("pool")) : undefined,
                        "element": error_message,
                        "element_type": "error" ,
                        "joint": target,
                        "joint_type": (forward == "up" || forward == "down") ? (rollable ? "rollable" : "alligned") : undefined,
                        "depth": this.depth - parent.depth + 1
                    }

                    console.warn(error_message)
                    this.world.addStructure(await new EmptyPoolElement().getStructure(), parentJigsawFacingPos, Rotation.Rotate0, annotation);

                }
            }

        }
    }

    public getWorld(): CompoundStructure {
        return this.world
    }

    public static fromStructureFeature(datapack: Datapack, feature: StructureFeature, heightmap: Heightmap) {
        return new StructureFeatureManger(datapack, feature.getStartPool(), feature.getDepth(), feature.doExpansionHack(), feature.getStaringY(), feature.getRadius(), heightmap, feature.getStartJigsawName())
    }
}