
export namespace Constants {
    export const LEGACY_MINECRAFT_VERSIONS: string[] = ["1_16", "1_17", "1_18"]
    export const EXPERIMENTAL_MINECRAFT_VERSIONS: string[] = []

    export const MINECRAFT_VERSIONS: string[] = ["1_16", "1_17", "1_18", "1_19", "1_20", "1_20_3"]

    export const MINECRAFT_ASSET_VERSIONS: {[key: string]: string | undefined} = {
    "1_16": "1.16.5",
    "1_17": "1.17.1",
    "1_18": "1.18.2",
    "1_19": "1.19.2",
    "1_20": "1.20",
    "1_20_3": undefined
    }
}