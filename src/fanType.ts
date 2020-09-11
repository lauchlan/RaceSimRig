export class Fan {
  name: string;
  pwmSpeed = 0;
  override = false;
  percentageStrength: number = 0;

  constructor(name: string) {
    this.name = name;
  }

  setSpeed(speed: number, force: boolean = false) {
    if (!this.override || force) {
      this.pwmSpeed = speed;
      this.percentageStrength = Math.round((this.pwmSpeed / 255) * 100);
    }
  }
}
