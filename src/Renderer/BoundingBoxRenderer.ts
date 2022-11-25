import { mat4 } from "gl-matrix";
import { BoundingBox } from "../Jigsaw/BoundingBox";
import { ShaderProgram } from "./ShaderProgram";

const vsGrid = `
  attribute vec4 vertPos;
  attribute vec3 vertColor;

  uniform mat4 mView;
  uniform mat4 mProj;

  varying highp vec3 vColor;

  void main(void) {
    gl_Position = mProj * mView * vertPos;
    vColor = vertColor;
  }
`

const fsGrid = `
  precision highp float;
  varying highp vec3 vColor;

  void main(void) {
    gl_FragColor = vec4(vColor, 1.0);
  }
`;

type BBBuffers = {
  position: WebGLBuffer
  colors: WebGLBuffer[]
  length: number
}

export class BBRenderer {
  private gridShaderProgram: WebGLProgram
  private bbBuffers: BBBuffers
  private projMatrix: mat4
  private activeShader: WebGLProgram

  constructor(
    private gl: WebGLRenderingContext,
  ) {
    this.gridShaderProgram = new ShaderProgram(gl, vsGrid, fsGrid).getProgram()

    this.bbBuffers = this.getBBBuffers()
    this.initialize()
  }

  private initialize() {
    this.gl.enable(this.gl.DEPTH_TEST)
    this.gl.depthFunc(this.gl.LEQUAL)

    this.gl.enable(this.gl.BLEND)
    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA)

    this.gl.enable(this.gl.CULL_FACE)
    this.gl.cullFace(this.gl.BACK)
  }

  private getPerspective() {
    const fieldOfView = 70 * Math.PI / 180;
    const aspect = (this.gl.canvas as HTMLCanvasElement).clientWidth / (this.gl.canvas as HTMLCanvasElement).clientHeight;
    const projMatrix = mat4.create();
    mat4.perspective(projMatrix, fieldOfView, aspect, 0.1, 500.0);
    return projMatrix
  }

  private getBBBuffers(): BBBuffers {
    const position: number[] = []
    const color1: number[] = []
    const color2: number[] = []
    const color3: number[] = []

    position.push(0, 0, 0, 0, 0, 1)
    position.push(1, 0, 0, 1, 0, 1)
    position.push(0, 0, 0, 1, 0, 0)
    position.push(0, 0, 1, 1, 0, 1)

    position.push(0, 0, 0, 0, 1, 0)
    position.push(1, 0, 0, 1, 1, 0)
    position.push(0, 0, 1, 0, 1, 1)
    position.push(1, 0, 1, 1, 1, 1)

    position.push(0, 1, 0, 0, 1, 1)
    position.push(1, 1, 0, 1, 1, 1)
    position.push(0, 1, 0, 1, 1, 0)
    position.push(0, 1, 1, 1, 1, 1)

    for (let i = 0; i < 12; i += 1){
        color1.push(0,0,1,0,0,1)
        color2.push(0,1,0,0,1,0)
        color3.push(1,0,0,1,0,0)
    }

    return {
      position: this.createBuffer(this.gl.ARRAY_BUFFER, new Float32Array(position)),
      colors: [this.createBuffer(this.gl.ARRAY_BUFFER, new Float32Array(color1)),
               this.createBuffer(this.gl.ARRAY_BUFFER, new Float32Array(color2)),
               this.createBuffer(this.gl.ARRAY_BUFFER, new Float32Array(color3))],
      length: position.length / 3
    }
  }


  private createBuffer(type: number, array: ArrayBuffer) {
    const buffer = this.gl.createBuffer();
    this.gl.bindBuffer(type, buffer);
    this.gl.bufferData(type, array, this.gl.STATIC_DRAW);
    return buffer
  }

  public drawBB(viewMatrix: mat4, bb: BoundingBox, color: number): void {
    this.setShader(this.gridShaderProgram)

    this.setVertexAttr('vertPos', 3, this.bbBuffers.position)
    this.setVertexAttr('vertColor', 3, this.bbBuffers.colors[color])
    const translatedMatrix = mat4.create()
    mat4.copy(translatedMatrix, viewMatrix)
    mat4.scale(translatedMatrix, translatedMatrix, bb.size)
    mat4.translate(translatedMatrix, translatedMatrix, [bb.min[0]/bb.size[0], bb.min[1]/bb.size[1], bb.min[2]/bb.size[2]])
    this.setUniform('mView', translatedMatrix)
    this.setUniform('mProj', this.projMatrix)

    this.gl.drawArrays(this.gl.LINES, 0, this.bbBuffers.length)
  }

  public setViewport(x: number, y: number, width: number, height: number): void {
    this.gl.viewport(x, y, width, height)
    this.projMatrix = this.getPerspective()
  }

  private setShader(shader: WebGLProgram) {
    this.gl.useProgram(shader)
    this.activeShader = shader
  }

  private setVertexAttr(name: string, size: number, buffer: WebGLBuffer | null) {
    const location = this.gl.getAttribLocation(this.activeShader, name)
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer)
    this.gl.vertexAttribPointer(location, size, this.gl.FLOAT, false, 0, 0)
    this.gl.enableVertexAttribArray(location)
  }

  private setUniform(name: string, value: Float32List) {
    const location = this.gl.getUniformLocation(this.activeShader, name)    
    this.gl.uniformMatrix4fv(location, false, value)
  }
}
