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

  stats() {
    const stats = this.data.reduce(
      (prev: Array<any>, speeds: TopNValues[], gear: number) => {
        prev[gear] = [];
        speeds.forEach((value: TopNValues, speed) => {
          if (value) {
            prev[gear][speed] = value.getValue(this.percentile);
          }
        });

        return prev;
      },
      []
    );

    return stats;
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

    // we're going to start our search from the speed with the highest value
    const { maxSpeed } = this.data[gear].reduce(
      (prev, cur: TopNValues, speed) => {
        const val = cur.getValue(this.percentile);

        if (val >= prev.maxValue) {
          prev.maxValue = val;
          prev.maxSpeed = speed;
        }
        return prev;
      },
      {
        maxValue: 0,
        maxSpeed: 0,
      }
    );

    for (let i = maxSpeed; i < values.length; ++i) {
      const thisValue = values[i]?.getValue(this.percentile);
      let nextGearValue = undefined;

      if (nextGearValues[i] === undefined) {
        let backwardsSearchIndex = i - 1;

        while (backwardsSearchIndex > 0 && nextGearValue === undefined) {
          if (nextGearValues[backwardsSearchIndex]) {
            const prevValue = nextGearValues[backwardsSearchIndex].getValue(
              this.percentile
            );
            if (prevValue !== undefined) {
              nextGearValue = prevValue;
            }
          }
          --backwardsSearchIndex;
        }
      } else {
        nextGearValue = nextGearValues[i].getValue(this.percentile);
      }

      if ((nextGearValue as number) >= thisValue) {
        speed = i;
        value = thisValue;
        return { speed, value };
      }
    }

    return { speed, value };
  }
}
