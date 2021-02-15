import { read } from "@webmc/nbt"

class DatapackReaderComposite implements DatapackReader{
    constructor (
        public readers: DatapackReader[] = []
    ){}
    
    public async getFilesInPath(path: string): Promise<string[]> {
        const files: string[] = []

        for (const reader of this.readers){
            files.concat(await reader.getFilesInPath(path))
        }

        return files
    }

    public async hasFile(path: string): Promise<boolean> {
        const has = await Promise.all(this.readers.map(reader => reader.hasFile(path)))
        return has.includes(true)
    }

    public async readFileAsJson(path: string): Promise<any> {
        const has = await Promise.all(this.readers.map(reader => reader.hasFile(path)))
        return this.readers[has.findIndex(b => b)].readFileAsJson(path)
    }

    public async readFileAsBlob(path: string): Promise<ArrayBuffer> {
        const has = await Promise.all(this.readers.map(reader => reader.hasFile(path)))
        return this.readers[has.findIndex(b => b)].readFileAsBlob(path)
    }
}