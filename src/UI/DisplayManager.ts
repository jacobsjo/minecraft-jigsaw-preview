import { clamp } from "deepslate"
import { JigsawStructure } from "../Jigsaw/JigsawStructure"



export class DisplayManager{

    private stepElementTypes = new Set(['minecraft:single_pool_element', 'minecraft:list_pool_element', 'minecraft:feature_pool_element', 'error'])

    private step: number = 1
    private failedStep: number = -1

    constructor(
        private jigsawStructure: JigsawStructure
    ){}

    public setStepElementType(type: string, enabled: boolean) {
        if (enabled)
            this.stepElementTypes.add(type)
        else
            this.stepElementTypes.delete(type)
    }

    public nextStep(): void {
        do {
            this.step = Math.min(this.step + 1, this.jigsawStructure.getStepCount())
        } while (!this.stepElementTypes.has(this.jigsawStructure.getPiece(this.step - 1).pieceInfo.element_type) && this.step < this.jigsawStructure.getStepCount())
        this.failedStep = -1
        this.jigsawStructure.setLastStep(this.step)
    }

    public prevStep(): void {
        do {
            this.step = Math.max(this.step - 1, 1)
        } while (!this.stepElementTypes.has(this.jigsawStructure.getPiece(this.step - 1).pieceInfo.element_type) && this.step > 1)
        this.failedStep = -1
        this.jigsawStructure.setLastStep(this.step)
    }

    public firstStep(): void {
        this.step = 1
        this.failedStep = -1
        this.jigsawStructure.setLastStep(this.step)
    }

    public lastStep(): void {
        this.step = this.jigsawStructure.getStepCount()
        this.failedStep = -1
        this.jigsawStructure.setLastStep(this.step)
    }

    public toggleFailedStep(failedStep: number): void {
        if (this.failedStep === failedStep){
            this.successfullStep()
        } else {
            this.failedStep = clamp(failedStep, 0, this.jigsawStructure.getPiece(this.step - 1).failedPieces.length - 1)
            this.jigsawStructure.setLastStep(this.step - 1)
        }
    }

    public successfullStep(): void {
        this.failedStep = -1
        this.jigsawStructure.setLastStep(this.step)
    }

    public getStep(): number {
        return this.step
    }

    public getFailedStep(): number{
        return this.failedStep
    }
}