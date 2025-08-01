import { StructureProvider, ChunkBuilder, Resources, Renderer } from 'deepslate'
import type { vec3 } from 'gl-matrix'
import { mat4 } from 'gl-matrix'
import { ShaderProgram } from './ShaderProgram'


const vsTinted = `
  attribute vec4 vertPos;
  attribute vec2 texCoord;
  attribute vec4 texLimit;
  attribute vec3 vertColor;
  attribute vec3 normal;

  uniform mat4 mView;
  uniform mat4 mProj;

  varying highp vec2 vTexCoord;
  varying highp vec4 vTexLimit;
  varying highp vec3 vTintColor;
  varying highp float vLighting;

  void main(void) {
    gl_Position = mProj * mView * vertPos;
    vTexCoord = texCoord;
	vTexLimit = texLimit;
    vTintColor = vertColor;
    vLighting = normal.y * 0.2 + abs(normal.z) * 0.1 + 0.8;
  }
`

const fsTinted = `
  precision highp float;
  varying highp vec2 vTexCoord;
  varying highp vec4 vTexLimit;
  varying highp vec3 vTintColor;
  varying highp float vLighting;

  uniform sampler2D sampler;
  uniform highp float pixelSize;

  void main(void) {
		vec4 texColor = texture2D(sampler, clamp(vTexCoord,
			vTexLimit.xy + vec2(0.5, 0.5) * pixelSize,
			vTexLimit.zw - vec2(0.5, 0.5) * pixelSize
		));
		if(texColor.a < 0.01) discard;
		vec4 tint = vec4(1.0,0.0,0.0,0.3);
		vec3 color = tint.a * tint.rgb + (1.0-tint.a) * texColor.xyz * vTintColor * vLighting;
		gl_FragColor = vec4(color, texColor.a);
  }
`


export class StructureRenderer extends Renderer {
	private readonly tintedShaderProgram: WebGLProgram
	private readonly atlasTexture: WebGLTexture
	private readonly chunkBuilder: ChunkBuilder

	constructor(
		gl: WebGLRenderingContext,
		structure: StructureProvider,
		private readonly resources: Resources,
	) {
		super(gl)

		const chunkSize = 8

		this.chunkBuilder = new ChunkBuilder(gl, structure, resources, chunkSize)

		this.tintedShaderProgram = new ShaderProgram(gl, vsTinted, fsTinted).getProgram()

		this.atlasTexture = this.createAtlasTexture(this.resources.getTextureAtlas())
	}

	public setStructure(structure: StructureProvider) {
		this.chunkBuilder.setStructure(structure)
	}

	public updateStructureBuffers(chunkPositions?: vec3[]): void {
		this.chunkBuilder.updateStructureBuffers(chunkPositions)
	}

	public drawStructure(viewMatrix: mat4) {
		this.setShader(this.shaderProgram)
		this.setTexture(this.atlasTexture, this.resources.getPixelSize?.())
		this.prepareDraw(viewMatrix)

		this.chunkBuilder.getMeshes().forEach(mesh => {
			this.drawMesh(mesh, { pos: true, color: true, texture: true, normal: true })
		})
	}

	public drawTintedStructure(viewMatrix: mat4) {
		this.setShader(this.tintedShaderProgram)
		this.setTexture(this.atlasTexture, this.resources.getPixelSize?.())
		this.prepareDraw(viewMatrix)

		this.chunkBuilder.getMeshes().forEach(mesh => {
			this.drawMesh(mesh, { pos: true, color: true, texture: true, normal: true })
		})
	}
}
