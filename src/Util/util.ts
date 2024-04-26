import { BlockModel, BlockPos } from 'deepslate';
import { vec3 } from 'gl-matrix'

export function shuffleArray<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array
}

export function weightedShuffleArray<T>(array: { weight: number, element: T }[]): T[] {

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

  return array.map(a => { return { element: a.element, k: Math.pow(Math.random(), 1 / a.weight) } }).sort((a, b) => b.k - a.k).map(a => a.element)
}

export function getRandomInt(max: number): number {
  return Math.floor(Math.random() * Math.floor(max));
}


export function clamp(a: number, b: number, c: number): number {
  return Math.max(b, Math.min(c, a))
}

export function lerp(start: number, end: number, amt: number): number {
  return (1 - amt) * start + amt * end
}

export function inv_lerp(start: number, end: number, value: number): number {
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

export function getJigsawModel() {
  return BlockModel.fromJson("minecraft:block/jigsaw", {
    "parent": "block/block",
    "elements": [
      {
        "from": [0, 0, 0],
        "to": [16, 16, 16],
        "faces": {
          "down": { "texture": "#down", "rotation": 180 },
          "up": { "texture": "#up" },
          "north": { "texture": "#north" },
          "south": { "texture": "#south" },
          "west": { "texture": "#west", "rotation": 270 },
          "east": { "texture": "#east", "rotation": 90 }
        }
      }
    ],
    "textures": {
      "down": "minecraft:block/jigsaw_side",
      "east": "minecraft:block/jigsaw_side",
      "north": "minecraft:block/jigsaw_top",
      "particle": "minecraft:block/jigsaw_top",
      "south": "minecraft:block/jigsaw_bottom",
      "up": "minecraft:block/jigsaw_lock",
      "west": "minecraft:block/jigsaw_side"
    }
  })
}

export function getUnkownModel() {
  return BlockModel.fromJson("unknown", {
    "parent": "block/block",
    "elements": [
      {
        "from": [0, 0, 0],
        "to": [16, 16, 16],
        "faces": {
          "down":  { "texture": "#all", "cullface": "down" },
          "up":    { "texture": "#all", "cullface": "up" },
          "north": { "texture": "#all", "cullface": "north" },
          "south": { "texture": "#all", "cullface": "south" },
          "west":  { "texture": "#all", "cullface": "west" },
          "east":  { "texture": "#all", "cullface": "east" }
        }
      }
    ],
    "textures": {
      "all": "block/purple_shulker_box"
    }
  })
}

export function hashCode(str: string) {
	let hash = 0;
	for (let i = 0, len = str.length; i < len; i++) {
		let chr = str.charCodeAt(i);
		hash = (hash << 5) - hash + chr;
		hash |= 0; // Convert to 32bit integer
	}
	return hash;
}

export function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  var r, g, b;

  var i = Math.floor(h * 6);
  var f = h * 6 - i;
  var p = v * (1 - s);
  var q = v * (1 - f * s);
  var t = v * (1 - (1 - f) * s);

  switch (i % 6) {
    case 0: r = v, g = t, b = p; break;
    case 1: r = q, g = v, b = p; break;
    case 2: r = p, g = v, b = t; break;
    case 3: r = p, g = q, b = v; break;
    case 4: r = t, g = p, b = v; break;
    case 5: r = v, g = p, b = q; break;
  }

  return [ r , g , b  ];
}