import { defineStore } from "pinia";
import { ref } from "vue";



export const SettingsStore = defineStore('settings', () => {

    const showBoundingBoxes = ref(true)
    const showInfobox = ref(false)
    const showHeightmap = ref(false)
    const burried = ref(false)
    const showEmptyPieces = ref(false)
    const showEntities = ref(true)
    const showFeatures = ref(true)

    return {showBoundingBoxes, showInfobox, showHeightmap, burried, showEmptyPieces, showEntities, showFeatures}
})