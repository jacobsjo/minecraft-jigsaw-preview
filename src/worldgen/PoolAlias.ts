import { Identifier, Json, Random as R } from "deepslate";
import { WeightedRandomList } from "../Util/WeightedRandomList";


export class PoolAliasLookup {
    private map: Map<string, Identifier>
    constructor(elements: [Identifier, Identifier][]){
        this.map = new Map(elements.map(element => [element[0].toString(), element[1]]))
    }  

    public static build(bindings: PoolAliasBinding[], random: R) {
        return new PoolAliasLookup(bindings.flatMap(binding => binding.resolve(random)))
    }

    public lookup(alias: Identifier){
        return this.map.get(alias.toString()) || alias
    }
}

export interface PoolAliasBinding {
    resolve(random: R): [Identifier, Identifier][]
}

export namespace PoolAliasBinding {

    export function fromJson(obj: unknown): PoolAliasBinding{
        const json = Json.readObject(obj)
        const type = Json.readString(json.type)
        switch (type){
            case 'direct':
                return new Direct(Identifier.parse(Json.readString(json.alias)), Identifier.parse(Json.readString(json.target)))
            case 'random':
                return new Random(Identifier.parse(Json.readString(json.alias)), WeightedRandomList.fromJson(json.targets, (obj: unknown) => Identifier.parse(Json.readString(obj))))
            case 'random_group':
                return new RandomGroup(WeightedRandomList.fromJson(json.groups, (obj: unknown) => Json.readArray(obj, (obj: unknown) => fromJson(obj))))
            default:
                throw new Error('invalid pool alias binding type')
        }
    }


    class Direct implements PoolAliasBinding {
        constructor(
            private alias: Identifier,
            private target: Identifier
        ){}

        resolve(): [Identifier, Identifier][] {
            return [[this.alias, this.target]]
        }
    }

    class Random implements PoolAliasBinding {
        constructor(
            private alias: Identifier,
            private targets: WeightedRandomList<Identifier>
        ){}

        resolve(random: R): [Identifier, Identifier][] {
            return [[this.alias, this.targets.getRandomElement(random)]]
        }
    }

    class RandomGroup implements PoolAliasBinding {
        constructor(
            private groups: WeightedRandomList<PoolAliasBinding[]>
        ){}

        resolve(random: R): [Identifier, Identifier][] {
            return this.groups.getRandomElement(random).flatMap(binding => binding.resolve(random))
        }
    }
}