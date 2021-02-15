export class DatapackReaderDirectory implements DatapackReader{

    constructor(
        private files: File[]
    ){}

    public static async fromFileList(files: File[]){
        return new DatapackReaderDirectory(files)
    }

    public hasFile(path: string): boolean {
        return this.files.findIndex(file => file.name === path) >= 0
    }

    public getFilesInPath(path: string): string[] {
        return this.files.map(file => file.name).filter(fn => fn.startsWith(path))
    }

    public async readFileAsJson(path: string): Promise<any> {
        const data = await this.files.find(file => file.name === path).text()
        return JSON.parse(data)
    }

    public async readFileAsBlob(path: string): Promise<ArrayBuffer> {
        return this.files.find(file => file.name === path).arrayBuffer()
    }
}