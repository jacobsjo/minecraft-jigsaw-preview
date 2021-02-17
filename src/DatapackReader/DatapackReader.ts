

interface DatapackReader {
    hasFile(path: string): boolean
    getFilesInPath(path: string): string[]
    getPathsInPath(path: string): string[]

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    readFileAsJson(path: string): Promise<any>
    readFileAsBlob(path: string): Promise<ArrayBuffer>
}