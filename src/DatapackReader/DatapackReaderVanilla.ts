
class DatapackReaderVanilla implements DatapackReader{
    hasFile(path: string): Promise<boolean> {
        throw new Error("Method not implemented.");
    }
    getFilesInPath(path: string): Promise<string[]> {
        throw new Error("Method not implemented.");
    }
    readFileAsJson(path: string): Promise<any> {
        throw new Error("Method not implemented.");
    }
    readFileAsBlob(path: string): Promise<ArrayBuffer> {
        throw new Error("Method not implemented.");
    }
}