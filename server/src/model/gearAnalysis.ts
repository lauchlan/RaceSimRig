import { GearToSpeedToMeasurement } from "./GearToSpeedToMeasurement";

const { exec } = require("child_process");

export class GearAnalysis {
  private gearToSpeedToTorque: GearToSpeedToMeasurement;
  private gearToSpeedToRpm: GearToSpeedToMeasurement;
  private gearToMinMaxRevs: {
    minRevs: number;
    maxRevs: number;
    minMph: number;
    maxMph: number;
    minTorque: number;
    maxTorque: number;
  }[] = [];

  private lastAdviceOnGearUp: number = -1; // The gear advice was last given to go up from
  private lastAdviceOnGearDown: number = -1; // The gear advice was last given to go down from
  private readonly enableVoice: boolean = false;
  private isTalking: boolean = false;

  private timeOfLastGearChange: number = 0;
  private hasRecentlyChangeGear: boolean = false;
  private previousGear: number = 0;
  private previousRpm: number = 0;

  constructor(enableVoice: boolean) {
    this.enableVoice = enableVoice;
    this.gearToSpeedToTorque = new GearToSpeedToMeasurement(8, 100);
    this.gearToSpeedToRpm = new GearToSpeedToMeasurement(8, 95);

    this.reset();

    console.log(`[CoPilot] Voice prompts enabled: ${this.enableVoice}`);
  }

  reset() {
    this.timeOfLastGearChange = 0;
    this.hasRecentlyChangeGear = false;
    this.previousGear = 0;
    this.previousRpm = 0;

    this.gearToSpeedToTorque.reset();
    this.gearToSpeedToRpm.reset();

    this.gearToMinMaxRevs = [
      {
        minRevs: 0,
        maxRevs: 0,
        minMph: 0,
        maxMph: 0,
        minTorque: 0,
        maxTorque: 0,
      },
      {
        minRevs: 0,
        maxRevs: 0,
        minMph: 0,
        maxMph: 0,
        minTorque: 0,
        maxTorque: 0,
      },
      {
        minRevs: 0,
        maxRevs: 0,
        minMph: 0,
        maxMph: 0,
        minTorque: 0,
        maxTorque: 0,
      },
      {
        minRevs: 0,
        maxRevs: 0,
        minMph: 0,
        maxMph: 0,
        minTorque: 0,
        maxTorque: 0,
      },
      {
        minRevs: 0,
        maxRevs: 0,
        minMph: 0,
        maxMph: 0,
        minTorque: 0,
        maxTorque: 0,
      },
      {
        minRevs: 0,
        maxRevs: 0,
        minMph: 0,
        maxMph: 0,
        minTorque: 0,
        maxTorque: 0,
      },
      {
        minRevs: 0,
        maxRevs: 0,
        minMph: 0,
        maxMph: 0,
        minTorque: 0,
        maxTorque: 0,
      },
      {
        minRevs: 0,
        maxRevs: 0,
        minMph: 0,
        maxMph: 0,
        minTorque: 0,
        maxTorque: 0,
      },
    ];

    this.lastAdviceOnGearUp = -1;
    this.lastAdviceOnGearDown = -1;
  }

  captureTorqueAndRevs(
    time: number,
    gear: number,
    speedMph: number,
    torque: number,
    rpm: number,
    maxRpm: number,
    idleRpm: number,
    accel: number
  ) {
    if (gear > 6) {
      return;
    }

    speedMph = this.roundToNearest(speedMph, 3);

    this.checkForGearChange(gear, time);

    this.captureSpeedToTorque(torque, gear, speedMph);
    this.captureSpeedToRevs(rpm, gear, speedMph);

    this.updateStatsTable(gear, maxRpm);
    this.issueGearAdvice(accel > 0, gear, rpm, maxRpm);

    this.previousGear = gear;
    this.previousRpm = rpm;
  }

  private checkForGearChange(gear: number, time: number) {
    if (gear != this.previousGear) {
      this.timeOfLastGearChange = time;

      this.lastAdviceOnGearUp = -1;
      this.lastAdviceOnGearDown = -1;

      let rating = "";

      if (this.previousGear) {
        if (gear > this.previousGear) {
          const maxRpmForChange = this.gearToMinMaxRevs[this.previousGear]
            .maxRevs;

          if (maxRpmForChange) {
            const delta = this.previousRpm - maxRpmForChange;
            const deltaPercent = delta / maxRpmForChange;

            if (Math.abs(delta) < 100) {
              rating = "excellent";
            } else if (delta < 300) {
              rating = "good";
            } else if (delta < 500) {
              rating = "fair";
            } else {
              rating = "poor";
            }

            if (rating != "excellent") {
              rating += delta < 0 ? " early" : " late";
            }
          }
        }
      }

      console.log(
        `[CoPilot] gear changed to ${gear} at ${this.previousRpm} - ${rating}`
      );

      this.speakAdvice(gear + ` ${rating}`);
    }

    this.hasRecentlyChangeGear = time - this.timeOfLastGearChange < 1000;
  }

  private captureSpeedToTorque(torque: number, gear: number, speedMph: number) {
    let value = this.gearToSpeedToTorque.value(gear, speedMph);
    const currentTorque = this.roundToNearest(torque, 10);

    // TODO - what factors do we need to take into account before capturing
    // the torque value? Should probably look at wheel spin....
    if (currentTorque > 0 && (!value || currentTorque >= value)) {
      this.gearToSpeedToTorque.setValue(gear, speedMph, currentTorque);
    }
  }

  private captureSpeedToRevs(rpm: number, gear: number, speedMph: number) {
    let value = this.gearToSpeedToRpm.value(gear, speedMph);

    if (!this.hasRecentlyChangeGear || gear > this.previousGear) {
      const currentRevs = this.roundToNearest(rpm, 50);

      if (!value || currentRevs >= value) {
        this.gearToSpeedToRpm.setValue(gear, speedMph, currentRevs);
      }
    }
  }

  private updateStatsTable(gear: number, maxRpm: number) {
    if (gear > 0 && gear < 7) {
      const curStats = this.gearToMinMaxRevs[gear];

      const {
        speed,
        value: torque,
      } = this.gearToSpeedToTorque.findSpeedWhereNextGearHasHigherValue(gear);

      const maxRevsForCurrentGear = this.gearToSpeedToRpm.findFirstValueForSpeed(
        gear,
        speed,
        Math.floor(maxRpm * 0.9)
      );

      const minRevsForNextGear = this.gearToSpeedToRpm.findFirstValueForSpeed(
        gear + 1,
        speed,
        Math.floor(maxRpm * 0.4)
      );

      this.gearToMinMaxRevs[gear].maxTorque = torque;
      this.gearToMinMaxRevs[gear + 1].minTorque = torque;

      if (
        this.gearToMinMaxRevs[gear].maxRevs == 0 ||
        this.gearToMinMaxRevs[gear].maxRevs > minRevsForNextGear
      ) {
        this.gearToMinMaxRevs[gear].maxRevs = maxRevsForCurrentGear;
        this.gearToMinMaxRevs[gear].maxMph = speed;
      }

      if (
        this.gearToMinMaxRevs[gear + 1].maxRevs == 0 ||
        this.gearToMinMaxRevs[gear + 1].maxRevs > minRevsForNextGear
      ) {
        this.gearToMinMaxRevs[gear + 1].minRevs = minRevsForNextGear;
        this.gearToMinMaxRevs[gear + 1].minMph = speed;
      } else {
        console.warn(
          `[CoPilot] Tried to set ${minRevsForNextGear}/${
            this.gearToMinMaxRevs[gear + 1].maxRevs
          } for gear ${gear + 1}`
        );
      }
    }
  }

  private issueGearAdvice(
    isAccelerating: boolean,
    gear: number,
    rpm: number,
    maxRpm: number
  ) {
    if (!isAccelerating) {
      return;
    }

    if (this.lastAdviceOnGearUp != gear) {
      const shouldChangeUp = this.shouldChangeUp(gear, rpm, maxRpm);

      if (shouldChangeUp) {
        this.lastAdviceOnGearUp = gear;
        this.lastAdviceOnGearDown = -1;

        console.log("[CoPilot] Adivce: Gear up to ", gear + 1);
        this.speakAdvice(`up to ${gear + 1}`);

        return;
      }
    }

    if (this.lastAdviceOnGearDown != gear) {
      const shouldChangeDown = this.shouldChangeDown(gear, rpm, maxRpm);

      if (shouldChangeDown) {
        this.lastAdviceOnGearDown = gear;
        this.lastAdviceOnGearUp = -1;

        console.log("[CoPilot] Gear down to ", gear - 1);
        this.speakAdvice(`down to ${gear - 1}`);
      }
    }
  }

  private shouldChangeUp(gear: number, rpm: number, maxRpm: number) {
    if (gear > 6) {
      return false;
    }

    let shouldChangeUp = false;

    let rpmLimit = this.gearToMinMaxRevs[gear].maxRevs;

    if (!rpmLimit) {
      rpmLimit = maxRpm * 0.9;
    }

    shouldChangeUp = rpm >= rpmLimit;
    return shouldChangeUp;
  }

  private shouldChangeDown(gear: number, rpm: number, maxRpm: number) {
    if (gear < 2) {
      return false;
    }

    let shouldChangeDown = false;

    let rpmLimit = this.gearToMinMaxRevs[gear].maxRevs;

    if (rpmLimit) {
      rpmLimit = maxRpm * 0.5;
    }

    shouldChangeDown = rpm < rpmLimit;
    return shouldChangeDown;
  }

  private speakAdvice(advice: string) {
    if (this.enableVoice && !this.isTalking) {
      exec(`say -v "Fiona" -r 150 "${advice}"`);

      //this.isTalking = true;
      //setTimeout(() => (this.isTalking = false), 5);
    }
  }

  private roundToNearest(torque: number, unit: number): number {
    return Math.round(torque / unit) * unit;
  }

  revsAndTourqueStatus() {
    let str = "Revs\n--------\n";
    str += this.gearToSpeedToRpm.statusMsg();

    str += "Torque\n--------\n";
    str += this.gearToSpeedToTorque.statusMsg();

    return str;
  }

  revTableStatus() {
    let str = " G:     Revs      MPH  Torque\n";
    this.gearToMinMaxRevs.forEach((data, gear: number) => {
      str = `${str} ${gear}: ${data.minRevs
        .toString()
        .padStart(5)}:${data.maxRevs
        .toString()
        .padEnd(5)} ${data.minMph
        .toString()
        .padStart(3)}:${data.maxMph
        .toString()
        .padEnd(3)} ${data.minTorque
        .toString()
        .padStart(3)}:${data.maxTorque.toString().padEnd(3)}\n`;
    });

    return str;
  }
}
