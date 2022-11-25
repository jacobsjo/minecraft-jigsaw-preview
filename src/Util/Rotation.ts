

export enum Rotation {
    Rotate0 = 0,
    Rotate90 = 1,
    Rotate180 = 2,
    Rotate270 = 3,
}

export namespace Rotation {
    export function getFacingMapping(rot: Rotation): {[name: string]: string}{
      switch (rot) {
        case Rotation.Rotate0:
          return {
            "north": "north",
            "east": "east",
            "south": "south",
            "west": "west",
            "up": "up",
            "down": "down",
            "ascending": "ascending"  // ascending: hack to allow easy use of facing mapping with rails
          }
        case Rotation.Rotate270:
          return {
            "north": "west",
            "east": "north",
            "south": "east",
            "west": "south",
            "up": "up",
            "down": "down",
            "ascending": "ascending"
          }
        case Rotation.Rotate180:
          return {
            "north": "south",
            "east": "west",
            "south": "north",
            "west": "east",
            "up": "up",
            "down": "down",
            "ascending": "ascending"
          }
      case Rotation.Rotate90:
        return {
          "north": "east",
          "east": "south",
          "south": "west",
          "west": "north",
          "up": "up",
          "down": "down",
          "ascending": "ascending"
      }
      }
    }  

    export function invert(rot: Rotation): Rotation{
        switch (rot) {
            case Rotation.Rotate0:
                return Rotation.Rotate0
            case Rotation.Rotate90:
                return Rotation.Rotate270
            case Rotation.Rotate180:
                return Rotation.Rotate180
            case Rotation.Rotate270:
                return Rotation.Rotate90
        }
    }
  }