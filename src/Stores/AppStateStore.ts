import { defineStore } from "pinia";
import { computed, ref, render, watch } from "vue";
import { Constants } from '../Util/Constants';
import { JigsawStructure } from "../Jigsaw/JigsawStructure";
import { Datapack, DatapackList } from "mc-datapack-loader";
import { MetaStore } from "./MetaStore";
import { StructureFeature } from "../worldgen/StructureFeature";
import { JigsawGenerator } from "../Jigsaw/JigsawGenerator";
import { Heightmap } from "../Heightmap/Heightmap";
import { SettingsStore } from "./SettingsStore";
import { TimelineStore } from "./TilelineStore";
import { TemplatePool } from "../worldgen/TemplatePool";
import { ImageHeightmap } from "../Heightmap/ImageHeightmap";

export const AppStateStore = defineStore('appState', () => {
    const meta = MetaStore()
    const settings = SettingsStore()
    const timeline = TimelineStore()

    var updateCounter = ref(0)
    var minorUpdateCounter = ref(0)

    var world = JigsawStructure.createDemo()
    var vanillaDatapack: Datapack
    updateVanilla()
    var loadedDatapack: Datapack | undefined = undefined

    const compositeDatapack = () => Datapack.compose(new class implements DatapackList{
        async getDatapacks(){
            if (loadedDatapack){
                return [vanillaDatapack, loadedDatapack]
            } else {
                return [vanillaDatapack]
            }
        }
    })

    var structures = ref<StructureFeature[]>([])
    var selectedStructure = ref<string>("")

    var heightmapName = ref<string>("flat")
    var heightmap = computed(() => {
        return ImageHeightmap.fromImage(`heightmaps/${heightmapName.value}.png`)
    })

    watch(selectedStructure, () => {
        regenerate()
    })

    watch(() => settings.burried, () => {
        world.burried = settings.burried
        updateCounter.value++
    })

    timeline.$subscribe(() => {
        world.setLastStep(timeline.step - (timeline.failedStep >= 0 ? 1 : 0) )
        minorUpdateCounter.value++
    })

    reloadDatapacks()

    async function reloadDatapacks(){
        TemplatePool.reload()
        structures.value = []
        structures.value = await StructureFeature.getAll(compositeDatapack(), Constants.LEGACY_MINECRAFT_VERSIONS.includes(meta.mcVersion) ? 'legacy' : 'default')        
    }

    function updateVanilla(){
        vanillaDatapack = Datapack.fromZipUrl("zips/data_" + meta.mcVersion + ".zip", 20 /* TODO */)
    }

    meta.$subscribe(() => {
        world = JigsawStructure.createDemo()
        timeline.step = 0
        updateCounter.value++;
        updateVanilla()
        reloadDatapacks()
    })

    function setLoadedDatapack(datapack: Datapack){
        loadedDatapack = datapack
        reloadDatapacks()
    }

    async function regenerate(){
        const sfm = JigsawGenerator.fromStructureFeature(compositeDatapack(), structures.value.find(s => s.getIdentifier().toString() === selectedStructure.value), await heightmap.value)
        await sfm.generate()
        world = sfm.getWorld()

        settings.burried = world.burried
        timeline.lastStep()
        world.setLastStep(timeline.step)

        updateCounter.value++
    }

    function getWorld(){
        return world
    }

    function getCompositeDatapack(){
        return compositeDatapack
    }

    return { getWorld, setLoadedDatapack, getCompositeDatapack, structures, selectedStructure, regenerate, updateCounter, minorUpdateCounter, heightmapName, heightmap }
})