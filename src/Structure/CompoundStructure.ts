//import { NamedNbtTag, NbtTag, getTag, getListTag, getOptional } from "@webmc/nbt";
import { BlockNbt, BlockPos, BlockState, StructureProvider, Structure} from "@webmc/core";
import { read as readNbt } from '@webmc/nbt'
import { files } from "jszip";
import * as path from 'path';
//import fs from 'fs';
import {BoundingBox} from "../BoundingBox"

export enum Rotation {
  Rotate0 = 0,
  Rotate90 = 1,
  Rotate180 = 2,
  Rotate270 = 3,
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Rotation {
  export function getFacingMapping(rot: Rotation): {[name: string]: string}{
    switch (rot) {
      case Rotation.Rotate0:
        return {
          "north": "north",
          "east": "east",
          "south": "south",
          "west": "west",
          "up": "up",
          "down": "down",
          "ascending": "ascending"  // ascending: hack to allow easy use of facing mapping with rails
        }
      case Rotation.Rotate270:
        return {
          "north": "west",
          "east": "north",
          "south": "east",
          "west": "south",
          "up": "up",
          "down": "down",
          "ascending": "ascending"
        }
      case Rotation.Rotate180:
        return {
          "north": "south",
          "east": "west",
          "south": "north",
          "west": "east",
          "up": "up",
          "down": "down",
          "ascending": "ascending"
        }
    case Rotation.Rotate90:
      return {
        "north": "east",
        "east": "south",
        "south": "west",
        "west": "north",
        "up": "up",
        "down": "down",
        "ascending": "ascending"
    }
    }
  }  
}

export type Annotation = {
  check: number[],
  inside: number | undefined,

  pool: string | undefined,
  fallback_from: string | undefined,
  element: string | undefined,
  element_type: string | undefined,
  joint: string | undefined,
  joint_type: "alligned" | "rollable" | undefined,
  depth: number
}

type CompoundStructureElement = {
  structure: StructureProvider,
  pos: BlockPos,
  rot: Rotation,
  annotation: Annotation
}
 

export class CompoundStructure implements StructureProvider {

  private elements: CompoundStructureElement[] = []
  private minPos: BlockPos = [0,0,0]
  private maxPos: BlockPos = [0,0,0]

  private displayMaxStep = 1
  private stepElementTypes = new Set(['minecraft:single_pool_element', 'minecraft:list_pool_element', 'minecraft:feature_pool_element'])

  private bakedBlocksPerStructure: {
    pos: BlockPos;
    state: BlockState;
    nbt: BlockNbt;
  }[][] | undefined = undefined // first array: structure, second array: blocks in structure

  private bakedBlocks: {
    pos: BlockPos;
    state: BlockState;
    nbt: BlockNbt;
    maxStep: number;
  }[][] | undefined = undefined // first array: block pos, second array: blocks at block pos

  public setStepElementType(type: string, enabled: boolean){
    if (enabled)
      this.stepElementTypes.add(type)
    else
      this.stepElementTypes.delete(type)
  }

  public getBounds(): [BlockPos, BlockPos]{
    return [this.minPos, this.maxPos]
  }

  public nextStep(): void{
    do{
      this.displayMaxStep = Math.min(this.displayMaxStep+1, this.elements.length)
    } while (!this.stepElementTypes.has(this.elements[this.displayMaxStep-1].annotation.element_type) && this.displayMaxStep < this.elements.length)
  }

  public prevStep(): void{
    do{
      this.displayMaxStep = Math.max(this.displayMaxStep-1, 1)
    } while (!this.stepElementTypes.has(this.elements[this.displayMaxStep-1].annotation.element_type) && this.displayMaxStep > 1)
  }

  public firstStep(): void{
    this.displayMaxStep = 1 
//    this.cachedBlocks = undefined
  }

  public lastStep(): void{
    this.displayMaxStep = this.elements.length
//    this.cachedBlocks = undefined
  }

  public getStep(): number{
    return this.displayMaxStep
  }

  public getStepCount(): number{
    return this.elements.length
  }

  public getSize(): BlockPos {
    const [minPos, maxPos] = this.getBounds()
    return [maxPos[0] - minPos[0] + 1, maxPos[1] - minPos[1] + 1, maxPos[2] - minPos[2] + 1]
  }

  public static mapElementBlocks(element: { structure: StructureProvider; rot: Rotation; pos: number[]; }) : {
    pos: BlockPos;
    state: BlockState;
    nbt: BlockNbt;
}[]  {
    const size = element.structure.getSize()
    const blocks = element.structure.getBlocks()
    return blocks.map(block => {
      return {
        "pos": CompoundStructure.mapPos(element.rot, block.pos, element.pos, size),
        "state": CompoundStructure.getRotatedBlockState(block.state, element.rot),
        "nbt": block.nbt
      }
    });
  }

  public static mapPos(rot: Rotation, pos: BlockPos, offset: number[], size: BlockPos): BlockPos{
    const newPos : BlockPos = [offset[0],offset[1],offset[2]]
    switch (rot) {
      case Rotation.Rotate0:
        newPos[0] += pos[0]
        newPos[1] += pos[1]
        newPos[2] += pos[2]
        break
      case Rotation.Rotate90:
        newPos[0] += size[2] - 1 - pos[2]
        newPos[1] += pos[1]
        newPos[2] += pos[0]
        break
      case Rotation.Rotate180:
        newPos[0] += size[0] - 1 - pos[0]
        newPos[1] += pos[1]
        newPos[2] += size[2] - 1 - pos[2]
        break
      case Rotation.Rotate270:
        newPos[0] += pos[2]
        newPos[1] += pos[1]
        newPos[2] += size[0] - 1 - pos[0]
        break
    } 
    return newPos
  }

  public static inverseMapPos(rot: Rotation, pos: BlockPos, offset: number[], size: BlockPos): BlockPos{
    const invRot = [0,3,2,1][rot]
    const newSize : BlockPos = [size[0], size[1], size[2]]
    if (rot === Rotation.Rotate90 || rot === Rotation.Rotate270){
      newSize[0] = size[2]
      newSize[2] = size[0]
    }
    const newPos: BlockPos = [pos[0] - offset[0], pos[1] - offset[1], pos[2] - offset[2]]
    return this.mapPos(invRot, newPos, [0, 0, 0], newSize)
  }

  public getBB(nr: number | undefined) : BoundingBox{
    if (nr === undefined){
      return new BoundingBox([-80,-80,-80], [162, 162, 162])
    }

    return CompoundStructure.getBBFromElement(this.elements[nr])
  }

  public static getBBFromElement(element: CompoundStructureElement) : BoundingBox {
    const size =  element.structure.getSize()
    const newSize : BlockPos = [size[0], size[1], size[2]]
    if (element.rot === Rotation.Rotate90 || element.rot === Rotation.Rotate270){
      newSize[0] = size[2]
      newSize[2] = size[0]
    }

    const min: BlockPos = [element.pos[0], element.pos[1], element.pos[2]]
    return new BoundingBox(min, newSize)
  }

  /**
   * more efficient than getBBFromElemenent.isInside
   * @param element
   */
  public static isInsideBBFromElement(element: CompoundStructureElement, pos: BlockPos) : boolean {
    const size =  element.structure.getSize()

    if (element.rot === Rotation.Rotate0 || element.rot === Rotation.Rotate180){
      return pos[0] >= element.pos[0] && pos[0] < element.pos[0] + size[0] &&
             pos[1] >= element.pos[1] && pos[1] < element.pos[1] + size[1]  &&
             pos[2] >= element.pos[2] && pos[2] < element.pos[2] + size[2] 
    } else {
      return pos[0] >= element.pos[0] && pos[0] < element.pos[0] + size[2] &&
             pos[1] >= element.pos[1] && pos[1] < element.pos[1] + size[1]  &&
             pos[2] >= element.pos[2] && pos[2] < element.pos[2] + size[0] 
    }
  }

  public getElementBlocks(nr: number) : {
    pos: BlockPos;
    state: BlockState;
    nbt: BlockNbt;
  }[]{
    return CompoundStructure.mapElementBlocks(this.elements[nr])
  }

  public getBoundingBoxes(i: number): [BoundingBox, BoundingBox | undefined, BoundingBox[]]{
    const ownBB = this.getBB(i)

    const inside = this.elements[i].annotation.inside
    const insideBB = this.getBB(inside)

    const check = this.elements[i].annotation.check
    const checkBBs = check.map(c => this.getBB(c))

    return [ownBB, insideBB, checkBBs]
  }

  public getAnnotation(i: number){
    return this.elements[i].annotation
  }

  public bakeBlocks() : void{
    this.bakedBlocksPerStructure = this.elements.map(CompoundStructure.mapElementBlocks)

    this.bakedBlocks = []
    this.bakedBlocksPerStructure.forEach((blocks, id) => {
      blocks.forEach(b => {
        const block = {
          pos: b.pos,
          state: b.state,
          nbt: b.nbt,
          maxStep: id
        }
        const posIndex = (block.pos[0] + 80) * 162 * 162 + (block.pos[1] + 80) * 162 + (block.pos[2] + 80)
        if (this.bakedBlocks[posIndex] === undefined)
          this.bakedBlocks[posIndex] = [block]
        else
          this.bakedBlocks[posIndex].push(block)
      });
    });

  }

  public getBlocks() : {
    pos: BlockPos;
    state: BlockState;
    nbt: BlockNbt;
  }[] {
    if (!this.bakedBlocks)
      this.bakeBlocks()

    return this.bakedBlocksPerStructure.slice(0, this.displayMaxStep).flat()
//    return this.bakedBlocks.map(blocks => blocks[0]).filter(block => block != undefined)
//    return this.bakedBlocks.map(blocks => findLast(blocks, block => block.maxStep<this.displayMaxStep)).filter(block => block != undefined)
  }

  public getBlock(pos: BlockPos) : {
    pos: BlockPos;
    state: BlockState;
    nbt: BlockNbt;
  } {
    //search reverse to find inner blocks first
    if (!this.bakedBlocks)
      this.bakeBlocks()

    if (pos[0] < -80 || pos[1] < -80 || pos[2] < -80 || pos[0] > 81 || pos[1] > 81 || pos[2] > 81)
      return null
  
    const posIndex = (pos[0] + 80) * 162 * 162 + (pos[1] + 80) * 162 + (pos[2] + 80)
    return this.bakedBlocks[posIndex]?.slice().reverse().find(block => block.maxStep<this.displayMaxStep)
    /*
    const element = this.elements.slice(0, this.displayMaxStep).reverse()
      .find(element => CompoundStructure.isInsideBBFromElement(element,pos))
    return element?.structure.getBlock(CompoundStructure.inverseMapPos(element.rot, pos, element.pos, element.structure.getSize()))
    */

    /*
    for (let i=this.displayMaxStep-1 ; i>=0 ; i--){
      if (this.getBB(i).isInside(newPos)){
        const b = this.elements[i].structure.getBlock(CompoundStructure.inverseMapPos(this.elements[i].rot, newPos, this.elements[i].pos, this.elements[i].structure.getSize()))
        if (b && b.state.getName() !== "minecraft:air") return b
      }
    }
    
    return undefined*/

//    return this.getBlocks().find(b => b.pos[0] === pos[0] && b.pos[1] === pos[1] && b.pos[2] === pos[2])
  }

  public addStructure(structure: StructureProvider, pos: BlockPos, rot: Rotation, annotation: Annotation | undefined): number{

    const size = structure.getSize()
    const newSize : BlockPos = [size[0], size[1], size[2]]
    if (rot === Rotation.Rotate90 || rot === Rotation.Rotate270){
      newSize[0] = size[2]
      newSize[2] = size[0]
    }

    if (this.elements.length === 0){
      this.minPos[0] = pos[0]
      this.minPos[1] = pos[1]
      this.minPos[2] = pos[2]
      this.maxPos[0] = pos[0] + newSize[0] - 1
      this.maxPos[1] = pos[1] + newSize[1] - 1
      this.maxPos[2] = pos[2] + newSize[2] - 1
    } else {
      this.minPos[0] = Math.min(this.minPos[0], pos[0])
      this.minPos[1] = Math.min(this.minPos[1], pos[1])
      this.minPos[2] = Math.min(this.minPos[2], pos[2])

      this.maxPos[0] = Math.max(this.maxPos[0], pos[0] + newSize[0] - 1)
      this.maxPos[1] = Math.max(this.maxPos[1], pos[1] + newSize[1] - 1)
      this.maxPos[2] = Math.max(this.maxPos[2], pos[2] + newSize[2] - 1)
    }

//    this.displayMaxStep = this.elements.length - 1

    return this.elements.push({
      structure: structure,
      pos: pos,
      rot: rot,
      annotation: annotation
    }) - 1
  }

  private static getRotatedBlockState(state: BlockState, rot: Rotation): BlockState{
    const swapXZ : {[name: string]: string} = {'x': 'z', 'y': 'y', 'z': 'x'}
    
    const name: string = state.getName()
    const properties = Object.assign({}, state.getProperties())

    const facingMapping = Rotation.getFacingMapping(rot)
    
    //General Rotation of Blocks on an axis (logs etc.)
    if ('axis' in properties && (rot === Rotation.Rotate90 || rot === Rotation.Rotate270)){
      properties['axis'] = swapXZ[properties['axis']]
    }

    //General Facing of Most Blocks
    if ('facing' in properties){
      properties['facing'] = facingMapping[properties['facing']]
    }

    //Jigsaw orientations
    if ('orientation' in properties){
      const facings = properties['orientation'].split("_");
      properties['orientation'] = facingMapping[facings[0]] + "_" + facingMapping[facings[1]]
    }

    //Rotation of Signs and Banners
    if ('rotation' in properties){
      properties['rotation'] = properties['rotation'] + 4
    }

    //Rail shapes
    if (name.endsWith('rail') && 'shape' in properties){
      const facings = properties['shape'].split("_");
      let shape = facingMapping[facings[0]] + "_" + facingMapping[facings[1]]

      //fix wrong order
      switch (shape) {
        case "west_east":
          shape = "east_west"
          break;
        case "east_north":
          shape = "north_east"
          break;
        case "south_north":
          shape = "north_south"
          break;
        case "west_north":
          shape = "north_west"
          break;
        case "east_south":
          shape = "south_east"
          break;
        case "west_south":
          shape = "south_west"
          break;
      }
      properties['shape'] = shape
    }

    //Connections of Fences, Glass-Pains, Redstone etc.
    if ('east' in properties){
      const east = properties['east']
      const west = properties['west']
      const north = properties['north']
      const south = properties['south']

      properties[facingMapping['east']] = east
      properties[facingMapping['west']] = west
      properties[facingMapping['north']] = north
      properties[facingMapping['south']] = south
    }

    return new BlockState(state.getName(), properties)
  }

  public static async StructurefromName(reader: DatapackReader, id: string): Promise<Structure>{
    try{
      const [namespace, name] = id.split(":")
      const p = path.join('data', namespace, 'structures', name + ".nbt")
      const blob = await reader.readFileAsBlob(p)
      const nbt = readNbt(new Uint8Array(blob))
      return Structure.fromNbt(nbt.result)
    } catch (e) {
      if (e instanceof URIError)
        throw "Cound not load Structure " + id
      else if (e instanceof DOMException)
        throw "Permission error while loading Structure " + id + "\nTry reloading the datapack using the Open Datapack buttons"
    }
  }

  getAnnotations(): {pos: BlockPos, annotation: string; data: any; }[] {
    return this.elements.slice(0, this.displayMaxStep).flatMap(element => element.structure.getAnnotations().map(a => {
      const offsetPos = [a.pos[0]-0.5, a.pos[1], a.pos[2]-0.5] as BlockPos
      const mappedPos = CompoundStructure.mapPos(element.rot, offsetPos, element.pos, element.structure.getSize())
      return {
        pos: [mappedPos[0]+0.5, mappedPos[1], mappedPos[2]+0.5],
        annotation: a.annotation,
        data: a.data
      }
    }))
  }


}
