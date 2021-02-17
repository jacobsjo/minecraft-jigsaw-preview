import jszip from "jszip";

export class DatapackReaderZip implements DatapackReader{
    private datapackName = ""

    constructor(
        private zip: jszip
    ){
        this.datapackName = Object.keys(zip.files).find(n => n.indexOf("/") > 0).split("/")[0] + "/"
        if (this.datapackName === "data/"){
            this.datapackName = ""
        }
    }

    public static async fromFile(file: File){
        const data = await file.arrayBuffer()
        const zip = await jszip.loadAsync(data)
        return new DatapackReaderZip(zip)
    }

    public static async fromUrl(url: string){
        const data = await (await fetch(url)).arrayBuffer()
        const zip = await jszip.loadAsync(data)
        return new DatapackReaderZip(zip)
    }

    public hasFile(path: string): boolean {
        return this.zip.file(this.datapackName + path) !== null
    }

    public getFilesInPath(path: string): string[] {
        path = this.datapackName + path
        return [... new Set(Object.keys(this.zip.folder(path).files).filter(key => key.startsWith(path + "/"))
            .map(key => key.substr(path.length+1).split('/')[0]))].filter(e => e != "")
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public async readFileAsJson(path: string): Promise<any> {
        const data = await this.zip.file(this.datapackName + path).async("string")
        return JSON.parse(data)
    }

    public async readFileAsBlob(path: string): Promise<ArrayBuffer> {
        return await this.zip.file(this.datapackName + path).async("arraybuffer")
    }
}