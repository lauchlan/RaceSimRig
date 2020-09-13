export class GearToSpeedToMeasurement {
  private data: number[][] = [];
  private numGears: number;

  constructor(numGears: number) {
    this.numGears = numGears;
    this.reset();
  }

  reset() {
    this.data = new Array<number[]>(this.numGears);
    for (let i = 0; i < this.numGears; ++i) {
      this.data[i] = new Array<number>(300);
    }
  }

  value(gear: number, currentMph: number): number {
    return this.data[gear][currentMph];
  }

  statusMsg() {
    let str = "";
    this.data.forEach((speeds: number[], gear: number) => {
      str += gear + ":";
      speeds.forEach((value, speed) => {
        let output = "";
        if (value != undefined) {
          output = "" + value;
        }

        str += ` ${speed}:${output}`;
      });
      str = str + "\n";
    });

    return str;
  }

  setValue(gear: number, currentMph: number, value: number): number {
    this.data[gear][currentMph] = value;
    return value;
  }

  findFirstValueForSpeed(
    gear: number,
    speed: number,
    defaultVal: number
  ): number {
    const filtered = this.data[gear].filter((value, index) => {
      return speed > 0 && index >= speed && value != undefined;
    });

    console.log("Found speeds", filtered.length);
    const val = filtered.length ? filtered[0] : defaultVal;
    return val;
  }

  findSpeedWhereNextGearHasHigherValue(gear: number) {
    let speed = 0;

    const values = this.data[gear];
    const nextGearValues = this.data[gear + 1];

    for (let i = 0; i < values.length; ++i) {
      if (nextGearValues[i] > values[i]) {
        speed = i;
        break;
      }
    }

    return speed;
  }
}
