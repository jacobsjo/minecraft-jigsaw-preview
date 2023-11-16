<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';
import { StructureRenderer } from '../Renderer/StructureRenderer';
import { AnnotationRenderer } from '../Renderer/AnnotationRenderer';
import { HeightmapRenderer } from '../Renderer/HeightmapRenderer';
import { BBRenderer } from '../Renderer/BoundingBoxRenderer';
import { McmetaResourceManager } from '../ResourceManger/McmetaResourceManager';
import { Constants } from '../Util/Constants';
import { BoundingBoxInfo } from '../Jigsaw/JigsawStructure'
import { StructureProvider, BlockPos, BlockState, NbtCompound, Resources } from 'deepslate';
import { getAnnotationAtlas } from '../ResourceManger/AnnotationAtlas';
import { ImageHeightmap } from '../Heightmap/ImageHeightmap';
import { mat4, vec2, vec3 } from 'gl-matrix';
import { clamp, clampVec3, hsvToRgb, negVec3 } from '../Util/util';
import { BoundingBox } from '../Jigsaw/BoundingBox';
import { OffsetStructure } from '../Structure/OffsetStructure';
import { SettingsStore } from '../Stores/SettingsStore';
import { TimelineStore } from '../Stores/TilelineStore';
import { MetaStore } from '../Stores/MetaStore';
import { AppStateStore } from '../Stores/AppStateStore';
import { InsetStructure } from '../Structure/InsetStructure';

const settings = SettingsStore()
const timeline = TimelineStore()
const meta = MetaStore()
const appState = AppStateStore()

const canvas = ref<HTMLCanvasElement>()

var structureRenderer: StructureRenderer
var failedStructureRenderer: StructureRenderer
var annotationRenderer: AnnotationRenderer
var heightmapRenderer: HeightmapRenderer
var boundingBoxRenderer: BBRenderer

// Camera parameters
const cPos = vec3.fromValues(-1.5, -65, -1.5)
const cRot = vec2.fromValues(0.4, 0.6)
let cDist = 10

settings.$subscribe(() => {
    const list = []
    if (settings.showEmptyPieces)
        list.push('empty')
    if (settings.showFeatures)
        list.push('feature')
    if (settings.showEntities)
        list.push('entity')

    annotationRenderer.setRenderedTypes(list)
    requestAnimationFrame(render)
})

meta.$subscribe(async () => {
    await reloadResources()
    requestAnimationFrame(render)
})

var world = appState.getWorld()
var boundingBoxInfos = world.getBoundingBoxes()
var jigsawPos = world.getPiece(timeline.step).pieceInfo.jigsaw_pos

watch(() => appState.updateCounter, () => {
    world = appState.getWorld()
    structureRenderer.setStructure(world)
    annotationRenderer.setStructure(world)
    annotationRenderer.update()
    boundingBoxInfos = world.getBoundingBoxes()
    jigsawPos = world.getPiece(timeline.step).pieceInfo.jigsaw_pos
    world.getChunksToUpdate()

    if (timeline.failedStep >= 0)
        failedStructureRenderer.setStructure(new InsetStructure(world.getPiece(timeline.step).failedPieces[timeline.failedStep].piece, world))

    requestAnimationFrame(render)
})

watch(() => appState.minorUpdateCounter, () => {
    world = appState.getWorld()
    annotationRenderer?.update()
    boundingBoxInfos = world.getBoundingBoxes()
    jigsawPos = world.getPiece(timeline.step).pieceInfo.jigsaw_pos
    structureRenderer?.updateStructureBuffers(world.getChunksToUpdate())

    if (timeline.failedStep >= 0)
        failedStructureRenderer.setStructure(new InsetStructure(world.getPiece(timeline.step).failedPieces[timeline.failedStep].piece, world))

    requestAnimationFrame(render)
})

watch(() => appState.heightmap, async () => {
    console.log('heightmap changed')
    heightmapRenderer.setHeightmap(await appState.heightmap)
    requestAnimationFrame(render)
})

var gl: WebGLRenderingContext

var resources: Resources

onMounted(async () => {
    window.addEventListener("resize", onWindowResize);

    if (!canvas.value)
        throw new Error('could not find canvas')

    var new_gl = canvas.value.getContext('webgl');
    if (gl === null) {
        throw new Error('Unable to initialize WebGL. Your browser or machine may not support it.')
    }
    gl = new_gl!

    const ext = gl.getExtension('OES_element_index_uint')
    if (!ext) {
        throw new Error('Unable to load OES_element_index_uint wegbl extension. Your browser or machine may not support it.')
    }

    await reloadResources()
    const annotation_atlas = await getAnnotationAtlas()


    structureRenderer = new StructureRenderer(gl, world, resources)

    failedStructureRenderer = new StructureRenderer(gl, undefined, resources)

    annotationRenderer = new AnnotationRenderer(gl, world, annotation_atlas)
    annotationRenderer.setRenderedTypes(['entity', 'feature'])

    heightmapRenderer = new HeightmapRenderer(gl, await appState.heightmap)
    boundingBoxRenderer = new BBRenderer(gl)

    resize(true)
    requestAnimationFrame(render)
})

async function reloadResources() {
    resources = await McmetaResourceManager.create(Constants.MINECRAFT_ASSET_VERSIONS[meta.mcVersion])
    structureRenderer = new StructureRenderer(gl, world, resources)
    failedStructureRenderer = new StructureRenderer(gl, undefined, resources)
}

onUnmounted(() => {
    window.removeEventListener("resize", onWindowResize);
})

function onWindowResize() {
    if (resize(false)) {
        requestAnimationFrame(render)
    }
}

function resize(force?: boolean) {
    if (!canvas.value)
        return

    const displayWidth = canvas.value.parentElement.clientWidth;
    const displayHeight = canvas.value.parentElement.clientHeight;

    if (canvas.value.width !== displayWidth || canvas.value.height !== displayHeight || force) {
        canvas.value.width = displayWidth;
        canvas.value.height = displayHeight;

        structureRenderer.setViewport(0, 0, displayWidth, displayHeight)
        failedStructureRenderer.setViewport(0, 0, displayWidth, displayHeight)
        boundingBoxRenderer.setViewport(0, 0, displayWidth, displayHeight)
        annotationRenderer.setViewport(0, 0, displayWidth, displayHeight)
        heightmapRenderer.setViewport(0, 0, displayWidth, displayHeight)
        return true
    }
}


function getPieceColorByType(info: BoundingBoxInfo): [number, number, number] {
    if (info.isCurrent)
        return [1, 1, 1]

    if (info.isOutside) {
        if (info.isRelevant)
            return [137 / 255, 218 / 255, 255 / 255]

        return [143 / 255, 185 / 255, 204 / 255]
    }

    if (info.isRelevant) {
        return [255 / 255, 199 / 255, 79 / 255]
    }

    return [100 / 255, 100 / 255, 100 / 255]
}

function getPieceColorByPool(info: BoundingBoxInfo): [number, number, number] {
    var value = 1

    if (info.isCurrent) {
        value = 1
    } else if (info.isRelevant) {
        value = 0.7
    } else {
        value = 0.4
    }

    //const hash = hashCode(`${info.pieceInfo.pool?.toString()}/${info.pieceInfo.joint}`)
    //const hue = (hash & 0xFFFFFF)/0xFFFFFF
    const hue = (info.poolIndex * 3) % 1
    const saturation = Math.floor(info.poolIndex * 3) / 6 + 0.5
    //    console.log(hue)

    return hsvToRgb(hue, saturation, value)
}

function getViewMatrix() {
    const viewMatrix = mat4.create();
    mat4.translate(viewMatrix, viewMatrix, [0, 0, -cDist])
    mat4.rotateX(viewMatrix, viewMatrix, cRot[1])
    mat4.rotateY(viewMatrix, viewMatrix, cRot[0])
    mat4.translate(viewMatrix, viewMatrix, cPos);
    return viewMatrix
}

function render() {

    const [min, max] = world.getBounds()
    clampVec3(cPos, negVec3(max), negVec3(min))

    if (!gl || !structureRenderer || !annotationRenderer || !heightmapRenderer || !boundingBoxRenderer)
        return

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT)

    const viewMatrix = getViewMatrix()

    structureRenderer.drawStructure(viewMatrix);
    if (timeline.failedStep >= 0) {
        failedStructureRenderer.drawTintedStructure(viewMatrix)
    }

    annotationRenderer.draw(viewMatrix)



    const colorFunction = getPieceColorByType


    if (settings.showBoundingBoxes) {
        if (jigsawPos) {
            boundingBoxRenderer.drawBB(viewMatrix, new BoundingBox(jigsawPos, [1, 1, 1]), [224 / 255, 117 / 255, 190 / 255], false, 3)
        }

        boundingBoxInfos.forEach(piece => {
            if (timeline.failedStep >= 0 && piece.isCurrent)
                return

            if (piece.bb.size[0] > 0 && piece.bb.size[1] > 0 && piece.bb.size[2] > 0)
                boundingBoxRenderer.drawBB(viewMatrix, piece.bb, colorFunction(piece), piece.isOutside ?? false, piece.isCurrent || (piece.isOutside && piece.isRelevant) ? 3 : 1.5)
        })


        if (timeline.failedStep >= 0) {
            const failedPiece = world.getPiece(timeline.step).failedPieces[timeline.failedStep].piece as OffsetStructure
            boundingBoxRenderer.drawBB(viewMatrix, new BoundingBox(failedPiece.getOffset(), failedPiece.getSize()), [1, 1, 1], false, 3)
        }
    }

    if (settings.showHeightmap) {
        heightmapRenderer.draw(viewMatrix)
    }

}


/**
 * Camera controlls
 */

let dragPos: [number, number] | null = null
let dragButton: number
function onMouseDown(evt: MouseEvent) {
    dragPos = [evt.clientX, evt.clientY]
    dragButton = evt.button
}

function onMouseMove(evt: MouseEvent) {
    if (dragPos) {
        const dx = (evt.clientX - dragPos[0]) / 100
        const dy = (evt.clientY - dragPos[1]) / 100
        if (dragButton === 0) {
            rotateCamera(dx, dy)
        } else if (dragButton === 2) {
            moveCamera(dx, dy)
        } else {
            return
        }
        dragPos = [evt.clientX, evt.clientY]
        requestAnimationFrame(render);
    }
}

function onMouseUp() {
    dragPos = null
}

let touchPos: [number, number] | null = null
let touchStartDistance: number | null = null
let touchStartCDist: number | null = null

function onTouchStart(evt: TouchEvent) {
    touchPos = [evt.touches[0].clientX, evt.touches[0].clientY]
    if (evt.touches.length > 1) {
        touchStartDistance = Math.sqrt(Math.pow(evt.touches[0].clientX - evt.touches[1].clientX, 2) + Math.pow(evt.touches[0].clientY - evt.touches[1].clientY, 2))
        touchStartCDist = cDist
    }
}

function onTouchMove(evt: TouchEvent) {
    if (touchPos) {
        const dx = (evt.touches[0].clientX - touchPos[0]) / 100
        const dy = (evt.touches[0].clientY - touchPos[1]) / 100

        if (evt.touches.length === 1) {
            rotateCamera(dx, dy)
        } else if (evt.touches.length > 1) {
            moveCamera(dx, dy)
            const d = Math.sqrt(Math.pow(evt.touches[0].clientX - evt.touches[1].clientX, 2) + Math.pow(evt.touches[0].clientY - evt.touches[1].clientY, 2))
            cDist = touchStartCDist * touchStartDistance / d
            cDist = Math.max(5, Math.min(100, cDist))
            evt.preventDefault()
        }

        touchPos = [evt.touches[0].clientX, evt.touches[0].clientY]
        requestAnimationFrame(render);
    }
}

function onTouchEnd(evt: TouchEvent) {
    touchPos = null
}

function onWheel(evt: WheelEvent) {
    cDist += evt.deltaY > 0 ? 1 : -1
    cDist = Math.max(5, Math.min(100, cDist))
    requestAnimationFrame(render);
}

function onContextMenu(evt: Event) {
    evt.preventDefault()
}

function rotateCamera(dx: number, dy: number) {
    vec2.add(cRot, cRot, [dx, dy])
    cRot[0] = cRot[0] % (Math.PI * 2)
    cRot[1] = clamp(cRot[1], -Math.PI / 2, Math.PI / 2)
}

function moveCamera(dx: number, dy: number) {
    const [min, max] = world.getBounds()
    vec3.rotateY(cPos, cPos, [0, 0, 0], cRot[0])
    vec3.rotateX(cPos, cPos, [0, 0, 0], cRot[1])
    const d = vec3.fromValues(dx, -dy, 0)
    vec3.scale(d, d, 0.25 * cDist)
    vec3.add(cPos, cPos, d)
    vec3.rotateX(cPos, cPos, [0, 0, 0], -cRot[1])
    vec3.rotateY(cPos, cPos, [0, 0, 0], -cRot[0])
    clampVec3(cPos, negVec3(max), negVec3(min))
}
</script>

<template>
    <canvas ref="canvas" width="640" height="480" tabindex="0" @mousedown="onMouseDown" @mousemove="onMouseMove" @mouseup="onMouseUp"
        @touchstart.passive="onTouchStart" @touchmove.passive="onTouchMove" @touchend.passive="onTouchEnd" @touchcancel.passive="onTouchEnd"
        @wheel.passive="onWheel" @contextmenu="onContextMenu"></canvas>

    <!--<div class="loader" v-if="appState.loading">
        <div class="spinner"></div>
    </div>-->
</template>

<style scoped>
canvas {
    height: 100%;
    width: 100%;
    position: absolute;
    left: 0;
    top: 0;
    background-color: rgb(26, 26, 26);
}

/*
.loader {
    position: absolute;
    top: 0pt;
    left: 0pt;
    width: 100%;
    height: 100%;
    background-color: #b0b0b0b0;
}

.loader .spinner {
    position: absolute;
    left: calc(50vw - 60px);
    top: calc(50vh - 60px);
    opacity: 1;
    border: 16px solid #5c5b5b;
    border-radius: 50%;
    border-top: 16px solid #e2932d;
    width: 120px;
    height: 120px;
    -webkit-animation: spin 2s linear infinite;
    animation: spin 2s linear infinite;
}

@keyframes spin {
    0% {
        transform: rotate(0deg);
    }

    100% {
        transform: rotate(360deg);
    }
} */
</style>
