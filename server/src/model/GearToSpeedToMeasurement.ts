import { TopNValues } from "./topNValues";

export class GearToSpeedToMeasurement {
  private data: TopNValues[][] = [];
  private numGears: number;
  private percentile: number = 95;

  constructor(numGears: number, percentile: number) {
    this.numGears = numGears;
    this.percentile = percentile;

    this.reset();
  }

  reset() {
    this.data = new Array<TopNValues[]>(this.numGears);
    for (let i = 0; i < this.numGears; ++i) {
      this.data[i] = new Array<TopNValues>(300);
    }
  }

  value(gear: number, currentMph: number): number {
    return this.data[gear][currentMph]?.getValue(this.percentile);
  }

  statusMsg() {
    let str = "";
    this.data.forEach((speeds: TopNValues[], gear: number) => {
      str += gear + ":";
      speeds.forEach((value: TopNValues, speed) => {
        let output = "";
        if (value) {
          output = "" + value.getValue(this.percentile);
        }

        str += ` ${speed}:${output}`;
      });
      str = str + "\n";
    });

    return str;
  }

  setValue(gear: number, currentMph: number, value: number): number {
    if (!this.data[gear][currentMph]) {
      this.data[gear][currentMph] = new TopNValues(100);
    }
    this.data[gear][currentMph].addValue(value);
    return value;
  }

  findMaxValue(gear: number): { maxSpeed: number; maxValue: number } {
    let maxValue: number = 0;
    let maxSpeed: number = 0;

    this.data[gear].forEach((value: TopNValues, speed: number) => {
      if (value.getValue(this.percentile) > maxValue) {
        maxValue = value.getValue(this.percentile);
        maxSpeed = speed;
      }
    });

    return { maxSpeed, maxValue };
  }

  findFirstValueForSpeed(
    gear: number,
    speed: number,
    defaultVal: number
  ): number {
    if (gear < 1 || gear > this.numGears - 1) {
      return defaultVal;
    }
    const filtered = this.data[gear].filter(
      (value: TopNValues, index: number) => {
        return (
          speed > 0 &&
          index >= speed &&
          value?.getValue(this.percentile) != undefined
        );
      }
    );

    const val: number = filtered.length
      ? filtered[0]?.getValue(this.percentile)
      : defaultVal;
    return val;
  }

  findSpeedWhereNextGearHasHigherValue(
    gear: number
  ): { speed: number; value: number } {
    let speed = 0;
    let value = 0;

    const values: TopNValues[] = this.data[gear];
    const nextGearValues: TopNValues[] = this.data[gear + 1];

    for (let i = 0; i < values.length; ++i) {
      if (
        nextGearValues[i]?.getValue(this.percentile) >
        values[i]?.getValue(this.percentile)
      ) {
        speed = i;
        value = values[i]?.getValue(this.percentile);
        break;
      }
    }

    return { speed, value };
  }
}
