
import { StructureRenderer } from '@webmc/render';
import { ResourceManager } from './ResourceManager'
import { mat4 , vec2, vec3 } from 'gl-matrix'
import { CompoundStructure } from "./CompoundStructure";
import { BlockState, Structure } from '@webmc/core';
import electron from 'electron';
import { clamp, clampVec3, negVec3 } from './util'
import { BBRenderer } from './BoundingBoxRenderer';
import { BoundingBox } from './BoundingBox';

//let viewDist = 4;
//let xRotation = 0.8;
//let yRotation = 0.5;
const cPos = vec3.create()
const cRot = vec2.fromValues(0.4, 0.6)
let cDist = 10

main();

async function main() {
  const canvas = document.querySelector('#demo') as HTMLCanvasElement;
  const gl = canvas.getContext('webgl');

  if (!gl) {
    throw new Error('Unable to initialize WebGL. Your browser or machine may not support it.')
  }

  let structure = new CompoundStructure()

/*  const exampleRes1 = await fetch('public/blueprint.nbt')
  const exampleData1 = await exampleRes1.arrayBuffer()
  const exampleNbt1 = readNbt(new Uint8Array(exampleData1))
  const structure1 = Structure.fromNbt(exampleNbt1.result)
  structure.addStructure(structure1, [0,0,0], Rotation.Rotate0)

  const exampleRes2 = await fetch('public/blueprint.nbt')
  const exampleData2 = await exampleRes2.arrayBuffer()
  const exampleNbt2 = readNbt(new Uint8Array(exampleData2))
  const structure2 = Structure.fromNbt(exampleNbt2.result)
  structure.addStructure(structure2, [6,0,0], Rotation.Rotate90)*/

  const resources = new ResourceManager()
  await resources.loadFromZip('public/assets.zip')

  const renderer = new StructureRenderer(gl, resources, resources, resources.getBlockAtlas(), structure)
  const bbRenderer = new BBRenderer(gl)

  let ownBB: BoundingBox
  let insideBB: BoundingBox | undefined
  let checkBBs: BoundingBox[]

  electron.ipcRenderer.on('structure-update', (event, message) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    message.elements.forEach((element: any) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      element.structure.palette = element.structure.palette.map((element: any) => {return Object.assign(new BlockState(""), element)})
      element.structure = Object.assign(new Structure([0,0,0], [], []), element.structure)

    });
//    console.log(message)
    structure = Object.assign(new CompoundStructure, message)
    refreshStructure()
    requestAnimationFrame(render)
  })

  function refreshStructure() {
    renderer.setStructure(structure)

    const bbs = structure.getDisplayBoundingBoxes()
    ownBB = bbs[0]
    insideBB = bbs[1]
    checkBBs = bbs[2]

    console.log(structure)
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

    /*
    yRotation = yRotation % (Math.PI * 2)
    xRotation = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, xRotation))
    viewDist = Math.max(1, Math.min(20, viewDist))

    const size = structure.getSize()
    const viewMatrix = mat4.create();
    mat4.translate(viewMatrix, viewMatrix, [0, 0, -viewDist]);
    mat4.rotate(viewMatrix, viewMatrix, xRotation, [1, 0, 0]);
    mat4.rotate(viewMatrix, viewMatrix, yRotation, [0, 1, 0]);
    mat4.translate(viewMatrix, viewMatrix, [-size[0] / 2, -size[1] / 2, -size[2] / 2]);*/

    const viewMatrix = getViewMatrix()

    //renderer.drawGrid(viewMatrix);
    renderer.drawStructure(viewMatrix);


    bbRenderer.drawBB(viewMatrix, ownBB, 0)
    if (insideBB !== undefined)
      bbRenderer.drawBB(viewMatrix, insideBB, 1)
    checkBBs.forEach(bb => bbRenderer.drawBB(viewMatrix, bb, 2))

  }
  requestAnimationFrame(render);


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
        vec3.rotateY(cPos, cPos, [0, 0, 0], cRot[0])
        vec3.rotateX(cPos, cPos, [0, 0, 0], cRot[1])
        const d = vec3.fromValues(dx, -dy, 0)
        vec3.scale(d, d, 0.25 * cDist)
        vec3.add(cPos, cPos, d)
        vec3.rotateX(cPos, cPos, [0, 0, 0], -cRot[1])
        vec3.rotateY(cPos, cPos, [0, 0, 0], -cRot[0])
        clampVec3(cPos, negVec3(structure.getSize()), [0, 0, 0])
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
    cDist += evt.deltaY / 100
    cDist = Math.max(1, Math.min(100, cDist))
    render();
  })

  canvas.addEventListener('contextmenu', evt => {
    evt.preventDefault()
  })

  window.addEventListener('keyup', (evt:KeyboardEvent) => {
    if (evt.key === "ArrowLeft"){
      structure.prevStep()
      refreshStructure()
      requestAnimationFrame(render)
      } else if (evt.key === "ArrowRight"){
      structure.nextStep()
      refreshStructure()
      requestAnimationFrame(render)
      }
  } , true)


  window.addEventListener('resize', () => {
    if (resize()) {
      requestAnimationFrame(render);
    }
  })
}
