import { BlockPos } from 'deepslate';
import { vec3 } from 'gl-matrix'

export function shuffleArray<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array
}

export function weightedShuffleArray<T>(array: {weight: number, element: T}[]): T[] {

  /*
  const result: T[] = []
  
  const _array: {weight: number, element: T}[] = array.map(a=>a)

  while (_array.length > 0){
    const total_weight = _array.reduce((s, e) => s + e.weight, 0)
    
    const select = Math.random() * total_weight
    var running_weight = 0
    for (var e = 0; e < _array.length ; e++){
      running_weight += _array[e].weight
      if (running_weight > select){
        result.push(_array[e].element)
        _array.splice(e, 1)
      }
    }
  }
  return result
  */

  return array.map(a => {return {element: a.element, k: Math.pow(Math.random(), 1/a.weight)}}).sort((a, b) => b.k - a.k).map(a => a.element)
}

export function getRandomInt(max: number): number {
  return Math.floor(Math.random() * Math.floor(max));
}


export function clamp(a: number, b: number, c: number): number {
  return Math.max(b, Math.min(c, a))
}

export function lerp (start: number, end: number, amt: number): number{
  return (1-amt)*start+amt*end
}

export function inv_lerp( start: number, end: number, value: number): number{
  return (value - start) / (end - start)
}

export function clampVec3(a: vec3, b: vec3, c: vec3): void {
  a[0] = clamp(a[0], b[0], c[0])
  a[1] = clamp(a[1], b[1], c[1])
  a[2] = clamp(a[2], b[2], c[2])
}

export function negVec3(a: vec3): vec3 {
  return vec3.fromValues(-a[0], -a[1], -a[2])
}

export function directionRelative(pos: BlockPos, dir: string): BlockPos {
  const newPos: BlockPos = [pos[0], pos[1], pos[2]]
  switch (dir) {
    case "north":
      newPos[2]--
      break;
    case "west":
      newPos[0]--
      break;
    case "south":
      newPos[2]++
      break;
    case "east":
      newPos[0]++
      break;
    case "up":
      newPos[1]++
      break;
    case "down":
      newPos[1]--
  }
  return newPos
}

export function createBuffer(gl: WebGLRenderingContext, type: number, array: ArrayBuffer) {
  const buffer = gl.createBuffer()!;
  gl.bindBuffer(type, buffer);
  gl.bufferData(type, array, gl.DYNAMIC_DRAW);
  return buffer
}

export function updateBuffer(gl: WebGLRenderingContext, buffer: WebGLBuffer, type: number, array: ArrayBuffer) {
  gl.bindBuffer(type, buffer);
  gl.bufferData(type, array, gl.DYNAMIC_DRAW);
}

export function setVertexAttr(gl: WebGLRenderingContext, shader: WebGLProgram, name: string, size: number, buffer: WebGLBuffer | null) {
  const location = gl.getAttribLocation(shader, name)
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0)
  gl.enableVertexAttribArray(location)
}

export function setUniform(gl: WebGLRenderingContext, shader: WebGLProgram, name: string, value: Float32List) {
  const location = gl.getUniformLocation(shader, name)
  gl.uniformMatrix4fv(location, false, value)
}