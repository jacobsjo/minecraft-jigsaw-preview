export class DatapackReaderComposite implements DatapackReader{
    constructor (
        public readers: DatapackReader[] = []
    ){}
    
    public getFilesInPath(path: string): string[] {
        return [... new Set(this.readers.flatMap(reader => reader.getFilesInPath(path)))]
    }

    public getPathsInPath(path: string): string[] {
        return [... new Set(this.readers.flatMap(reader => reader.getPathsInPath(path)))]
    }


    public hasFile(path: string): boolean {
        const has = this.readers.map(reader => reader.hasFile(path))
        return has.includes(true)
    }

    public async readFileAsJson(path: string): Promise<any> {
        const has = await Promise.all(this.readers.map(reader => reader.hasFile(path)))
        const hasIndex = has.lastIndexOf(true)
        if (hasIndex < 0){
            throw "Path " + path + " in no reader"
        }
        return this.readers[hasIndex].readFileAsJson(path)
    }

    public async readFileAsBlob(path: string): Promise<ArrayBuffer> {
        const has = await Promise.all(this.readers.map(reader => reader.hasFile(path)))
        const hasIndex = has.lastIndexOf(true)
        if (hasIndex < 0){
            throw "Path " + path + " in no reader"
        }
        return this.readers[hasIndex].readFileAsBlob(path)
    }
}