//import { NamedNbtTag, NbtTag, getTag, getListTag, getOptional } from "@webmc/nbt";
import { NbtCompound, BlockPos, BlockState, StructureProvider, Structure, Identifier, PlacedBlock, NbtFile } from "deepslate";
//import fs from 'fs';
import { BoundingBox } from "./BoundingBox"
import { AnnotationProvider, StructureAnnotation } from "../Structure/AnnotationProvider";
import { EntityAnnotatedStructure } from "../Structure/EntityAnnotatedStructure";
import { vec3 } from "gl-matrix";




export type PieceInfo = {
    check: number[],
    inside?: number | undefined,

    pool?: Identifier | undefined,
    aliased_from?: Identifier | undefined
    fallback_from?: Identifier | undefined,
    element?: string | undefined,
    element_type?: string | undefined,
    joint?: string | undefined,
    joint_type?: "alligned" | "rollable" | undefined,
    depth: number,
    jigsaw_pos: BlockPos,
    selection_priority: number,
    placement_priority: number
}

type Piece = {
    structure: StructureProvider & AnnotationProvider,
    pos: BlockPos,
    pieceInfo: PieceInfo,
    failedPieces: { name: string, piece: (StructureProvider & AnnotationProvider) }[],
}

export type BoundingBoxInfo = {
    bb: BoundingBox,
    poolIndex: number,
    poolJointIndex: number
    isOutside?: boolean,
    isRelevant?: boolean,
    isCurrent?: boolean
}

export class JigsawStructure implements StructureProvider, AnnotationProvider {

    public static createDemo() {
        const demo = new JigsawStructure()

        /*
        const exampleRes1 = await fetch('example.nbt')
        const exampleData1 = await exampleRes1.arrayBuffer()
        const exampleNbt1 = NbtFile.read(new Uint8Array(exampleData1))
        const structure1 = EntityAnnotatedStructure.fromNbt(exampleNbt1.root)
        */

        const structure = new EntityAnnotatedStructure([2,2,2], [BlockState.STONE], [
            {pos: [0, 0, 0], state: 0},
            {pos: [1, 0, 0], state: 0},
            {pos: [0, 0, 1], state: 0},
            {pos: [1, 0, 1], state: 0},
        ])

        const pieceInfo: PieceInfo = {
            check: [],
            inside: undefined,
            element: "{}",
            element_type: "",
            joint: undefined,
            joint_type: undefined,
            pool: new Identifier("welcome", "jigsaw"),
            fallback_from: undefined,
            aliased_from: undefined,
            depth: 0,
            jigsaw_pos: undefined,
            placement_priority: 0,
            selection_priority: 0
        }
        demo.addPiece(structure, [0, 65, 0], pieceInfo, [])
        demo.setStartingY(64)

        return demo
    }

    private pieces: Piece[] = []
    private minPos: BlockPos = [0, 0, 0]
    private maxPos: BlockPos = [0, 0, 0]

    private dirtyChunks = new Map<string, vec3>()

    private lastStep: number = 0
    private hideCurrent: boolean = false

    private pools: Set<string> = new Set<string>()
    private poolJoints: Set<string> = new Set<string>()

    private startingY = 0
    private maxRadius = 80
    private maxHeight = 80
    public burried = false

    private bakedBlocks: Map<string, {
        step: number,
        block: {
            pos: BlockPos;
            state: BlockState;
            nbt: NbtCompound;
        }
    }[]> = new Map()

    public setStartingY(y: number) {
        this.startingY = y
    }

    public setMaxRadiusAndHeight(radius: number, height: number) {
        this.maxRadius = radius
        this.maxHeight = height
    }

    public getBounds(): [BlockPos, BlockPos] {
        return [this.minPos, this.maxPos]
    }


    public setLastStep(step: number | undefined) {
        if (step < 0 || step >= this.pieces.length ){
            console.warn('trying to set step outside range')
        }

        for (var s = Math.min(step, this.lastStep) + 1; s <= Math.max(step, this.lastStep); s++ ){
            this.getBB(s).getAffectedChunks(8).forEach(p => this.dirtyChunks.set(`${p[0]}, ${p[1]}, ${p[2]}`, p))
        }

        this.lastStep = step
        this.hideCurrent = false
    }

    public setHideCurrent(b: boolean){
        this.getBB(this.lastStep).getAffectedChunks(8).forEach(p => this.dirtyChunks.set(`${p[0]}, ${p[1]}, ${p[2]}`, p))
        this.hideCurrent = b
    }

    public getStepCount(): number {
        return this.pieces.length
    }

    public getSize(): BlockPos {
        const [minPos, maxPos] = this.getBounds()
        return [maxPos[0] - minPos[0] + 1, maxPos[1] - minPos[1] + 1, maxPos[2] - minPos[2] + 1]
    }

    public getChunksToUpdate(){
        const chunks = [...this.dirtyChunks.values()]
        this.dirtyChunks.clear()
        return chunks
    }

    public getBB(nr: number | undefined): BoundingBox {
        if (nr === undefined) {
            return new BoundingBox([-this.maxRadius, -this.maxHeight + this.startingY, -this.maxRadius], [2 * this.maxRadius + 2, 2 * this.maxHeight + 2, 2 * this.maxRadius + 2])
        }

        return JigsawStructure.getBBFromElement(this.pieces[nr])
    }

    public static getBBFromElement(element: Piece): BoundingBox {
        const size = element.structure.getSize()
        const min: BlockPos = [element.pos[0], element.pos[1], element.pos[2]]
        return new BoundingBox(min, size)
    }

    /**
     * more efficient than getBBFromElemenent.isInside
     * @param element
     */
    public static isInsideBBFromElement(element: Piece, pos: BlockPos): boolean {
        const size = element.structure.getSize()

        return pos[0] >= element.pos[0] && pos[0] < element.pos[0] + size[0] &&
            pos[1] >= element.pos[1] && pos[1] < element.pos[1] + size[1] &&
            pos[2] >= element.pos[2] && pos[2] < element.pos[2] + size[2]
    }

    public getBoundingBoxes(): BoundingBoxInfo[] {
        const currentInfo = this.pieces[this.lastStep].pieceInfo

        const insides = [currentInfo.inside]
        while (insides[0] !== undefined) {
            insides.unshift(this.pieces[insides[0]].pieceInfo.inside)
        }

        const bbs = this.pieces.slice(0, this.lastStep + (this.hideCurrent ? 0 : 1) ).map((piece, i) => {
            return {
                bb: this.getBB(i),
                pieceInfo: piece.pieceInfo,
                poolIndex: [...this.pools].indexOf(piece.pieceInfo.pool.toString()) / this.pools.size,
                poolJointIndex: [...this.poolJoints].indexOf(`${piece.pieceInfo.pool.toString()}${piece.pieceInfo.joint}`) / this.poolJoints.size,
                isCurrent: i === this.lastStep,
                isOutside: insides.includes(i),
                isRelevant: currentInfo.check.includes(i) || currentInfo.inside === i
            }
        })

        bbs.unshift({
            bb: this.getBB(undefined),
            isCurrent: false,
            isOutside: true,
            isRelevant: currentInfo.inside === undefined,
            poolIndex: 0,
            poolJointIndex: 0,
            pieceInfo: {
                check: [],
                depth: -1,
                jigsaw_pos: [0, 0, 0],
                placement_priority: 0,
                selection_priority: 0
            }
        })

        return bbs

    }

    public getPiece(i: number): Piece {
        return this.pieces[i]
    }

    public bakeBlocks(): void {
        if (this.bakedBlocks.size > 0)
            return
        //        this.bakedBlocks.clear()

        //const pieceList = this.lastStep ? this.pieces.slice(0, this.lastStep) : this.pieces

        this.pieces.forEach((e, i) => e.structure.getBlocks().forEach(b => {
            const new_pos: BlockPos = [b.pos[0] + e.pos[0], b.pos[1] + e.pos[1], b.pos[2] + e.pos[2]]
            const posKey = `${new_pos[0]}, ${new_pos[1]}, ${new_pos[2]}`
            if (!this.bakedBlocks.has(posKey))
                this.bakedBlocks.set(posKey, [])

            this.bakedBlocks.get(posKey).unshift({
                step: i,
                block: {
                    pos: new_pos,
                    state: b.state,
                    nbt: b.nbt
                }
            })
        }))
    }

    public getBlocks(): {
        pos: BlockPos;
        state: BlockState;
        nbt?: NbtCompound;
    }[] {
        this.bakeBlocks()
        return Array.from(this.bakedBlocks.values()).flatMap(bs => bs.find(b => b.step < this.lastStep + (this.hideCurrent ? 0 : 1) )?.block ?? [])
    }

    public getBlock(pos: BlockPos): {
        pos: BlockPos;
        state: BlockState;
        nbt: NbtCompound;
    } {
        this.bakeBlocks()

        const posKey = `${pos[0]}, ${pos[1]}, ${pos[2]}`

        const blocksAtPos = this.bakedBlocks.get(posKey)
        if (blocksAtPos) {
            const result = blocksAtPos.find(b => b.step < this.lastStep + (this.hideCurrent ? 0 : 1))
            if (result)
                return result.block
        }

        if (this.burried)
            return {
                pos: pos,
                state: BlockState.STONE,
                nbt: undefined
            }

        return undefined
    }

    public addPiece(structure: StructureProvider & AnnotationProvider, pos: BlockPos, annotation: PieceInfo | undefined, failedPieces: { name: string, piece: (StructureProvider & AnnotationProvider) }[]): number {

        this.pools.add(annotation.pool.toString())
        this.poolJoints.add(`${annotation.pool.toString()}${annotation.joint}`)

        const size = structure.getSize()

        if (this.pieces.length === 0) {
            this.minPos[0] = pos[0]
            this.minPos[1] = pos[1]
            this.minPos[2] = pos[2]
            this.maxPos[0] = pos[0] + size[0] - 1
            this.maxPos[1] = pos[1] + size[1] - 1
            this.maxPos[2] = pos[2] + size[2] - 1
        } else {
            this.minPos[0] = Math.min(this.minPos[0], pos[0])
            this.minPos[1] = Math.min(this.minPos[1], pos[1])
            this.minPos[2] = Math.min(this.minPos[2], pos[2])

            this.maxPos[0] = Math.max(this.maxPos[0], pos[0] + size[0] - 1)
            this.maxPos[1] = Math.max(this.maxPos[1], pos[1] + size[1] - 1)
            this.maxPos[2] = Math.max(this.maxPos[2], pos[2] + size[2] - 1)
        }

        return this.pieces.push({
            structure: structure,
            pos: pos,
            pieceInfo: annotation,
            failedPieces: failedPieces
        }) - 1
    }


    getAnnotations(): StructureAnnotation[] {
        const pieceList = this.pieces.slice(0, this.lastStep + 1)

        return pieceList.flatMap(e => e.structure.getAnnotations().map(a => {
            return {
                pos: [a.pos[0] + e.pos[0], a.pos[1] + e.pos[1], a.pos[2] + e.pos[2]],
                annotation: a.annotation,
                data: a.data
            } as StructureAnnotation
        }))
    }


}
