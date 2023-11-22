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
        if (world.burried !== settings.burried){
            world.burried = settings.burried
            updateCounter.value++
        }
    })

    timeline.$subscribe(() => {
        world.setLastStep(timeline.step)
        world.setHideCurrent(timeline.failedStep >= 0)
        minorUpdateCounter.value++
    })

    reloadDatapacks()

    async function reloadDatapacks(){
        TemplatePool.reload()
        structures.value = await StructureFeature.getAll(compositeDatapack(), Constants.LEGACY_MINECRAFT_VERSIONS.includes(meta.mcVersion) ? 'legacy' : 'default')        
    }

    function updateVanilla(){
        vanillaDatapack = Datapack.fromZipUrl("zips/data_" + meta.mcVersion + ".zip", Constants.MINECRAFT_DATAPACK_VERSION[meta.mcVersion])
    }

    meta.$subscribe(() => {
        world = JigsawStructure.createDemo()
        selectedStructure.value = ""
        timeline.step = 0
        updateVanilla()
        loadedDatapack?.setPackVersion(Constants.MINECRAFT_DATAPACK_VERSION[meta.mcVersion])
        reloadDatapacks()
        updateCounter.value++;
    })

    function setLoadedDatapack(datapack: Datapack){
        loadedDatapack = datapack
        loadedDatapack.setPackVersion(Constants.MINECRAFT_DATAPACK_VERSION[meta.mcVersion])
        reloadDatapacks()
    }

    async function regenerate(){
        await reloadDatapacks()
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