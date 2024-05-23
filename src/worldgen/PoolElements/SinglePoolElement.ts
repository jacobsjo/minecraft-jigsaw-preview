import { BlockPos, StructureProvider, Identifier, PlacedBlock, NbtFile } from "deepslate";
import { directionRelative, shuffleArray } from "../../Util/util";
import { BoundingBox } from "../../Jigsaw/BoundingBox";
import { TemplatePool } from "../TemplatePool";
import { AnonymousDatapack, Datapack, ResourceLocation } from "mc-datapack-loader";
import { YExpandedStructure } from "../../Structure/YExpandedStructure";
import { AnnotationProvider } from "../../Structure/AnnotationProvider";
import { EntityAnnotatedStructure } from "../../Structure/EntityAnnotatedStructure";
import { PoolElement } from "./PoolElement";


export class SinglePoolElement extends PoolElement {
    private structure: Promise<StructureProvider & AnnotationProvider>;
    private expansionHackString = "";
    constructor(
        private datapack: AnonymousDatapack,
        private id: Identifier,
        private processors: string,
        private projection: "rigid" | "terrain_matching",
        private useLegacyStructuresFolder: boolean
    ) {
        super();
        this.structure = new Promise(async (resolve) => {
            try {
                const arrayBuffer = (await datapack.get(this.useLegacyStructuresFolder ? ResourceLocation.LEGACY_STRUCTURE : ResourceLocation.STRUCTURE, id)) as ArrayBuffer;
                const nbt = NbtFile.read(new Uint8Array(arrayBuffer));
                resolve(EntityAnnotatedStructure.fromNbt(nbt.root));
            } catch (e) {
                console.warn(`Could not load structure ${id.toString()}: ${e}`);
                resolve(new EntityAnnotatedStructure([1, 1, 1]));
            }
        });
    }

    public async doExpansionHack() {
        const oldHeight = (await this.structure).getSize()[1];
        if (oldHeight > 16) {
            return 0;
        }

        try {
            var minHeight = 0;
            for (const jigsaw of await this.getShuffledJigsawBlocks()) {
                const orientation: string = jigsaw.state.getProperties()['orientation'] ?? 'north_up';
                const [forward, _] = orientation.split("_");
                const facingPos: BlockPos = directionRelative(jigsaw.pos, forward);
                const isInside: boolean = new BoundingBox([0, 0, 0] as BlockPos, (await this.structure).getSize()).isInside(facingPos);

                if (!isInside)
                    continue;

                const pool: TemplatePool = await TemplatePool.fromName(this.datapack, Identifier.parse(jigsaw.nbt.getString("pool")), false, this.useLegacyStructuresFolder);
                const fallbackPool: TemplatePool = await TemplatePool.fromName(this.datapack, pool.fallback, false, this.useLegacyStructuresFolder);

                const maxHeight = await pool.getMaxHeight();
                const maxHeightFallback = await fallbackPool.getMaxHeight();

                minHeight = Math.max(minHeight, Math.max(maxHeight, maxHeightFallback) + 2);
            }
            this.structure = new Promise(async (resolve) => {
                resolve(new YExpandedStructure(await this.structure, minHeight));
            });
            if (minHeight > oldHeight)
                this.expansionHackString = "\n\nBounding box height expanded from " + oldHeight + " to " + minHeight + " blocks.";
        } catch (e) {
            this.expansionHackString = "\n\nFailed to calculate expansion of bounding box: " + e;
        }
        return minHeight;
    }

    public getType(): string {
        return "minecraft:single_pool_element";
    }

    public getStructure(): Promise<StructureProvider & AnnotationProvider> {
        return this.structure;
    }

    public getProjection(): "rigid" | "terrain_matching" {
        return this.projection;
    }

    public async getShuffledJigsawBlocks(): Promise<PlacedBlock[]> {
        return shuffleArray((await this.structure).getBlocks().filter(block => { return block.state.getName().namespace === "minecraft" && block.state.getName().path === "jigsaw"; }));
    }

    public getDescription() {
        return `{
  "element_type": "minecraft:single_pool_element",
  "location": "` + this.id.toString() + `",
  "processors": "` + this.processors + `",
  "projection": "` + this.projection + `"
}` + this.expansionHackString;
    }

    public getShortDescription(): string {
        return this.id.toString()
    }
}
