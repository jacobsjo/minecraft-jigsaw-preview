
export namespace Constants {
    export const LEGACY_STRUCTURE_FEATURE_MINECRAFT_VERSIONS: string[] = ["1_16", "1_17", "1_18"]
    export const LEGACY_STRUCTURES_MINECRAFT_VERSIONS: string[] = ["1_16", "1_17", "1_18", "1_19", "1_20", "1_20_4", "24w14potato", "1_20_6"]

    export const MINECRAFT_VERSIONS: string[] = ["1_16", "1_17", "1_18", "1_19", "1_20", "1_20_4", "24w14potato", "1_20_6", "1_21"]

    export const MINECRAFT_ASSET_VERSIONS: {[key: string]: string | undefined} = {
        "1_16": "1.16.5",
        "1_17": "1.17.1",
        "1_18": "1.18.2",
        "1_19": "1.19.2",
        "1_20": "1.20.2",
        "1_20_4": "1.20.4",
        "24w14potato": "24w14potato",
        "1_20_6": "1.20.6",
        "1_21": "24w21a"
    }

    export const HIDDEN_VERSIONS = ["24w14potato"]

    export const MINECRAFT_DATAPACK_VERSION: {[key: string]: number} = {
        "1_16": 6,
        "1_17": 7,
        "1_18": 9,
        "1_19": 10,
        "1_20": 18,
        "1_20_4": 26,
        "24w14potato": 36,
        "1_20_6": 41,
        "1_21": 45
    }
}