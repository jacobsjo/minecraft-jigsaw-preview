<script setup lang="ts">
import { Constants } from '../Util/Constants';
import { SettingsStore } from '../Stores/SettingsStore';
import Button from './Button.vue';
import { MetaStore } from '../Stores/MetaStore';
import { AppStateStore } from '../Stores/AppStateStore';
import { Datapack } from 'mc-datapack-loader';
import { TimelineStore } from '../Stores/TilelineStore';
import AboutMenu from './AboutMenu.vue';
import { ref } from 'vue';
import { vOnClickOutside } from '@vueuse/components';

const settings = SettingsStore()
const meta = MetaStore()
const appState = AppStateStore()
const timeline = TimelineStore()

const showAboutMenu = ref(false)

async function openZipDatapack() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.zip'

    input.onchange = async () => {
        if (input.files.length === 0) {
            alert("No file selected")
        }
        if (!input.files[0].name.toLowerCase().endsWith('.zip')) {
            alert("Please select a .zip file")
        }

        appState.setLoadedDatapack(Datapack.fromZipFile(input.files[0], 20))
    }
    input.click()
}

async function openFolderDatapack() {
    const input: any = document.createElement('input')
    input.type = 'file'
    input.webkitdirectory = true

    input.onchange = async () => {
        appState.setLoadedDatapack(Datapack.fromFileList(Array.from(input.files), 20))
    }
    input.click()
}

function pd(evt: Event) {
    evt.preventDefault()
}

</script>

<template>
    <div class=menuBar>
        <select class="dropdown" id="version" v-model="meta.mcVersion" aria-label="Minecraft Version">
            <option value="1_16">1.16.5</option>
            <option value="1_17">1.17.1</option>
            <option value="1_18">1.18.2</option>
            <option value="1_19">1.19</option>
            <option value="1_20">1.20</option>
            <option value="1_20_3">1.20.3</option>
        </select>
        <Button @press="openZipDatapack" title="Open zip datapack"><font-awesome-icon icon="fa-file-zipper" /></Button>
        <Button @press="openFolderDatapack" title="Open folder datapack"><font-awesome-icon
                icon="fa-folder-open" /></Button>
        <select required class="dropdown" id="structure" aria-label="Structure" v-model="appState.selectedStructure" @keydown.down="pd"
            @keydown.left="pd" @keydown.right="pd" @keydown.up="pd" >
            <option value="" disabled selected hidden>Select structure</option>
            <option v-for="structure in appState.structures" :value="structure.getIdentifier().toString()">{{
                structure.getIdentifier().toString() }}</option>
        </select>
        <Button @press="appState.regenerate()" title="Regenerate"><font-awesome-icon icon="fa-rotate-right" /></Button>
        <div class="seperator"></div>
        <Button v-model="settings.showBoundingBoxes" title="Show bounding boxes"><img src="../buttons/bb.png" alt="Bounding Box"/></Button>
        <Button v-model="settings.showInfobox" title="Show piece info"><img src="../buttons/info.png" alt="Info"/> </Button>
        <Button v-model="settings.burried" title="Hide outside faces" ><img src="../buttons/bury.webp" alt="Bury"/></Button>
        <Button v-model="settings.showEmptyPieces" title="Show empty pieces" ><img src="../buttons/empty.png" alt="X" /></Button>
        <Button v-model="settings.showEntities" title="Show entities"><img src="../buttons/entity.png" alt="E"/></Button>
        <Button v-model="settings.showFeatures" title="Show features"><img src="../buttons/feature.png" alt="F"/></Button>
        <Button v-model="settings.showHeightmap" title="Show heightmap"><img src="../buttons/heightmap.png" alt="Hightmap"/></Button>
        <select class="dropdown" aria-label="Heightmap" v-model="appState.heightmapName">
            <option value="flat">Flat</option>
            <option value="plains">Plains</option>
            <option value="hills">Hills</option>
            <option value="mountains">Mountains</option>
            <option value="cliff_up">Cliff (Up)</option>
            <option value="cliff_down">Cliff (Down)</option>
            <option value="river_ns">River (North-South)</option>
            <option value="river_we">River (East-West)</option>
            <option value="river_offset">River (Offset)</option>
        </select>
        <div class="seperator"></div>
        <span class="group">
            <Button @press="timeline.firstStep()" title="Go to first step"
                :class="{ inactive: timeline.isFirst() }"><font-awesome-icon icon="fa-backward-fast" /></Button>
            <Button @press="timeline.prevStep()" title="Go back one step"
                :class="{ inactive: timeline.isFirst() }"><font-awesome-icon icon="fa-backward-step" /></Button>
            <span class="step">{{ timeline.step + 1 }} / {{ appState.getWorld().getStepCount() }}</span>
            <Button @press="timeline.nextStep()" title="Go forward one step"
                :class="{ inactive: timeline.isLast() }"><font-awesome-icon icon="fa-forward-step" /></Button>
            <Button @press="timeline.lastStep()" title="Go to last step"
                :class="{ inactive: timeline.isLast() }"><font-awesome-icon icon="fa-forward-fast" /></Button>
        </span>
        <div class="gap"></div>
        <Button v-model="showAboutMenu" title="About Menu"><font-awesome-icon icon="fa-bars"/></Button>
        <AboutMenu v-on-click-outside="() => { showAboutMenu = false }" v-if="showAboutMenu"
            @close="showAboutMenu = false" />
    </div>
</template>

<style scoped>
.menuBar {
    --height: 1.6rem;

    width: 100%;
    background-color: #1d1d1d;
    display: flex;
    padding: 0.3rem;
    gap: 0.3rem;
    box-sizing: border-box;
    color: white;
    align-items: center;
    user-select: none;
    flex-wrap: wrap;
}


.menuBar .group {
    display: flex;
    align-items: center;
    gap: 0.3rem
}


.group .dropdown {
    border: 0;
}

.dropdown {
    padding: 0.2rem;
    height: 1.6rem;
    border-radius: 0.3rem;
    color: white;
    transition: 0.3s;
    cursor: pointer;
}

input {
    background-color: rgb(15, 15, 15);
    border: 0;
    border-radius: 0.3rem;
    -moz-appearance: textfield;
    color: white;
    width: 3rem;
    text-align: center;
    height: 1.8rem;
    font-size: 12pt;
}

.dropdown {
    width: 12rem;
    height: var(--height);
    background-color: #464646;
    border: 1px solid black;
}

.dropdown#version {
    width: 4.3rem;
}

.dropdown option {
    background-color: rgb(51, 51, 51);
    border: 0
}

.dropdown:hover {
    background-color: rgb(87, 87, 87);
}

.dropdown:invalid {
    color: rgb(204, 204, 204);
}

.button {
    padding: 0.2rem;
    border-radius: 0.3rem;
    color: white;
    transition: background-color 0.3s;
    cursor: pointer;
    height: var(--height);
    width: var(--height);
    box-sizing: border-box;
}

.button:hover {
    background-color: gray;
}

.button.activated {
    background-color: rgb(172, 172, 172);
}

.button:active {
    background-color: rgb(172, 172, 172);
}

.button.activated:hover {
    background-color: rgb(214, 213, 213);
}

.button.highlight {
    outline: 2px solid yellow;
    position: relative;
}

.button.highlight:focus-visible::after {
    content:"";
    position: absolute;
    top: 0px;
    left: 0px;
    right: 0px;
    bottom: 0px;
    border-radius: 0.3rem;
    outline: 1px solid white;
    outline-offset: 4px;
}

.button.inactive {
    color: gray;
    background-color: unset;
    cursor: default;
}

.seperator {
    width: 2px;
    padding: 0;
    height: var(--height);
    background-color: rgb(124, 124, 124);
}

.gap {
    flex-grow: 1;
}

.step {
    width: 5.5rem;
    text-align: center;
}</style>
