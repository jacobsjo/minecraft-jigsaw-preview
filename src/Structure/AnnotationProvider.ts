import { BlockPos } from "deepslate";

export type AnnotationType = "entity" | "feature" | "empty"
export type StructureAnnotation = { pos: BlockPos; annotation: AnnotationType; data: any; }

export interface AnnotationProvider{
    getAnnotations(): StructureAnnotation[]
}