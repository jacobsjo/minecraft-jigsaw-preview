import { StructureFeatureManger } from "./StructureFeatureManager";
import { ConfiguedStructureFeature } from "./worldgen/ConfiguredStructureFeature";


class DatapackManager{
    constructor(
        private reader: DatapackReader
    ){}

    public getConfiguredStructureFeatures(): Promise<string[]>{
        return ConfiguedStructureFeature.getAll(this.reader)
    }

    /**
     * getStructureFeatureManager
     * 
     * param id: the id of the ConfiguredStructureFeature
     * return: Promise of StructureFeatureManager
     */
    public async getStructureFeatureManager(id: string): Promise<StructureFeatureManger>{
        return StructureFeatureManger.fromConfiguredStructureFeature(this.reader, await ConfiguedStructureFeature.fromName(this.reader, id))
    }

}