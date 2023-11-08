//import { NamedNbtTag, NbtTag, getTag, getListTag, getOptional } from "@webmc/nbt";
import { NbtCompound, BlockPos, BlockState, StructureProvider, Structure, Identifier, PlacedBlock } from "deepslate";
//import fs from 'fs';
import { BoundingBox } from "./BoundingBox"
import { AnnotationProvider, StructureAnnotation } from "../Structure/AnnotationProvider";




export type PieceInfo = {
    check: number[],
    inside: number | undefined,

    pool: Identifier | undefined,
    aliased_from: Identifier | undefined
    fallback_from: Identifier | undefined,
    element: string | undefined,
    element_type: string | undefined,
    joint: string | undefined,
    joint_type: "alligned" | "rollable" | undefined,
    depth: number,
    jigsaw_pos: BlockPos,
    selection_priority: number,
    placement_priority: number
}

type Piece = {
    structure: StructureProvider & AnnotationProvider,
    pos: BlockPos,
    pieceInfo: PieceInfo,
    failedPieces: {name: string, piece: (StructureProvider & AnnotationProvider)}[],
}


export class JigsawStructure implements StructureProvider, AnnotationProvider {

    private pieces: Piece[] = []
    private minPos: BlockPos = [0, 0, 0]
    private maxPos: BlockPos = [0, 0, 0]

    private lastStep: number | undefined = undefined

    private startingY = 0
    private maxRadius = 80
    private burried = false

    private bakedBlocks: Map<string, {
        pos: BlockPos;
        state: BlockState;
        nbt: NbtCompound;
    }> = new Map()

    public setStartingY(y: number) {
        this.startingY = y
    }

    public setMaxRadius(radius: number) {
        this.maxRadius = radius
    }

    public setBurried(burried: boolean){
        this.burried = burried
    }

    public getBounds(): [BlockPos, BlockPos] {
        return [this.minPos, this.maxPos]
    }


    public setLastStep(step: number | undefined){
        this.lastStep = step
    }

    public getStepCount(): number {
        return this.pieces.length
    }

    public getSize(): BlockPos {
        const [minPos, maxPos] = this.getBounds()
        return [maxPos[0] - minPos[0] + 1, maxPos[1] - minPos[1] + 1, maxPos[2] - minPos[2] + 1]
    }

    public getBB(nr: number | undefined): BoundingBox {
        if (nr === undefined) {
            return new BoundingBox([-this.maxRadius, -this.maxRadius + this.startingY, -this.maxRadius], [2 * this.maxRadius + 2, 2 * this.maxRadius + 2, 2 * this.maxRadius + 2])
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

    public getBoundingBoxes(i: number): [BoundingBox, BoundingBox | undefined, BoundingBox[]] {
        const ownBB = this.getBB(i)

        const inside = this.pieces[i].pieceInfo.inside
        const insideBB = this.getBB(inside)

        const check = this.pieces[i].pieceInfo.check
        const checkBBs = check.map(c => this.getBB(c))

        return [ownBB, insideBB, checkBBs]
    }

    public getPiece(i: number): Piece {
        return this.pieces[i]
    }

    public bakeBlocks(): void { 
        this.bakedBlocks.clear()

        const pieceList = this.lastStep ? this.pieces.slice(0, this.lastStep) : this.pieces

        pieceList.forEach(e => e.structure.getBlocks().forEach(b => {
            const new_pos: BlockPos = [b.pos[0] + e.pos[0], b.pos[1] + e.pos[1], b.pos[2] + e.pos[2]]
            this.bakedBlocks.set(`${new_pos[0]}, ${new_pos[1]}, ${new_pos[2]}`, {
                pos: new_pos,
                state: b.state,
                nbt: b.nbt
            })
        }))
    }

    public getBlocks(): {
        pos: BlockPos;
        state: BlockState;
        nbt?: NbtCompound;
    }[] {
        this.bakeBlocks()
        return Array.from(this.bakedBlocks.values())
    }

    public getBlock(pos: BlockPos): {
        pos: BlockPos;
        state: BlockState;
        nbt: NbtCompound;
    } {
        return this.bakedBlocks.get(`${pos[0]}, ${pos[1]}, ${pos[2]}`) ?? (this.burried ? {
            pos: pos,
            state: BlockState.STONE,
            nbt: undefined
        } : undefined)
    }

    public addPiece(structure: StructureProvider & AnnotationProvider, pos: BlockPos, annotation: PieceInfo | undefined, failedPieces: {name: string, piece: (StructureProvider & AnnotationProvider)}[]): number {

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
        const pieceList = this.lastStep ? this.pieces.slice(0, this.lastStep) : this.pieces

        return pieceList.flatMap(e => e.structure.getAnnotations().map(a => {
            return {
                pos: [a.pos[0] + e.pos[0], a.pos[1] + e.pos[1], a.pos[2] + e.pos[2]],
                annotation: a.annotation,
                data: a.data
            } as StructureAnnotation
        }))
    }


}
