import { CarDashMessage } from "./carDashMessage";
import { Fan } from "./fanType";

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

  processNewMessage(carDashMessage: CarDashMessage) {
    const isRaceOn = carDashMessage.isRaceOn;

    this.speed = carDashMessage.speed;
    this.gear = carDashMessage.gear;

    this.maxRpm = carDashMessage.engineMaxRpm;
    this.currentRpm = carDashMessage.currentEngineRpm;
    this.idleRpm = carDashMessage.engineIdleRpm;

    if (!isRaceOn) {
      if (!this.resetRaceTimeout) {
        this.resetRaceTimeout = setTimeout(() => {
          this.maxObservedSpeed = this.INITIAL_MAX_SPEED;

          if (this.spinDownFansTimeout) {
            clearTimeout(this.spinDownFansTimeout);
            this.spinDownFansTimeout = null;
          }
          this.fanA.setSpeed(0);
          this.fanB.setSpeed(0);
        }, 90000);
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
    }
  }

  statusMsg(): string {
    const speedMph: number = Math.round(this.speed * this.MPH_MULTIPLIER);
    const maxSpeedMph: number = Math.round(
      this.maxObservedSpeed * this.MPH_MULTIPLIER
    );

    return `[Status] Race On:${this.isRaceOn}, Speed: ${speedMph}mph, Max Speed ${maxSpeedMph} Gear:${this.gear}, fan A: ${this.fanA.percentageStrength}%, fan B: ${this.fanB.percentageStrength}%`;
  }
}
