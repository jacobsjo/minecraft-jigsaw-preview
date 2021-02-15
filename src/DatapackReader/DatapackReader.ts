

interface DatapackReader {
    getFilesInPath(path: string): Promise<string[]>

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    readFileAsJson(path: string): Promise<any>
    readFileAsBlob(path: string): Promise<ArrayBuffer>
}