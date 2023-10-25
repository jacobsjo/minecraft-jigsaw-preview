
import { ResourceManager } from './ResourceManager'
import { mat4, vec2, vec3 } from 'gl-matrix'
import { PieceInfo, JigsawStructure } from "./Jigsaw/JigsawStructure";
import { clamp, clampVec3, negVec3 } from './Util/util'
import { BBRenderer } from './Renderer/BoundingBoxRenderer';
import { BoundingBox } from './Jigsaw/BoundingBox';
import { JigsawGenerator } from './Jigsaw/JigsawGenerator';
import { TemplatePool } from './worldgen/TemplatePool';
import { Heightmap } from './Heightmap/Heightmap';
import { HeightmapRenderer } from './Renderer/HeightmapRenderer';
import { StructureFeature } from './worldgen/StructureFeature';
import { CompositeDatapack, FileListDatapack, ZipDatapack } from 'mc-datapack-loader';
import { BlockPos, Identifier, NbtFile } from 'deepslate';
import { EntityAnnotatedStructure } from './Structure/EntityAnnotatedStructure';
import { AnnotationRenderer } from './Renderer/AnnotationRenderer';
import { ImageHeightmap } from './Heightmap/ImageHeightmap';
import { DisplayManager } from './UI/DisplayManager';
import { OffsetStructure } from './Structure/OffsetStructure';
import { StructureRenderer } from './Renderer/StructureRenderer';
import * as d3 from 'd3';

declare global {
  interface Window {
    showDirectoryPicker: any;
  }
}

const chunkSize = 8

//let viewDist = 4;
//let xRotation = 0.8;
//let yRotation = 0.5;
const cPos = vec3.fromValues(-1.5, -65, -1.5)
const cRot = vec2.fromValues(0.4, 0.6)
let cDist = 10

const LEGACY_MINECRAFT_VERSIONS: string[] = ["1_16", "1_17", "1_18"]
const EXPERIMENTAL_MINECRAFT_VERSIONS: string[] = []

const MINECRAFT_VERSIONS: string[] = ["1_16", "1_17", "1_18", "1_19", "1_20", "1_20_3"]

main();

async function main() {
  const urlParams = new URLSearchParams(window.location.search);
  //const version = "release"
  let mc_version = urlParams.get('version')
  if (!MINECRAFT_VERSIONS.includes(mc_version)) {
    mc_version = '1_20'
  }

  const version_select = document.querySelector<HTMLSelectElement>('.sidebar select#version-select')
  version_select.selectedIndex = (MINECRAFT_VERSIONS.indexOf(mc_version))
  version_select.onchange = () => {
    window.open(`?version=${MINECRAFT_VERSIONS[version_select.selectedIndex]}`, '_self')
  }

  //document.querySelector('.sidebar .button#v1_16').classList.toggle("selected", mc_version === "1_16")
  //document.querySelector('.sidebar .button#v1_17').classList.toggle("selected", mc_version === "1_17")
  //document.querySelector('.sidebar .button#experimental').classList.toggle("selected", mc_version === "1_19_exp")

  const vanillaDatapack = await ZipDatapack.fromUrl("zips/data_" + mc_version + ".zip")
  const compositeDatapack = new CompositeDatapack([vanillaDatapack])

  const resources = new ResourceManager()
  await resources.loadFromZip("/zips/assets_" + mc_version + ".zip")

  const canvas = document.querySelector('#render') as HTMLCanvasElement;
  const gl = canvas.getContext('webgl');

  const loader = document.querySelector('.loader')

  const nav_buttons = {
    first: document.querySelector('.ui .button#first'),
    prev: document.querySelector('.ui .button#prev'),
    next: document.querySelector('.ui .button#next'),
    last: document.querySelector('.ui .button#last'),
  }


  const setting_buttons = {
    bb: document.querySelector('.button#bb'),
    info: document.querySelector('.button#info'),
    heightmap: document.querySelector('.button#heightmap'),
    icon_empty: document.querySelector('.button#icon-empty'),
    icon_feature: document.querySelector('.button#icon-feature'),
    icon_entity: document.querySelector('.button#icon-entity'),
    //download: document.querySelector('.button#download-image'),
  }

  const heightmap_entries = document.querySelectorAll('.heightmap-selector li.item')

  const stepDisplay = document.querySelector('.ui .text#step')

  const openZipButton = document.querySelector('.sidebar .button#openzip')
  const openFolderButton = document.querySelector('.sidebar .button#openfolder')

  const selectHeightmapButton = document.querySelector('.sidebar .button#select-heightmap')

  const featuresList = document.querySelector('.sidebar .list#features')

  const infoPanel = document.querySelector('.info')
  const infoTempletePool = document.querySelector('.info #templete-pool')
  const infoFallbackFrom = document.querySelector('.info #fallback_from')
  const infoAliasedFrom = document.querySelector('.info #aliased_from')
  const infoElement = document.querySelector('.info #element')
  const infoJointDiv = document.querySelector('.info #joint-div')
  const infoJoint = document.querySelector('.info #joint')
  const infoJointType = document.querySelector('.info #joint_type')
  const infoDepth = document.querySelector('.info #depth')

  const heightmapPanel = document.querySelector('.heightmap-selector')

  if (!gl) {
    throw new Error('Unable to initialize WebGL. Your browser or machine may not support it.')
  }

  var ext = gl.getExtension('OES_element_index_uint')
  if (!ext) {
    throw new Error('Unable to load OES_element_index_uint wegbl extension. Your browser or machine may not support it.')
  }

  var structure = new JigsawStructure()
  var display = new DisplayManager(structure)

  const exampleRes1 = await fetch('example.nbt')
  const exampleData1 = await exampleRes1.arrayBuffer()
  const exampleNbt1 = NbtFile.read(new Uint8Array(exampleData1))
  const structure1 = EntityAnnotatedStructure.fromNbt(exampleNbt1.root)
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
    jigsaw_pos: undefined
  }
  structure.addPiece(structure1, [0, 65, 0], pieceInfo, [])
  structure.setStartingY(64)

  var heightmap = await ImageHeightmap.fromImage("heightmaps/flat.png")


  const renderer = new StructureRenderer(gl, structure, resources)
  const failedRenderer = new StructureRenderer(gl, structure, resources)

  const renderedTypes = new Set(['entity', 'feature'])

  const annotationRenderer = new AnnotationRenderer(gl, structure, resources)
  annotationRenderer.setRenderedTypes(Array.from(renderedTypes))

  const heightmapRenderer = new HeightmapRenderer(gl, heightmap)
  const bbRenderer = new BBRenderer(gl)

  let drawBB = true

  let ownBB: BoundingBox
  let insideBB: BoundingBox | undefined
  let checkBBs: BoundingBox[]
  let jigsawPos: BlockPos

  refreshDatapacks()
  refreshStructure()
  hideLoader()

  function showLoader() {
    loader.classList.remove("hidden")
  }

  function hideLoader() {
    loader.classList.add("hidden")
  }


  async function refreshDatapacks() {
    TemplatePool.reload()
    featuresList.innerHTML = ""
    const features = await StructureFeature.getAll(compositeDatapack, LEGACY_MINECRAFT_VERSIONS.includes(mc_version) ? "legacy" : EXPERIMENTAL_MINECRAFT_VERSIONS.includes(mc_version) ? "exp" : "default")
    features.forEach(feature => {
      const node = document.createElement("LI");
      const textnode = document.createTextNode(feature.getIdentifier().toString());
      node.appendChild(textnode);
      node.classList.add("item")
      node.setAttribute("title", feature.getIdentifier().toString())

      node.onclick = async () => {
        try {
          showLoader()
          const sfm = JigsawGenerator.fromStructureFeature(compositeDatapack, feature, heightmap)
          await sfm.generate()
          structure = sfm.getWorld()
          display = new DisplayManager(structure)

          display.lastStep()
          renderer.setStructure(structure)
          annotationRenderer.setStructure(structure)
          refreshStructure(null)
          requestAnimationFrame(render);
        } catch (e) {
          console.error(e)
          alert(e)
        } finally {
          hideLoader()
        }
      }

      featuresList.appendChild(node);
    })
  }

  function refreshStructure(bb?: BoundingBox) {
    if (bb !== null)
      renderer.updateStructureBuffers(bb?.getAffectedChunks(chunkSize))

    annotationRenderer.update()

    const step = display.getStep()
    const failing_step = display.getFailedStep()

    const bbs = structure.getBoundingBoxes(step - 1)
    ownBB = bbs[0]
    insideBB = bbs[1]
    checkBBs = bbs[2]
    jigsawPos = structure.getPiece(step - 1).pieceInfo.jigsaw_pos


    const maxSteps = structure.getStepCount()

    nav_buttons.first.classList.toggle("enabled", step > 1)
    nav_buttons.prev.classList.toggle("enabled", step > 1)
    nav_buttons.next.classList.toggle("enabled", step < maxSteps)
    nav_buttons.last.classList.toggle("enabled", step < maxSteps)

    const failedPieceLi = d3.select("ui.list#failed")
      .selectAll("li")
      .data(structure.getPiece(step - 1).failedPieces.map((d, nr) => {return {name: d.name, nr: nr}}))

    failedPieceLi
      .join("li")
      .classed("item", true)
      .text(d => d.name)
      .on("click", (evt, d) => {
        display.toggleFailedStep(d.nr)
        const bb = structure.getBoundingBoxes(display.getStep() - 1)[0]
        if (display.getFailedStep() >= 0){
          failedRenderer.setStructure(structure.getPiece(display.getStep() - 1).failedPieces[display.getFailedStep()].piece)
        }
        refreshStructure(bb)
        requestAnimationFrame(render)
      })
      .classed("selected", d => d.nr === display.getFailedStep())

    failedPieceLi
      .exit()
      .remove()

    d3.select("#failedLabel").classed("hidden", structure.getPiece(step - 1).failedPieces.length === 0)

    stepDisplay.innerHTML = step + " / " + maxSteps

    const annotation = structure.getPiece(step - 1).pieceInfo

    infoTempletePool.innerHTML = annotation.pool.toString()
    infoFallbackFrom.innerHTML = annotation.fallback_from ? "Fallback from " + annotation.fallback_from : ""
    infoAliasedFrom.innerHTML = annotation.aliased_from ? "Aliased from " + annotation.aliased_from : ""
    infoElement.innerHTML = annotation.element
    if (annotation.joint) {
      infoJoint.innerHTML = annotation.joint
      infoJointType.innerHTML = annotation.joint_type ? "(" + annotation.joint_type + ")" : ""
      infoJointDiv.classList.remove('hidden')
    } else {
      infoJointDiv.classList.add('hidden')
    }
    infoDepth.innerHTML = annotation.depth.toString()
  }

  function resize() {
    const displayWidth = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;

    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
      canvas.width = displayWidth;
      canvas.height = displayHeight;

      renderer.setViewport(0, 0, canvas.width, canvas.height)
      failedRenderer.setViewport(0, 0, canvas.width, canvas.height)
      bbRenderer.setViewport(0, 0, canvas.width, canvas.height)
      annotationRenderer.setViewport(0, 0, canvas.width, canvas.height)
      heightmapRenderer.setViewport(0, 0, canvas.width, canvas.height)
      return true
    }
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
    resize()

    const viewMatrix = getViewMatrix()

    //renderer.drawGrid(viewMatrix);
    renderer.drawStructure(viewMatrix);
    //console.log(structure.getPiece(display.getStep()-1).failedPieces)
    if (display.getFailedStep() >= 0){
      failedRenderer.drawTintedStructure(viewMatrix)
    }

    if (drawBB) {
      checkBBs.forEach(bb => bbRenderer.drawBB(viewMatrix, bb, 2))
      bbRenderer.drawBB(viewMatrix, insideBB, 1)
      if (display.getFailedStep() >= 0){
        const failedPiece = structure.getPiece(display.getStep() - 1).failedPieces[display.getFailedStep()].piece as OffsetStructure
        bbRenderer.drawBB(viewMatrix, new BoundingBox(failedPiece.getOffset(), failedPiece.getSize()), 0)
      } else {
        bbRenderer.drawBB(viewMatrix, ownBB, 0)
      }
      if (jigsawPos){
        bbRenderer.drawBB(viewMatrix, new BoundingBox(jigsawPos, [1,1,1]), 3, 3)
      }
    }

    annotationRenderer.draw(viewMatrix)
    heightmapRenderer.draw(viewMatrix)
  }
  requestAnimationFrame(render);

  /**
   * Camera controlls
   */

  //let dragTime: number
  let dragPos: [number, number] | null = null
  let dragButton: number
  canvas.addEventListener('mousedown', (evt: MouseEvent) => {
    dragPos = [evt.clientX, evt.clientY]
    dragButton = evt.button
  })

  canvas.addEventListener('mousemove', (evt: MouseEvent) => {
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
      render();
    }
  })

  canvas.addEventListener('mouseup', () => {
    dragPos = null
  })

  let touchPos: [number, number] | null = null
  let touchStartDistance: number | null = null
  let touchStartCDist: number | null = null

  canvas.addEventListener('touchstart', (evt: TouchEvent) => {
    touchPos = [evt.touches[0].clientX, evt.touches[0].clientY]
    if (evt.touches.length > 1) {
      touchStartDistance = Math.sqrt(Math.pow(evt.touches[0].clientX - evt.touches[1].clientX, 2) + Math.pow(evt.touches[0].clientY - evt.touches[1].clientY, 2))
      touchStartCDist = cDist
    }
  })

  canvas.addEventListener('touchmove', (evt: TouchEvent) => {
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
      render();
    }
  })

  canvas.addEventListener('touchend', (evt: TouchEvent) => {
    touchPos = null
  })

  canvas.addEventListener('touchcancel', (evt: TouchEvent) => {
    touchPos = null
  })


  function rotateCamera(dx: number, dy: number) {
    vec2.add(cRot, cRot, [dx, dy])
    cRot[0] = cRot[0] % (Math.PI * 2)
    cRot[1] = clamp(cRot[1], -Math.PI / 2, Math.PI / 2)
  }

  function moveCamera(dx: number, dy: number) {
    const [min, max] = structure.getBounds()
    vec3.rotateY(cPos, cPos, [0, 0, 0], cRot[0])
    vec3.rotateX(cPos, cPos, [0, 0, 0], cRot[1])
    const d = vec3.fromValues(dx, -dy, 0)
    vec3.scale(d, d, 0.25 * cDist)
    vec3.add(cPos, cPos, d)
    vec3.rotateX(cPos, cPos, [0, 0, 0], -cRot[1])
    vec3.rotateY(cPos, cPos, [0, 0, 0], -cRot[0])
    clampVec3(cPos, negVec3(max), negVec3(min))
  }

  canvas.addEventListener('wheel', (evt: WheelEvent) => {
    cDist += evt.deltaY > 0 ? 1 : -1
    cDist = Math.max(5, Math.min(100, cDist))
    render();
  })

  canvas.addEventListener('contextmenu', evt => {
    evt.preventDefault()
  })

  /**
   * Open buttons
   */

  openZipButton.addEventListener('click', async () => {
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

      compositeDatapack.readers = [vanillaDatapack, await ZipDatapack.fromFile(input.files[0])]
      refreshDatapacks()
    }
    input.click()
  })

  openFolderButton.addEventListener('click', async () => {
    const input: any = document.createElement('input')
    input.type = 'file'
    input.webkitdirectory = true

    input.onchange = async () => {
      compositeDatapack.readers = [vanillaDatapack, new FileListDatapack(Array.from(input.files))]
      refreshDatapacks()
    }
    input.click()
  })

  /**
   * Timeline buttons and keypresses
   */

  function next() {

    if (display.getFailedStep() >= 0){
      display.successfullStep()
      const bb = structure.getBoundingBoxes(display.getStep() - 1)[0]
      refreshStructure(bb)
    }

    display.nextStep()

    const bb = structure.getBoundingBoxes(display.getStep() - 1)[0]
    refreshStructure(bb)
    requestAnimationFrame(render)
  }

  function prev() {
    const bb = structure.getBoundingBoxes(display.getStep() - 1)[0]
    display.prevStep()
    refreshStructure(bb)
    requestAnimationFrame(render)
  }


  nav_buttons.first.addEventListener("click", async () => {
    display.firstStep()
    refreshStructure()
    requestAnimationFrame(render)
  })

  nav_buttons.prev.addEventListener("click", async () => {
    prev()
  })

  nav_buttons.next.addEventListener("click", async () => {
    next()
  })

  nav_buttons.last.addEventListener("click", async () => {
    display.lastStep()
    refreshStructure()
    requestAnimationFrame(render)
  })


  setting_buttons.bb.addEventListener("click", async () => {
    drawBB = !drawBB
    requestAnimationFrame(render)
    setting_buttons.bb.classList.toggle("selected", drawBB)
  })

  setting_buttons.info.addEventListener("click", async () => {
    const shown = setting_buttons.info.classList.toggle("selected")
    if (!selectHeightmapButton.classList.contains("selected"))
      infoPanel.classList.toggle("hidden", !shown)
  })

  setting_buttons.heightmap.addEventListener("click", async () => {
    const shown = heightmapRenderer.toggleRendering()
    requestAnimationFrame(render)
    setting_buttons.heightmap.classList.toggle("selected", shown)
  })

  selectHeightmapButton.addEventListener('click', () => {

    const enabled = selectHeightmapButton.classList.toggle("selected")
    heightmapPanel.classList.toggle("hidden", !enabled)

    if (enabled) {
      infoPanel.classList.add("hidden")
    } else {
      infoPanel.classList.toggle("hidden", !setting_buttons.info.classList.contains("selected"))
    }
  })

  setting_buttons.icon_empty.addEventListener("click", async () => {
    const shown = toggleRenderedType("empty")
    display.setStepElementType("minecraft:empty_pool_element", shown)
    setting_buttons.icon_empty.classList.toggle("selected", shown)
  })

  setting_buttons.icon_feature.addEventListener("click", async () => {
    const shown = toggleRenderedType("feature")
    display.setStepElementType("minecraft:feature_pool_element", shown)
    setting_buttons.icon_feature.classList.toggle("selected", shown)
  })

  setting_buttons.icon_entity.addEventListener("click", async () => {
    const shown = toggleRenderedType("entity")
    setting_buttons.icon_entity.classList.toggle("selected", shown)
  })

  /*
  setting_buttons.download.addEventListener("click", async () => {
    render();
    var link = document.createElement('a');
    link.download = 'image.png';
    link.href = canvas.toDataURL()
    link.click();
  })*/

  function toggleRenderedType(type: string): boolean {
    const has = renderedTypes.has(type)
    if (has) {
      renderedTypes.delete(type)
    } else {
      renderedTypes.add(type)
    }
    annotationRenderer.setRenderedTypes(Array.from(renderedTypes))  //TODO
    requestAnimationFrame(render)
    return !has
  }

  heightmap_entries.forEach(entry => entry.addEventListener("click", async () => {
    if (entry.id === "upload") {
      console.warn("Upload not yet implemented")
    } else {
      console.debug("Loading Heightmap " + entry.id)
      heightmap = await ImageHeightmap.fromImage("heightmaps/" + entry.id + ".png")
      heightmapRenderer.setHeightmap(heightmap)
      heightmapRenderer.toggleRendering(true)
      setting_buttons.heightmap.classList.toggle("selected", true)
      heightmap_entries.forEach(e => e.classList.toggle("selected", e.id === entry.id))
      heightmapPanel.classList.add("hidden")

      infoPanel.classList.toggle("hidden", !setting_buttons.info.classList.contains("selected"))
      selectHeightmapButton.classList.remove("selected")

      requestAnimationFrame(render)
    }
  }))

  window.addEventListener('keyup', async (evt: KeyboardEvent) => {
    if (evt.key === "ArrowLeft") {
      prev()
    } else if (evt.key === "ArrowRight") {
      next()
    }
  }, true)


  window.addEventListener('resize', () => {
    if (resize()) {
      requestAnimationFrame(render);
    }
  })
}
