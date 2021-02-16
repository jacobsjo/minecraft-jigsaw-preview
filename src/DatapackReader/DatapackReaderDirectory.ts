interface MyFile extends File{
    readonly webkitRelativePath: string;
}

export class DatapackReaderDirectory implements DatapackReader{
    private directoryName: string

    constructor(
        private files: MyFile[]
    ){
        this.directoryName = files[0].webkitRelativePath.split("/")[0]
    }

    public static async fromFileList(files: File[]): Promise<DatapackReaderDirectory>{
        return new DatapackReaderDirectory(files.map(file => <MyFile>file))
    }

    public hasFile(path: string): boolean {
        return this.files.findIndex(file => file.webkitRelativePath === this.directoryName + "/" + path) >= 0
    }

    public getFilesInPath(path: string): string[] {
        path = this.directoryName + "/" + path + "/"
        return [... new Set(this.files.filter(file => file.webkitRelativePath.startsWith(path))
            .map(file => file.webkitRelativePath.substr(path.length).split('/')[0]))].filter(e => e != "")
    }

    public async readFileAsJson(path: string): Promise<any> {
        const data = await this.files.find(file => file.webkitRelativePath === this.directoryName + "/" + path).text()
        return JSON.parse(data)
    }

    public async readFileAsBlob(path: string): Promise<ArrayBuffer> {
        return this.files.find(file => file.webkitRelativePath === this.directoryName + "/" + path).arrayBuffer()
    }
}