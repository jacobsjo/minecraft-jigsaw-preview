import { mat4 } from "gl-matrix";
import { BoundingBox } from "../Jigsaw/BoundingBox";
import { ShaderProgram } from "./ShaderProgram";

const vsGrid = `
  attribute vec4 vertPos;
  //attribute vec3 vertColorAAA;

  uniform mat4 mView;
  uniform mat4 mProj;
  uniform float alpha;
  uniform vec3 color;

  varying highp vec4 vColor;

  void main(void) {
    gl_Position = mProj * mView * vertPos;
    vColor = vec4(color, alpha);
  }
`

const fsGrid = `
  precision highp float;
  varying highp vec4 vColor;

  void main(void) {
    gl_FragColor = vColor;
  }
`;

type BBBuffers = {
  line_position: WebGLBuffer,
  triangle_position: WebGLBuffer,
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
    const line_positions: number[] = []
    const triangle_positions: number[] = []

    line_positions.push(0, 0, 0, 0, 0, 1)
    line_positions.push(1, 0, 0, 1, 0, 1)
    line_positions.push(0, 0, 0, 1, 0, 0)
    line_positions.push(0, 0, 1, 1, 0, 1)

    line_positions.push(0, 0, 0, 0, 1, 0)
    line_positions.push(1, 0, 0, 1, 1, 0)
    line_positions.push(0, 0, 1, 0, 1, 1)
    line_positions.push(1, 0, 1, 1, 1, 1)

    line_positions.push(0, 1, 0, 0, 1, 1)
    line_positions.push(1, 1, 0, 1, 1, 1)
    line_positions.push(0, 1, 0, 1, 1, 0)
    line_positions.push(0, 1, 1, 1, 1, 1)

    triangle_positions.push(0, 1, 1)
    triangle_positions.push(1, 1, 1)
    triangle_positions.push(0, 0, 1)
    triangle_positions.push(1, 0, 1)
    triangle_positions.push(1, 0, 0)
    triangle_positions.push(1, 1, 1)
    triangle_positions.push(1, 1, 0)
    triangle_positions.push(0, 1, 1)
    triangle_positions.push(0, 1, 0)
    triangle_positions.push(0, 0, 1)
    triangle_positions.push(0, 0, 0)
    triangle_positions.push(1, 0, 0)
    triangle_positions.push(0, 1, 0)
    triangle_positions.push(1, 1, 0)


    return {
      line_position: this.createBuffer(this.gl.ARRAY_BUFFER, new Float32Array(line_positions)),
      triangle_position: this.createBuffer(this.gl.ARRAY_BUFFER, new Float32Array(triangle_positions))
    }
  }


  private createBuffer(type: number, array: ArrayBuffer) {
    const buffer = this.gl.createBuffer();
    this.gl.bindBuffer(type, buffer);
    this.gl.bufferData(type, array, this.gl.STATIC_DRAW);
    return buffer
  }

  public drawBB(viewMatrix: mat4, bb: BoundingBox, color: [number, number, number], insize_faces: boolean, lineWidth: number = 1.5, alpha: number = 0.3): void {
    const scale: [number, number, number] = [bb.size[0]+0.02, bb.size[1]+0.002, bb.size[2]+0.002]
    const translation: [number, number, number] = [bb.min[0]-0.01, bb.min[1]-0.001, bb.min[2]-0.001]
    this.setShader(this.gridShaderProgram)

    if (!insize_faces){
      translation[0] += scale[0]
      translation[1] += scale[1]
      translation[2] += scale[2]
      scale[0] *= -1
      scale[1] *= -1
      scale[2] *= -1
    }

    //this.setVertexAttr('vertColorAAA', 3, this.bbBuffers.colors[color])
    this.gl.disableVertexAttribArray(1)
    const translatedMatrix = mat4.create()
    mat4.copy(translatedMatrix, viewMatrix)
    mat4.translate(translatedMatrix, translatedMatrix, translation)
    mat4.scale(translatedMatrix, translatedMatrix, scale )
    this.setUniform('mView', translatedMatrix)
    this.setUniform('mProj', this.projMatrix)
    const colorLocation = this.gl.getUniformLocation(this.activeShader, 'color') 
    this.gl.uniform3f(colorLocation, ...color)   

    const alphaLocation = this.gl.getUniformLocation(this.activeShader, 'alpha')    
    this.gl.uniform1f(alphaLocation, 1.0)

    this.setVertexAttr('vertPos', 3, this.bbBuffers.line_position)
    this.gl.lineWidth(lineWidth)
    this.gl.drawArrays(this.gl.LINES, 0, 24)

    this.gl.uniform1f(alphaLocation, alpha)
    this.gl.depthMask(false)
    this.setVertexAttr('vertPos', 3, this.bbBuffers.triangle_position)
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 14)
    this.gl.depthMask(true)

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
