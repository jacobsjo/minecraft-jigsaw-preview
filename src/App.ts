
import { StructureRenderer } from '@webmc/render';
import { ResourceManager } from './ResourceManager'
import { mat4 , vec2, vec3 } from 'gl-matrix'
import { Annotation, CompoundStructure, Rotation } from "./Structure/CompoundStructure";
import { BlockState, Structure } from '@webmc/core';
import { clamp, clampVec3, negVec3 } from './util'
import { BBRenderer } from './BoundingBoxRenderer';
import { BoundingBox } from './BoundingBox';
import { DatapackReaderZip } from './DatapackReader/DatapackReaderZip'
import { read as readNbt } from '@webmc/nbt'
import { ConfiguedStructureFeature } from './worldgen/ConfiguredStructureFeature';
import { DatapackReaderComposite } from './DatapackReader/DatapackReaderComposite';
import { StructureFeatureManger } from './StructureFeatureManager';
import { DatapackReaderDirectory } from './DatapackReader/DatapackReaderDirectory';
import { TemplatePool } from './worldgen/TemplatePool';

declare global {
  interface Window {
    showDirectoryPicker:any;
  }
}

const chunkSize = 8

//let viewDist = 4;
//let xRotation = 0.8;
//let yRotation = 0.5;
const cPos = vec3.create()
const cRot = vec2.fromValues(0.4, 0.6)
let cDist = 10

main();

async function main() {
  const urlParams = new URLSearchParams(window.location.search);
  const version = "release"
  //const version = urlParams.get('version') === "snapshot" ? "snapshot" : "release"

  const reader = new DatapackReaderComposite()
  const vanillaReader = await DatapackReaderZip.fromUrl("vanilla_jigsaw_" + version + ".zip")
  reader.readers = [vanillaReader]

  const resources = new ResourceManager()
  await resources.loadFromZip("/assets_" + version + ".zip")

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
  }

  const stepDisplay = document.querySelector('.ui .text#step')

  const openZipButton = document.querySelector('.sidebar .button#openzip')
  const openFolderButton = document.querySelector('.sidebar .button#openfolder')

  const featuresList = document.querySelector('.sidebar .list#features')

  const infoPanel = document.querySelector('.info')
  const infoTempletePool = document.querySelector('.info #templete-pool')
  const infoFallbackFrom = document.querySelector('.info #fallback_from')
  const infoElement = document.querySelector('.info #element')
  const infoJointDiv = document.querySelector('.info #joint-div')
  const infoJoint = document.querySelector('.info #joint')
  const infoJointType = document.querySelector('.info #joint_type')
  const infoDepth = document.querySelector('.info #depth')

  if (!gl) {
    throw new Error('Unable to initialize WebGL. Your browser or machine may not support it.')
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
    joint: undefined,
    joint_type: undefined,
    pool: "Welcome",
    fallback_from: undefined,
    depth: 0
  }
  structure.addStructure(structure1, [0,0,0], Rotation.Rotate0, annotation)

  const renderer = new StructureRenderer(gl, structure, {
    blockDefinitions: resources,
    blockModels: resources,
    blockAtlas: resources.getBlockAtlas(),
    blockProperties: resources
  }, {
    chunkSize: chunkSize,
    useInvisibleBlockBuffer: false
  })
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
    const features = await ConfiguedStructureFeature.getAll(reader)
    console.log(features)
    features.forEach(feature => {
      const node = document.createElement("LI");
      const textnode = document.createTextNode(feature.toString());
      node.appendChild(textnode);
      node.setAttribute("title", feature.toString())

      node.onclick = async () => {
        try{
          showLoader()
          const sfm = StructureFeatureManger.fromConfiguredStructureFeature(reader, feature)
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
      renderer.updateStructureBuffers(bb?.getAffectedChunks(chunkSize))

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
    renderer.drawStructure(viewMatrix);

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
    //dragTime = Date.now()
    dragPos = [evt.clientX, evt.clientY]
    dragButton = evt.button
  })
  canvas.addEventListener('mousemove', (evt:MouseEvent ) => {
    if (dragPos) {
      const dx = (evt.clientX - dragPos[0]) / 100
      const dy = (evt.clientY - dragPos[1]) / 100
      if (dragButton === 0) {
        vec2.add(cRot, cRot, [dx, dy])
        cRot[0] = cRot[0] % (Math.PI * 2)
        cRot[1] = clamp(cRot[1], -Math.PI / 2, Math.PI / 2)
      } else if (dragButton === 2) {
        const [min, max] = structure.getBounds()
        vec3.rotateY(cPos, cPos, [0, 0, 0], cRot[0])
        vec3.rotateX(cPos, cPos, [0, 0, 0], cRot[1])
        const d = vec3.fromValues(dx, -dy, 0)
        vec3.scale(d, d, 0.25 * cDist)
        vec3.add(cPos, cPos, d)
        vec3.rotateX(cPos, cPos, [0, 0, 0], -cRot[1])
        vec3.rotateY(cPos, cPos, [0, 0, 0], -cRot[0])
        clampVec3(cPos, negVec3(max), negVec3(min))
      } else {
        return
      }
      dragPos = [evt.clientX, evt.clientY]
      render();
    }
  })
  canvas.addEventListener('mouseup', () => {
    dragPos = null
//    if (Date.now() - dragTime < 200) {
//      if (dragButton === 0) {
//        selectBlock(evt.clientX, evt.clientY)
//      }
//    }
  })
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
  })

  setting_buttons.info.addEventListener("click", async () => {
    infoPanel.classList.toggle("hidden")
  })


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
