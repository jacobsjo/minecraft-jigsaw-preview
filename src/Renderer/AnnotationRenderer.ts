import { Identifier, Resources, StructureProvider } from "deepslate";
import { vec3, mat4 } from "gl-matrix";
import { AnnotationProvider } from "../Structure/AnnotationProvider";
import { createBuffer, setUniform, setVertexAttr, updateBuffer } from "../Util/util";
import { ShaderProgram } from "./ShaderProgram";

const vs = `
attribute vec4 vertPos;
attribute vec2 texCoord;

uniform mat4 mView;
uniform mat4 mProj;

varying highp vec2 vTexCoord;

void main(void) {
    gl_Position = mProj * mView * vertPos;
    vTexCoord = texCoord;
}
`;

const fs = `
precision highp float;
varying highp vec2 vTexCoord;

uniform sampler2D sampler;

void main(void) {
    vec4 texColor = texture2D(sampler, vTexCoord);
    if(texColor.a < 0.01) discard;
    gl_FragColor = vec4(texColor.xyz, texColor.a);
}
`;


export class AnnotationRenderer {

  private positionBuffer: WebGLBuffer
  private indexBuffer: WebGLBuffer
  private texCoordBuffer: { [key: string]: WebGLBuffer } = {}
  private atlasTexture: WebGLTexture
  private renderedTypes: string[] | undefined = undefined
  private shaderProgram: WebGLProgram;
  private projMatrix: mat4

  constructor(
    private gl: WebGLRenderingContext,
    private structure: AnnotationProvider,
    private resources: Resources
  ) {
    this.shaderProgram = new ShaderProgram(gl, vs, fs).getProgram()

    const size = 0.3

    const positions: number[] = []
    positions.push(-size, -size, 0)
    positions.push(-size, size, 0)
    positions.push(size, size, 0)
    positions.push(size, -size, 0)
    this.positionBuffer = createBuffer(this.gl, this.gl.ARRAY_BUFFER, new Float32Array(positions))
    this.indexBuffer = createBuffer(this.gl, this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 2, 1, 0, 3, 2]))
    this.atlasTexture = this.getBlockTexture()
  }

  public setStructure(structure: AnnotationProvider) {
    this.structure = structure
  }

  private getPerspective() {
    const fieldOfView = 70 * Math.PI / 180;
    const aspect = (this.gl.canvas as HTMLCanvasElement).clientWidth / (this.gl.canvas as HTMLCanvasElement).clientHeight;
    const projMatrix = mat4.create();
    mat4.perspective(projMatrix, fieldOfView, aspect, 0.1, 500.0);
    return projMatrix
  }


  private getBlockTexture() {
    const texture = this.gl.createTexture()!;
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.resources.getTextureAtlas());
    this.gl.generateMipmap(this.gl.TEXTURE_2D);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
    return texture
  }

  public setViewport(x: number, y: number, width: number, height: number): void {
    this.gl.viewport(x, y, width, height)
    this.projMatrix = this.getPerspective()
  }

  public setRenderedTypes(types: string[]) {
    this.renderedTypes = types
  }

  public update(chunkPositions?: vec3[]): void {

    (new Set(this.structure.getAnnotations().map(a => a.annotation))).forEach(annotation => {
      const uv = this.resources.getTextureUV(new Identifier("jigsaw_previewer", "annotation/" + annotation))

      const texCoords: number[] = []
      texCoords.push(uv[0], uv[3])
      texCoords.push(uv[0], uv[1])
      texCoords.push(uv[2], uv[1])
      texCoords.push(uv[2], uv[3])

      if (this.texCoordBuffer[annotation]) {
        updateBuffer(this.gl, this.texCoordBuffer[annotation], this.gl.ARRAY_BUFFER, new Float32Array(texCoords))
      } else {
        this.texCoordBuffer[annotation] = createBuffer(this.gl, this.gl.ARRAY_BUFFER, new Float32Array(texCoords))
      }
    })
  }

  public draw(viewMatrix: mat4): void {
    this.gl.useProgram(this.shaderProgram)

    this.gl.activeTexture(this.gl.TEXTURE0)
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.atlasTexture)

    setUniform(this.gl, this.shaderProgram, 'mProj', this.projMatrix)
    setVertexAttr(this.gl, this.shaderProgram, 'vertPos', 3, this.positionBuffer)
    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer)

    const types = this.renderedTypes ?? Object.keys(this.texCoordBuffer)

    types.forEach(a => {
      setVertexAttr(this.gl, this.shaderProgram, 'texCoord', 2, this.texCoordBuffer[a])
      this.structure.getAnnotations().filter(annotation => annotation.annotation === a).forEach(annotation => {
        //console.log(`rendering ${a} at ${annotation.pos[0]}, ${annotation.pos[1]}, ${annotation.pos[2]}`);
        const translatedMatrix = mat4.create()
        mat4.copy(translatedMatrix, viewMatrix)
        mat4.translate(translatedMatrix, translatedMatrix, annotation.pos)
        const translation = vec3.create()
        mat4.getTranslation(translation, translatedMatrix)
        setUniform(this.gl, this.shaderProgram, 'mView', mat4.fromTranslation(translatedMatrix, translation))
        this.gl.drawElements(this.gl.TRIANGLES, 6, this.gl.UNSIGNED_SHORT, 0)
      })
    })
  }
}