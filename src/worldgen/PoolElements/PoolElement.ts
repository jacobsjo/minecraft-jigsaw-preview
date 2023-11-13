import { StructureProvider, Identifier, PlacedBlock } from "deepslate"
import { Datapack } from "mc-datapack-loader";
import { AnnotationProvider } from "../../Structure/AnnotationProvider";

export abstract class PoolElement{
    public async doExpansionHack(): Promise<number>{
        return 0
    }

    public abstract getStructure(): Promise<StructureProvider & AnnotationProvider>
    public abstract getProjection(): "rigid" | "terrain_matching"

    public abstract getShuffledJigsawBlocks(): Promise<PlacedBlock[]>

    public abstract getType(): string

    public abstract getDescription(): string

    public abstract getShortDescription(): string
}



