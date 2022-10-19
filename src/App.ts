
import { AnnotationRenderer, BlocksRenderer, Resources, StructureRenderer } from '@webmc/render';
import { ResourceManager } from './ResourceManager'
import { mat4 , vec2, vec3 } from 'gl-matrix'
import { Annotation, CompoundStructure, Rotation } from "./Structure/CompoundStructure";
import { Structure } from '@webmc/core';
import { clamp, clampVec3, negVec3 } from './util'
import { BBRenderer } from './Renderer/BoundingBoxRenderer';
import { BoundingBox } from './BoundingBox';
import { DatapackReaderZip } from './DatapackReader/DatapackReaderZip'
import { read as readNbt } from '@webmc/nbt'
import { DatapackReaderComposite } from './DatapackReader/DatapackReaderComposite';
import { StructureFeatureManger } from './StructureFeatureManager';
import { DatapackReaderDirectory } from './DatapackReader/DatapackReaderDirectory';
import { TemplatePool } from './worldgen/TemplatePool';
import { Heightmap } from './Heightmap';
import { HeightmapRenderer } from './Renderer/HeightmapRenderer';
import { StructureFeature } from './worldgen/StructureFeature';

declare global {
  interface Window {
    showDirectoryPicker:any;
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

const MINECRAFT_VERSIONS: string[] = ["1_16", "1_17", "1_18", "1_19", "1_19_3"]

main();

async function main() {
  const urlParams = new URLSearchParams(window.location.search);
  //const version = "release"
  let mc_version = urlParams.get('version')
  if (!MINECRAFT_VERSIONS.includes(mc_version)){
    mc_version = '1_19'
  }

  const version_select = document.querySelector<HTMLSelectElement>('.sidebar select#version-select')
  version_select.selectedIndex = (MINECRAFT_VERSIONS.indexOf(mc_version))
  version_select.onchange = () => {
    window.open(`?version=${MINECRAFT_VERSIONS[version_select.selectedIndex]}`, '_self')
  }

  //document.querySelector('.sidebar .button#v1_16').classList.toggle("selected", mc_version === "1_16")
  //document.querySelector('.sidebar .button#v1_17').classList.toggle("selected", mc_version === "1_17")
  //document.querySelector('.sidebar .button#experimental').classList.toggle("selected", mc_version === "1_19_exp")

  const reader = new DatapackReaderComposite()
  const vanillaReader = await DatapackReaderZip.fromUrl("zips/data_" + mc_version + ".zip")
  reader.readers = [vanillaReader]

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

  const about_link = document.querySelector('.link#about')

  const heightmap_entries = document.querySelectorAll('.heightmap-selector li.item')

  const stepDisplay = document.querySelector('.ui .text#step')

  const openZipButton = document.querySelector('.sidebar .button#openzip')
  const openFolderButton = document.querySelector('.sidebar .button#openfolder')

  const selectHeightmapButton = document.querySelector('.sidebar .button#select-heightmap')

  const featuresList = document.querySelector('.sidebar .list#features')

  const infoPanel = document.querySelector('.info')
  const infoTempletePool = document.querySelector('.info #templete-pool')
  const infoFallbackFrom = document.querySelector('.info #fallback_from')
  const infoElement = document.querySelector('.info #element')
  const infoJointDiv = document.querySelector('.info #joint-div')
  const infoJoint = document.querySelector('.info #joint')
  const infoJointType = document.querySelector('.info #joint_type')
  const infoDepth = document.querySelector('.info #depth')

  const heightmapPanel = document.querySelector('.heightmap-selector')

  const popupPanel = document.querySelector('.popup')
  const popupClosingX = document.querySelector('.popup .closing_x')

  if (!gl) {
    throw new Error('Unable to initialize WebGL. Your browser or machine may not support it.')
  }

  var ext = gl.getExtension('OES_element_index_uint')
  if (!ext){
    throw new Error('Unable to load OES_element_index_uint wegbl extension. Your browser or machine may not support it.')
  }

  let structure = new CompoundStructure()

  const exampleRes1 = await fetch('example.nbt')
  const exampleData1 = await exampleRes1.arrayBuffer()
  const exampleNbt1 = readNbt(new Uint8Array(exampleData1))
  const structure1 = Structure.fromNbt(exampleNbt1.result)
  const annotation : Annotation = {
    check: [],
    inside: undefined,
    element: "{}",
    element_type: "",
    joint: undefined,
    joint_type: undefined,
    pool: "Welcome",
    fallback_from: undefined,
    depth: 0
  }
  structure.addStructure(structure1, [0,65,0], Rotation.Rotate0, annotation)
  structure.setStartingY(64)

  var heightmap = await Heightmap.fromImage("heightmaps/flat.png")

  const renderer = new StructureRenderer(gl)

  const resourcesObject : Resources = {
    blockAtlas: resources.getBlockAtlas(), 
    blockDefinitions: resources,
    blockModels: resources,
    blockProperties: resources
  }

  const renderedTypes = new Set(['entity', 'feature'])

  renderer.addRenderer(new BlocksRenderer(gl, structure, resourcesObject, chunkSize))

  const annotationRenderer = new AnnotationRenderer(gl, structure, resourcesObject)
  annotationRenderer.setRenderedTypes(Array.from(renderedTypes))
  renderer.addRenderer(annotationRenderer)

  const heightmapRenderer = new HeightmapRenderer(gl, structure, resourcesObject, heightmap)

  renderer.addRenderer(heightmapRenderer)

  const bbRenderer = new BBRenderer(gl)

  let drawBB = true

  let ownBB: BoundingBox
  let insideBB: BoundingBox | undefined
  let checkBBs: BoundingBox[]

  refreshDatapacks()
  refreshStructure()
  hideLoader()

  function showLoader(){
    loader.classList.remove("hidden")
  }

  function hideLoader(){
    loader.classList.add("hidden")
  }


  async function refreshDatapacks() {
    TemplatePool.reload()
    featuresList.innerHTML = ""
    const features = await StructureFeature.getAll(reader, LEGACY_MINECRAFT_VERSIONS.includes(mc_version) ? "legacy" : EXPERIMENTAL_MINECRAFT_VERSIONS.includes(mc_version) ? "exp" : "default" )
    features.forEach(feature => {
      const node = document.createElement("LI");
      const textnode = document.createTextNode(feature.getIdentifier());
      node.appendChild(textnode);
      node.classList.add("item")
      node.setAttribute("title", feature.getIdentifier())

      node.onclick = async () => {
        try{
          showLoader()
          const sfm = StructureFeatureManger.fromStructureFeature(reader, feature, heightmap)
          await sfm.generate()
          structure = sfm.getWorld()
          structure.lastStep()
          renderer.setStructure(structure)
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
      renderer.updateAll(bb?.getAffectedChunks(chunkSize))

    const step = structure.getStep()

    const bbs = structure.getBoundingBoxes(step - 1)
    ownBB = bbs[0]
    insideBB = bbs[1]
    checkBBs = bbs[2]

    const maxSteps = structure.getStepCount()

    nav_buttons.first.classList.toggle("enabled", step > 1)
    nav_buttons.prev.classList.toggle("enabled", step > 1)
    nav_buttons.next.classList.toggle("enabled", step < maxSteps)
    nav_buttons.last.classList.toggle("enabled", step < maxSteps)

    stepDisplay.innerHTML = step + " / " + maxSteps

    const annotation = structure.getAnnotation(step - 1)

    infoTempletePool.innerHTML = annotation.pool
    infoFallbackFrom.innerHTML = annotation.fallback_from ? "Fallback from " + annotation.fallback_from : ""
    infoElement.innerHTML = annotation.element
    if (annotation.joint){
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
      bbRenderer.setViewport(0, 0, canvas.width, canvas.height)
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
    renderer.drawAll(viewMatrix);

    if (drawBB){
      checkBBs.forEach(bb => bbRenderer.drawBB(viewMatrix, bb, 2))
      bbRenderer.drawBB(viewMatrix, insideBB, 1)
      bbRenderer.drawBB(viewMatrix, ownBB, 0)
    }
  }
  requestAnimationFrame(render);

  /**
   * Camera controlls
   */

  //let dragTime: number
  let dragPos: [number, number] | null = null
  let dragButton: number
  canvas.addEventListener('mousedown', (evt:MouseEvent ) => {
    dragPos = [evt.clientX, evt.clientY]
    dragButton = evt.button
  })

  canvas.addEventListener('mousemove', (evt:MouseEvent ) => {
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

  canvas.addEventListener('touchstart', (evt:TouchEvent) => {
    touchPos = [evt.touches[0].clientX, evt.touches[0].clientY]
    if (evt.touches.length > 1){
      touchStartDistance = Math.sqrt(Math.pow(evt.touches[0].clientX - evt.touches[1].clientX, 2) + Math.pow(evt.touches[0].clientY - evt.touches[1].clientY, 2))
      touchStartCDist = cDist
    }
  })

  canvas.addEventListener('touchmove', (evt:TouchEvent) => {
    if (touchPos){
      const dx = (evt.touches[0].clientX - touchPos[0]) / 100
      const dy = (evt.touches[0].clientY - touchPos[1]) / 100

      if (evt.touches.length === 1){
        rotateCamera(dx, dy)
      } else if (evt.touches.length > 1){
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

  canvas.addEventListener('touchend', (evt:TouchEvent) => {
    touchPos = null
  })

  canvas.addEventListener('touchcancel', (evt:TouchEvent) => {
    touchPos = null
  })


  function rotateCamera(dx: number, dy: number){
    vec2.add(cRot, cRot, [dx, dy])
    cRot[0] = cRot[0] % (Math.PI * 2)
    cRot[1] = clamp(cRot[1], -Math.PI / 2, Math.PI / 2)
  }

  function moveCamera(dx: number, dy: number){
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

  canvas.addEventListener('wheel', (evt:WheelEvent ) => {
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
      if (input.files.length===0){
        alert("No file selected")
      }
      if (!input.files[0].name.toLowerCase().endsWith('.zip')){
        alert("Please select a .zip file")
      }

      reader.readers = [vanillaReader, await DatapackReaderZip.fromFile(input.files[0])]
      refreshDatapacks()
    }
    input.click()
  })

  openFolderButton.addEventListener('click', async () => {
    const input:any = document.createElement('input')
    input.type = 'file'
    input.webkitdirectory = true

    input.onchange = async () => {
      reader.readers = [vanillaReader, await DatapackReaderDirectory.fromFileList(Array.from(input.files))]
      refreshDatapacks()
    }
    input.click()
  })

  /**
   * Timeline buttons and keypresses
   */

  function next() {
    structure.nextStep()
    refreshStructure(structure.getBoundingBoxes(structure.getStep()-1)[0])
    requestAnimationFrame(render)
  }

  function prev() {
    const bb = structure.getBoundingBoxes(structure.getStep()-1)[0]
    structure.prevStep()
    refreshStructure(bb)
    requestAnimationFrame(render)
  }


  nav_buttons.first.addEventListener("click", async () => {
    structure.firstStep()
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
    structure.lastStep()
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

    if (enabled){
      infoPanel.classList.add("hidden")
    } else {
      infoPanel.classList.toggle("hidden", !setting_buttons.info.classList.contains("selected"))
    }
  })

  setting_buttons.icon_empty.addEventListener("click", async () => {
    const shown = toggleRenderedType("empty")
    structure.setStepElementType("minecraft:empty_pool_element", shown)
    setting_buttons.icon_empty.classList.toggle("selected", shown)
  })

  setting_buttons.icon_feature.addEventListener("click", async () => {
    const shown = toggleRenderedType("feature")
    structure.setStepElementType("minecraft:feature_pool_element", shown)
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

  about_link.addEventListener("click", () => {
    popupPanel.classList.remove("hidden")
  })

  popupClosingX.addEventListener("click", () => {
    popupPanel.classList.add("hidden")
  })

  function toggleRenderedType(type: string): boolean{
    const has = renderedTypes.has(type)
    if (has){
      renderedTypes.delete(type)
    } else {
      renderedTypes.add(type)
    }
    annotationRenderer.setRenderedTypes(Array.from(renderedTypes))
    requestAnimationFrame(render)
    return !has
  }

  heightmap_entries.forEach(entry => entry.addEventListener("click", async () => {
    if (entry.id  === "upload"){
      console.warn("Upload not yet implemented")
    } else {
      console.debug("Loading Heightmap " + entry.id)
      heightmap = await Heightmap.fromImage("heightmaps/" + entry.id + ".png")
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

  window.addEventListener('keyup', async (evt:KeyboardEvent) => {
    if (evt.key === "ArrowLeft"){
      prev()
    } else if (evt.key === "ArrowRight"){
      next()
    }
  } , true)


  window.addEventListener('resize', () => {
    if (resize()) {
      requestAnimationFrame(render);
    }
  })
}
