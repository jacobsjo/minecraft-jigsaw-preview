import { mat4, vec2, vec3 } from 'gl-matrix'
import { PieceInfo, JigsawStructure, BoundingBoxInfo } from "./Jigsaw/JigsawStructure";
import { clamp, clampVec3, hashCode, hsvToRgb, negVec3 } from './Util/util'
import { BBRenderer } from './Renderer/BoundingBoxRenderer';
import { BoundingBox } from './Jigsaw/BoundingBox';
import { JigsawGenerator } from './Jigsaw/JigsawGenerator';
import { TemplatePool } from './worldgen/TemplatePool';
import { HeightmapRenderer } from './Renderer/HeightmapRenderer';
import { StructureFeature } from './worldgen/StructureFeature';
import { CompositeDatapack, FileListDatapack, ZipDatapack } from 'mc-datapack-loader';
import { BlockPos, BlockState, Identifier, NbtCompound, NbtFile, StructureProvider } from 'deepslate';
import { EntityAnnotatedStructure } from './Structure/EntityAnnotatedStructure';
import { AnnotationRenderer } from './Renderer/AnnotationRenderer';
import { ImageHeightmap } from './Heightmap/ImageHeightmap';
import { DisplayManager } from './UI/DisplayManager';
import { OffsetStructure } from './Structure/OffsetStructure';
import { InsetStructure } from './Structure/InsetStructure';
import { StructureRenderer } from './Renderer/StructureRenderer';
import * as d3 from 'd3';
import { McmetaResourceManager } from './ResourceManger/McmetaResourceManager';
import { getAnnotationAtlas } from './ResourceManger/AnnotationAtlas';

declare global {
  interface Window {
    showDirectoryPicker: any;
  }
}


main();

async function main() {






  // Heightmap
  heightmap_entries.forEach(entry => entry.addEventListener("click", async () => {
    if (entry.id === "upload") {
      console.warn("Upload not yet implemented")
    } else {
      console.debug("Loading Heightmap " + entry.id)
      heightmap = await ImageHeightmap.fromImage("heightmaps/" + entry.id + ".png")
      heightmapRenderer.setHeightmap(heightmap)
      heightmapRenderer.toggleRendering(true)
      setting_buttons.heightmap.classList.toggle("selected", true)
      heightmap_entries.forEach(e => e.classList.toggle("selected", e.id === entry.id))
      heightmapPanel.classList.add("hidden")

      infoPanel.classList.toggle("hidden", !setting_buttons.info.classList.contains("selected"))
      selectHeightmapButton.classList.remove("selected")

      requestAnimationFrame(render)
    }
  }))
}
