import { GearToSpeedToMeasurement } from "./GearToSpeedToMeasurement";
import { Tyres, CarDashMessage } from "./carDashMessage";

const { exec } = require("child_process");

export class GearAnalysis {
  private gearToSpeedToTorque: GearToSpeedToMeasurement;
  private gearToSpeedToRpm: GearToSpeedToMeasurement;
  private gearToMinMaxMeasurements: {
    minRpm: number;
    maxRpm: number;
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
  private previousTorque: number = 0;
  private previousRpm: number = 0;

  constructor(enableVoice: boolean) {
    this.enableVoice = enableVoice;
    this.gearToSpeedToTorque = new GearToSpeedToMeasurement(9, 100);
    this.gearToSpeedToRpm = new GearToSpeedToMeasurement(9, 100);

    this.reset();

    console.log(`[CoPilot] Voice prompts enabled: ${this.enableVoice}`);
  }

  reset() {
    this.timeOfLastGearChange = 0;
    this.hasRecentlyChangeGear = false;
    this.previousGear = 0;
    this.previousTorque = 0;
    this.previousRpm = 0;

    this.gearToSpeedToTorque.reset();
    this.gearToSpeedToRpm.reset();

    this.gearToMinMaxMeasurements = [
      {
        minRpm: 0,
        maxRpm: 0,
        minMph: 0,
        maxMph: 0,
        minTorque: 0,
        maxTorque: 0,
      },
      {
        minRpm: 0,
        maxRpm: 0,
        minMph: 0,
        maxMph: 0,
        minTorque: 0,
        maxTorque: 0,
      },
      {
        minRpm: 0,
        maxRpm: 0,
        minMph: 0,
        maxMph: 0,
        minTorque: 0,
        maxTorque: 0,
      },
      {
        minRpm: 0,
        maxRpm: 0,
        minMph: 0,
        maxMph: 0,
        minTorque: 0,
        maxTorque: 0,
      },
      {
        minRpm: 0,
        maxRpm: 0,
        minMph: 0,
        maxMph: 0,
        minTorque: 0,
        maxTorque: 0,
      },
      {
        minRpm: 0,
        maxRpm: 0,
        minMph: 0,
        maxMph: 0,
        minTorque: 0,
        maxTorque: 0,
      },
      {
        minRpm: 0,
        maxRpm: 0,
        minMph: 0,
        maxMph: 0,
        minTorque: 0,
        maxTorque: 0,
      },
      {
        minRpm: 0,
        maxRpm: 0,
        minMph: 0,
        maxMph: 0,
        minTorque: 0,
        maxTorque: 0,
      },
      {
        minRpm: 0,
        maxRpm: 0,
        minMph: 0,
        maxMph: 0,
        minTorque: 0,
        maxTorque: 0,
      },
      {
        minRpm: 0,
        maxRpm: 0,
        minMph: 0,
        maxMph: 0,
        minTorque: 0,
        maxTorque: 0,
      },
    ];

    this.lastAdviceOnGearUp = -1;
    this.lastAdviceOnGearDown = -1;
  }

  captureTorqueAndRpm(
    time: number,
    gear: number,
    speedMph: number,
    torque: number,
    rpm: number,
    maxRpm: number,
    idleRpm: number,
    accel: number,
    wheelSlip: Tyres,
    boost: number
  ) {
    if (gear > 8) {
      return;
    }

    speedMph = this.roundToNearest(speedMph, 5);

    this.checkForGearChange(gear, speedMph, rpm, time);

    this.captureSpeedToTorque(torque, gear, speedMph, wheelSlip, accel, boost);

    this.captureSpeedToRpm(rpm, gear, speedMph);

    this.updateStatsTable(gear, maxRpm);

    this.issueGearAdvice(accel > 0, gear, speedMph, rpm, maxRpm);

    this.previousGear = gear;
    this.previousTorque = torque;
    this.previousRpm = rpm;
  }

  private checkForGearChange(
    gear: number,
    speed: number,
    rpm: number,
    time: number
  ) {
    if (gear != this.previousGear) {
      this.timeOfLastGearChange = time;

      this.lastAdviceOnGearUp = -1;
      this.lastAdviceOnGearDown = -1;

      let rating = "";

      const minSpeedForChange = this.gearToMinMaxMeasurements[gear].minMph;
      if (this.previousGear && minSpeedForChange && gear > this.previousGear) {
        const delta = speed - minSpeedForChange;

        if (Math.abs(delta) < 5) {
          rating = "excellent";
        } else if (Math.abs(delta) < 10) {
          rating = "good";
        } else if (Math.abs(delta) < 20) {
          rating = "fair";
        } else {
          rating = "poor";
        }

        if (rating != "excellent") {
          rating += speed < minSpeedForChange ? " early" : " late";
        }
      }

      console.log(
        `[CoPilot] gear changed to ${gear} at ${speed}/${minSpeedForChange} ${this.previousRpm} ${rating}`
      );

      this.speakAdvice(gear + ` ${rating}`);
    }

    this.hasRecentlyChangeGear = time - this.timeOfLastGearChange < 1000;
  }

  private captureSpeedToTorque(
    torque: number,
    gear: number,
    speedMph: number,
    wheelSlip: Tyres,
    accel: number,
    boost: number
  ): boolean {
    let didRecord = false;

    let value = this.gearToSpeedToTorque.value(gear, speedMph);
    const currentTorque = this.roundToNearest(torque, 10);

    const avgFrontSlip = (wheelSlip.frontLeft + wheelSlip.frontRight) / 2;
    const avgRearSlip = (wheelSlip.rearLeft + wheelSlip.rearRight) / 2;

    // TODO - what factors do we need to take into account before capturing
    // the torque value? Should probably look at wheel spin....

    if (
      currentTorque > 0 &&
      accel == 255 &&
      //avgFrontSlip < 0.1 &&
      //avgRearSlip < 0.1 &&
      boost > 5 &&
      (!value || currentTorque >= value)
    ) {
      //console.log(car.boost, currentTorque);
      this.gearToSpeedToTorque.setValue(gear, speedMph, currentTorque);
      didRecord = true;
    }

    return didRecord;
  }

  private captureSpeedToRpm(rpm: number, gear: number, speedMph: number) {
    let value = this.gearToSpeedToRpm.value(gear, speedMph);

    if (!this.hasRecentlyChangeGear || gear > this.previousGear) {
      const currentRpm = this.roundToNearest(rpm, 50);

      if (!value || currentRpm >= value) {
        this.gearToSpeedToRpm.setValue(gear, speedMph, currentRpm);
      }
    }
  }

  private updateStatsTable(gear: number, maxRpm: number) {
    if (gear > 0 && gear < 7) {
      const curStats = this.gearToMinMaxMeasurements[gear];

      const {
        speed,
        value: torque,
      } = this.gearToSpeedToTorque.findSpeedWhereNextGearHasHigherValue(gear);

      const maxRpmForCurrentGear = this.gearToSpeedToRpm.findFirstValueForSpeed(
        gear,
        speed,
        Math.floor(maxRpm * 0.9)
      );

      const minRpmForNextGear = this.gearToSpeedToRpm.findFirstValueForSpeed(
        gear + 1,
        speed,
        Math.floor(maxRpm * 0.4)
      );

      this.gearToMinMaxMeasurements[gear].maxTorque = torque;
      this.gearToMinMaxMeasurements[gear + 1].minTorque = torque;

      if (
        this.gearToMinMaxMeasurements[gear].maxRpm == 0 ||
        this.gearToMinMaxMeasurements[gear].maxRpm > minRpmForNextGear
      ) {
        this.gearToMinMaxMeasurements[gear].maxRpm = maxRpmForCurrentGear;
        this.gearToMinMaxMeasurements[gear].maxMph = speed;
      }

      if (
        this.gearToMinMaxMeasurements[gear + 1].maxRpm == 0 ||
        this.gearToMinMaxMeasurements[gear + 1].maxRpm > minRpmForNextGear
      ) {
        this.gearToMinMaxMeasurements[gear + 1].minRpm = minRpmForNextGear;
        this.gearToMinMaxMeasurements[gear + 1].minMph = speed;
      } else {
        console.warn(
          `[CoPilot] Tried to set ${minRpmForNextGear}/${
            this.gearToMinMaxMeasurements[gear + 1].maxRpm
          } for gear ${gear + 1}`
        );
      }
    }
  }

  private issueGearAdvice(
    isAccelerating: boolean,
    gear: number,
    speed: number,
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

        console.log("[CoPilot] Advice: Gear up to ", gear + 1, speed, rpm);
        this.speakAdvice(`Up to ${gear + 1}`);

        return;
      }
    }

    if (this.lastAdviceOnGearDown != gear) {
      const shouldChangeDown = this.shouldChangeDown(gear, rpm, maxRpm);

      if (shouldChangeDown) {
        this.lastAdviceOnGearDown = gear;
        this.lastAdviceOnGearUp = -1;

        console.log("[CoPilot] Advice: Gear down to ", gear - 1, speed, rpm);
        this.speakAdvice(`Down to ${gear - 1}`);
      }
    }
  }

  private shouldChangeUp(gear: number, rpm: number, maxRpm: number) {
    if (gear > 7) {
      return false;
    }

    let shouldChangeUp = false;

    let rpmLimit = this.gearToMinMaxMeasurements[gear].maxRpm;

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

    let rpmLimit = this.gearToMinMaxMeasurements[gear].minRpm;

    if (!rpmLimit) {
      rpmLimit = maxRpm * 0.5;
    }

    shouldChangeDown = rpm < rpmLimit;

    return shouldChangeDown;
  }

  private speakAdvice(advice: string) {
    if (this.enableVoice && !this.isTalking) {
      exec(`say -v "Fiona" "${advice}"`);

      //this.isTalking = true;
      //setTimeout(() => (this.isTalking = false), 5);
    }
  }

  private roundToNearest(torque: number, unit: number): number {
    return Math.round(torque / unit) * unit;
  }

  rpmAndTourqueStatus() {
    let str = "Rpm\n--------\n";
    str += this.gearToSpeedToRpm.statusMsg();

    str += "Torque\n--------\n";
    str += this.gearToSpeedToTorque.statusMsg();

    return str;
  }

  revTableStatus() {
    let str = " G:     RPM     MPH  Torque\n";
    this.gearToMinMaxMeasurements.forEach((data, gear: number) => {
      str = `${str} ${gear}: ${data.minRpm
        .toString()
        .padStart(5)}:${data.maxRpm
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

  stats() {
    return {
      torque: this.gearToSpeedToTorque.stats(),
    };
  }
}
