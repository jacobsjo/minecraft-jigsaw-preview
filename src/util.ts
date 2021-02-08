import { vec3 } from 'gl-matrix'

export function shuffleArray<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array
}

export function getRandomInt(max: number) : number {
    return Math.floor(Math.random() * Math.floor(max));
}


export function clamp(a: number, b: number, c: number): number {
	return Math.max(b, Math.min(c, a))
}

export function clampVec3(a: vec3, b: vec3, c: vec3): void {
	a[0] = clamp(a[0], b[0], c[0])
	a[1] = clamp(a[1], b[1], c[1])
	a[2] = clamp(a[2], b[2], c[2])
}

export function negVec3(a: vec3): vec3 {
	return vec3.fromValues(-a[0], -a[1], -a[2])
}
