
export class SequencedPriorityList<T> {
    private valuesByPriority = new Map<number, T[]>()
    
    public add(object: T, priority: number){
        if (!Number.isInteger(priority))
            throw new Error("priority must be integer")

        if (!this.valuesByPriority.has(priority))
            this.valuesByPriority.set(priority, [])

        this.valuesByPriority.get(priority).push(object)
    }

    public getNext(){
        if (this.valuesByPriority.size === 0){
            return undefined
        }
        return [...this.valuesByPriority.entries()].reduce((prev, curr) => prev[0] > curr[0] || curr[1].length === 0 ? prev : curr, [Number.NEGATIVE_INFINITY, []])[1].shift()
    }

}