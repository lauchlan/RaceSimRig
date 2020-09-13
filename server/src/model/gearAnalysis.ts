import { GearToSpeedToMeasurement } from "./GearToSpeedToMeasurement";

const { exec } = require("child_process");

export class GearAnalysis {
  private gearToSpeedToTorque: GearToSpeedToMeasurement;
  private gearToSpeedToRevs: GearToSpeedToMeasurement;
  private gearToMinMaxRevs: { min: number; max: number }[] = [];

  private lastAdviceOnGearUp: number = -1; // The gear advice was last given to go up from
  private lastAdviceOnGearDown: number = -1; // The gear advice was last given to go down from
  private enableVoice: boolean = false;
  private isTalking: boolean = false;

  private timeOfLastGearChange: number = 0;
  private hasRecentlyChangeGear: boolean = false;
  private previousGear: number = 0;
  private previousRpm: number = 0;

  constructor(enableVoice: boolean) {
    this.enableVoice = enableVoice;
    this.gearToSpeedToTorque = new GearToSpeedToMeasurement(8);
    this.gearToSpeedToRevs = new GearToSpeedToMeasurement(8);

    this.reset();

    console.log(`[CoPilot] Voice prompts enabled: ${this.enableVoice}`);
  }

  reset() {
    this.timeOfLastGearChange = 0;
    this.hasRecentlyChangeGear = false;
    this.previousGear = 0;
    this.previousRpm = 0;

    this.gearToSpeedToTorque.reset();
    this.gearToSpeedToRevs.reset();

    this.gearToMinMaxRevs = [
      { min: 0, max: 0 },
      { min: 0, max: 0 },
      { min: 0, max: 0 },
      { min: 0, max: 0 },
      { min: 0, max: 0 },
      { min: 0, max: 0 },
      { min: 0, max: 0 },
      { min: 0, max: 0 },
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
    isAccelerating: boolean
  ) {
    if (gear > 6) {
      return;
    }

    speedMph = this.roundToNearest(speedMph, 3);

    this.checkForGearChange(gear, time);

    this.captureSpeedToTorque(torque, gear, speedMph);
    this.captureSpeedToRevs(rpm, gear, speedMph);

    this.updateRevTable(gear, maxRpm, idleRpm);
    this.issueGearAdvice(isAccelerating, gear, rpm);

    this.previousGear = gear;
    this.previousRpm = rpm;
  }

  private checkForGearChange(gear: number, time: number) {
    if (gear != this.previousGear) {
      console.log(`[CoPilot] gear changed to ${gear} at ${this.previousRpm}`);
      this.timeOfLastGearChange = time;
      this.speakAdvice("" + gear);
    }

    this.hasRecentlyChangeGear = time - this.timeOfLastGearChange < 1000;
  }

  private captureSpeedToTorque(torque: number, gear: number, speedMph: number) {
    let value = this.gearToSpeedToTorque.value(gear, speedMph);
    const currentTorque = this.roundToNearest(torque, 10);

    if (currentTorque > 0 && (!value || currentTorque >= value)) {
      this.gearToSpeedToTorque.setValue(gear, speedMph, currentTorque);
    }
  }

  private captureSpeedToRevs(rpm: number, gear: number, speedMph: number) {
    let value = this.gearToSpeedToRevs.value(gear, speedMph);

    if (!this.hasRecentlyChangeGear || gear > this.previousGear) {
      const currentRevs = this.roundToNearest(rpm, 50);

      if (!value || currentRevs >= value) {
        this.gearToSpeedToRevs.setValue(gear, speedMph, currentRevs);
      }
    }
  }

  private updateRevTable(gear: number, maxRpm: number, idleRpm: number) {
    if (gear > 0 && gear < 7) {
      const curStats = this.gearToMinMaxRevs[gear];

      let speed = this.gearToSpeedToTorque.findSpeedWhereNextGearHasHigherValue(
        gear
      );

      const maxRevsForCurrentGear = this.gearToSpeedToRevs.findFirstValueForSpeed(
        gear,
        speed,
        Math.floor(maxRpm * 0.9)
      );

      const minRevsForNextGear = this.gearToSpeedToRevs.findFirstValueForSpeed(
        gear + 1,
        speed,
        Math.floor(maxRpm * 0.4)
      );

      this.gearToMinMaxRevs[gear].max = maxRevsForCurrentGear;

      if (
        this.gearToMinMaxRevs[gear + 1].max == 0 ||
        this.gearToMinMaxRevs[gear + 1].max > minRevsForNextGear
      ) {
        this.gearToMinMaxRevs[gear + 1].min = minRevsForNextGear;
      } else {
        console.warn(
          `[CoPilot] Tried to set ${minRevsForNextGear}/${
            this.gearToMinMaxRevs[gear + 1].max
          } for gear ${gear + 1}`
        );
      }
    }
  }

  private issueGearAdvice(isAccelerating: boolean, gear: number, rpm: number) {
    if (!isAccelerating) {
      return;
    }

    const shouldChangeUp =
      this.lastAdviceOnGearUp != gear && rpm >= this.gearToMinMaxRevs[gear].max;

    if (shouldChangeUp) {
      this.lastAdviceOnGearUp = gear;
      this.lastAdviceOnGearDown = -1;

      console.log("[CoPilot] Adivce: Gear up to ", gear + 1);
      this.speakAdvice(`up to ${gear + 1}`);
    } else if (gear > 1) {
      const shouldChangeDown =
        this.lastAdviceOnGearDown != gear &&
        rpm <= this.gearToMinMaxRevs[gear].min;

      if (shouldChangeDown) {
        this.lastAdviceOnGearDown = gear;
        this.lastAdviceOnGearUp = -1;
        console.log("[CoPilot] Gear down to ", gear - 1);

        this.speakAdvice(`down to ${gear - 1}`);
      }
    }
  }

  private speakAdvice(advice: string) {
    if (this.enableVoice && !this.isTalking) {
      exec(`say -v "Fiona" -r 150 "${advice}"`);

      this.isTalking = true;
      setTimeout(() => (this.isTalking = false), 50);
    }
  }

  private roundToNearest(torque: number, unit: number): number {
    return Math.round(torque / unit) * unit;
  }

  revsAndTourqueStatus() {
    let str = "Revs\n--------\n";
    str += this.gearToSpeedToRevs.statusMsg();

    str += "Torque\n--------\n";
    str += this.gearToSpeedToTorque.statusMsg();

    return str;
  }

  revTableStatus() {
    let str = "";
    this.gearToMinMaxRevs.forEach((data, gear: number) => {
      str = `${str} ${gear}: ${data.min}:${data.max}\n`;
    });

    return str;
  }
}
