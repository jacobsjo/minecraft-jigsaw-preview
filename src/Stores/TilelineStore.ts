import { defineStore } from "pinia";
import { ref } from "vue";
import { AppStateStore } from "./AppStateStore";
import { SettingsStore } from "./SettingsStore";
import { clamp } from "../Util/util";



export const TimelineStore = defineStore('timeline', () => {
    const appState = AppStateStore()
    const settings = SettingsStore()

    const step = ref(0)
    const failedStep = ref(-1)

    function testElementType(type: string){
        if (type === "minecraft:empty_pool_element" && !settings.showEmptyPieces)
            return false

        if (type === "minecraft:feature_pool_element" && !settings.showFeatures)
            return false

        return true
    }

    function nextStep(): void {
        while (step.value < appState.getWorld().getStepCount() - 1) {
            step.value = step.value + 1
            if (testElementType(appState.getWorld().getPiece(step.value).pieceInfo.element_type))
                break
        }
        failedStep.value = -1
    }

    function prevStep(): void {
        while (step.value > 0) {
            step.value = step.value - 1
            if (testElementType(appState.getWorld().getPiece(step.value).pieceInfo.element_type))
                break
        }
        failedStep.value = -1
    }

    function firstStep(): void {
        step.value = 0
        failedStep.value = -1
    }

    function lastStep(): void {
        step.value = appState.getWorld().getStepCount() - 1
        failedStep.value = -1
    }

    function toggleFailedStep(fs: number): void {
        if (failedStep.value === fs){
            successfullStep()
        } else {
            failedStep.value = clamp(fs, 0, appState.getWorld().getPiece(step.value).failedPieces.length - 1)
        }
    }

    function successfullStep(): void {
        failedStep.value = -1
    }

    function isLast(){
        return step.value === appState.getWorld().getStepCount() - 1
    }

    function isFirst(){
        return step.value === 0
    }

    return { step, failedStep, firstStep, prevStep, nextStep, lastStep, toggleFailedStep, successfullStep, isFirst, isLast }
})