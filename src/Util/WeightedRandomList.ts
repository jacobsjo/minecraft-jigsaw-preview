import { Json, Random } from "deepslate";

export class WeightedRandomList<T>{
    private totalWeight: number
    constructor(
        private entries: {weight: number, data: T}[]
    ){
        this.totalWeight = entries.map(e => e.weight).reduce((a, b) => a+b, 0)
    }

    public static fromJson<T>(json: unknown, data_decoder: (obj: unknown) => T){
        return new WeightedRandomList(Json.readArray(json, obj => {
            const inner = Json.readObject(obj)
            return {
                weight: Json.readInt(inner.weight),
                data: data_decoder(inner.data)
            }
        }))
    }

    public getRandomElement(random: Random): T{
        let r = random.nextInt(this.totalWeight)

        for (const e of this.entries) {
            r -= e.weight
            if (r < 0) {
                return e.data
            }
        }
 
        return this.entries[this.entries.length - 1].data
    }
}