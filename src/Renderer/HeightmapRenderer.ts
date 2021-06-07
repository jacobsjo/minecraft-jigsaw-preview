import { StructureProvider } from "@webmc/core";
import { Resources } from "@webmc/render";
import { Renderer } from "@webmc/render/lib/StructureRenderer/Renderer";
import { vec3, mat4 } from "gl-matrix";
import { inv_lerp, setVertexAttr } from "../util";
import { setUniform } from "../util";
import { createBuffer } from "../util";
import { Heightmap } from "../Heightmap";
//import { Renderer } from "@webmc/render"



export class HeightmapRenderer extends Renderer {
  private static vs = `
    attribute vec4 vertPos;
    attribute vec3 vertColor;

    uniform mat4 mView;
    uniform mat4 mProj;

    varying highp vec3 vColor;

    void main(void) {
      gl_Position = mProj * mView * vertPos;
      vColor = vertColor;
    }
  `;

  protected static fs = `
    precision highp float;
    varying highp vec3 vColor;

    void main(void) {
      gl_FragColor = vec4(vColor, 0.3);
    }
  `;

  private pos_buffer: WebGLBuffer
  private color_buffer: WebGLBuffer
  private index_buffer: WebGLBuffer
  private lenght: number

  private doRender = false;
  private heightmap: Heightmap

  constructor(
    gl: WebGLRenderingContext,
    structure: StructureProvider,
    resources: Resources,
    heightmap: Heightmap
  ) {
    super(gl, structure, resources, HeightmapRenderer.vs, HeightmapRenderer.fs)

    this.setHeightmap(heightmap)
  }

  public toggleRendering(force?: boolean): boolean{
    if (force === undefined)
      this.doRender = !this.doRender
    else (this.doRender = force)

    return this.doRender
  }

  height_to_color(height: number): vec3{
    const color_map = [
      {y: 64, color: vec3.fromValues(0.0, 0.0, 1.0) },
      {y: 65, color: vec3.fromValues(1.0, 1.0, 1.0) },
      {y: 80, color: vec3.fromValues(0.2, 1.0, 0.2) },
      {y: 100, color: vec3.fromValues(1.0, 1.0, 0.0) },
      {y: 120, color: vec3.fromValues(1.0, 0.0, 0.0) }
    ]

    for (let i = 0 ; i < color_map.length ; i++){
      if (height < color_map[i].y){
        if (i === 0)
          return color_map[i].color

          const lerp_value = inv_lerp(color_map[i-1].y, color_map[i].y, height)
          const color : vec3 = vec3.create()
          vec3.lerp(color, color_map[i-1].color, color_map[i].color, lerp_value)
          return color
      }
    }

    return color_map[color_map.length-1].color

  }

  update(_chunkPositions?: vec3[]): void {
    // do nothing
  }

  public setHeightmap(heightmap: Heightmap){
    this.heightmap = heightmap

    const position: number[] = []
    const color: number[] = []

    const indices: number[] = []

    var index = 0
    this.lenght = 0

    for (var x=-80 ; x<=81; x++){
      for (var z=-80 ; z<=81; z++){
        const height = this.heightmap.getHeight(x, z)

        position.push(x + 0.2, height - 0.127, z + 0.2)
        position.push(x + 0.8, height - 0.127, z + 0.2)
        position.push(x + 0.8, height - 0.127, z + 0.8)
        position.push(x + 0.2, height - 0.127, z + 0.8)

        indices.push(index + 0, index + 2, index + 1, index + 0, index + 3, index + 2)
        indices.push(index + 0, index + 1, index + 2, index + 0, index + 2, index + 3)
        this.lenght += 12
        index += 4

        const c = this.height_to_color(height)

        for (var i = 0 ; i<4 ; i++)
          color.push(...c)
      }
    }

    this.pos_buffer = createBuffer(this.gl, this.gl.ARRAY_BUFFER, new Float32Array(position))   
    this.color_buffer = createBuffer(this.gl, this.gl.ARRAY_BUFFER, new Float32Array(color))   
    this.index_buffer = createBuffer(this.gl, this.gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(indices))      
  }

  draw(viewMatrix: mat4, projMatrix: mat4): void {
    if (!this.doRender)
      return 

    this.gl.useProgram(this.shaderProgram)

    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.index_buffer)
    setVertexAttr(this.gl, this.shaderProgram, 'vertPos', 3, this.pos_buffer)
    setVertexAttr(this.gl, this.shaderProgram, 'vertColor', 3, this.color_buffer)
    setUniform(this.gl, this.shaderProgram, 'mView', viewMatrix)
    setUniform(this.gl, this.shaderProgram, 'mProj', projMatrix)
    this.gl.drawElements(this.gl.TRIANGLES, this.lenght, this.gl.UNSIGNED_INT, 0)
  }

}