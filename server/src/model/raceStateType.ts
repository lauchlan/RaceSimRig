import { CarDashMessage } from "./carDashMessage";
import { Fan } from "./fanType";
import { GearAnalysis } from "./gearAnalysis";

export class RaceState {
  readonly MPH_MULTIPLIER: number = 2.23694;
  readonly INITIAL_MAX_SPEED = 120 / this.MPH_MULTIPLIER; // m/s

  private resetRaceTimeout: NodeJS.Timeout | null = null;
  private spinDownFansTimeout: NodeJS.Timeout | null = null;

  maxObservedSpeed: number = this.INITIAL_MAX_SPEED;
  isRaceOn: boolean = false;

  fanA = new Fan("A");
  fanB = new Fan("B");

  speed: number = 0;
  gear: number = 0;

  maxRpm: number = 0;
  currentRpm: number = 0;
  idleRpm: number = 0;

  isAccelerating: boolean = false;
  isBraking: boolean = false;

  torque: number = 0;

  lap: number = 0;

  gearAnalysis: GearAnalysis;

  updateTime: number = 0;
  accel: number = 0;
  brake: number = 0;
  raceTime: number = 0;
  timeStamp: number = 0;

  constructor(enableVoice: boolean) {
    this.gearAnalysis = new GearAnalysis(enableVoice);
  }

  processNewMessage(carDashMessage: CarDashMessage) {
    const time = Date.now();

    this.isRaceOn = carDashMessage.isRaceOn;
    this.speed = carDashMessage.speed;
    this.gear = carDashMessage.gear;
    this.maxRpm = carDashMessage.engineMaxRpm;
    this.currentRpm = Math.floor(carDashMessage.currentEngineRpm);
    this.idleRpm = carDashMessage.engineIdleRpm;
    this.isAccelerating = carDashMessage.accel > 0;
    this.isBraking = carDashMessage.brake > 0;
    this.torque = Math.floor(carDashMessage.torque);
    this.lap = carDashMessage.lapNumber;
    this.accel = carDashMessage.accel;
    this.brake = carDashMessage.brake;

    this.raceTime = Math.floor(carDashMessage.currentRaceTime);
    this.timeStamp = Math.floor(carDashMessage.timestampMS);

    if (!this.isRaceOn) {
      if (!this.resetRaceTimeout) {
        this.resetRaceTimeout = setTimeout(() => {
          this.maxObservedSpeed = this.INITIAL_MAX_SPEED;

          if (this.spinDownFansTimeout) {
            clearTimeout(this.spinDownFansTimeout);
            this.spinDownFansTimeout = null;
          }

          console.log("resetting");
          this.fanA.setSpeed(0);
          this.fanB.setSpeed(0);

          this.gearAnalysis.reset();
        }, 120000);
      }

      if (!this.spinDownFansTimeout) {
        this.spinDownFansTimeout = setInterval(() => {
          this.fanA.setSpeed(Math.round(this.fanA.pwmSpeed * 0.9));
          this.fanB.setSpeed(Math.round(this.fanB.pwmSpeed * 0.9));
        }, 1000);
      }
    } else {
      if (this.resetRaceTimeout) {
        clearTimeout(this.resetRaceTimeout);
        this.resetRaceTimeout = null;
      }

      if (this.spinDownFansTimeout) {
        clearTimeout(this.spinDownFansTimeout);
        this.spinDownFansTimeout = null;
      }

      this.fanA.setSpeed(
        Math.floor((carDashMessage.speed / this.maxObservedSpeed) * 255)
      );
      this.fanB.setSpeed(
        Math.floor((carDashMessage.speed / this.maxObservedSpeed) * 255)
      );

      this.maxObservedSpeed = Math.max(
        carDashMessage.speed,
        this.maxObservedSpeed
      );

      this.gearAnalysis.captureTorqueAndRevs(
        this.timeStamp,
        this.gear,
        Math.floor(this.speed * this.MPH_MULTIPLIER),
        this.torque,
        this.currentRpm,
        this.maxRpm,
        this.idleRpm,
        this.accel
      );
    }

    if (this.isRaceOn) {
    }
  }

  statusMsg(verbose: boolean): string {
    const speedMph: number = Math.round(this.speed * this.MPH_MULTIPLIER);
    const maxSpeedMph: number = Math.round(
      this.maxObservedSpeed * this.MPH_MULTIPLIER
    );

    let str = `[Status] Race:${this.isRaceOn} time: ${
      this.timeStamp / 1000
    } Speed:${speedMph}/${maxSpeedMph}mph RPM:${this.currentRpm} Gear:${
      this.gear
    } accel:${this.accel} brake:${this.brake} torque:${this.torque} fan A: ${
      this.fanA.percentageStrength
    }%, fan B: ${this.fanB.percentageStrength}%\n`;

    if (verbose) {
      str += this.gearAnalysis.revsAndTourqueStatus();
    }

    str = str + "\n";
    str += this.gearAnalysis.revTableStatus();

    return str;
  }
}
