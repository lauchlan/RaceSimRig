import { IndexedBuffer } from "./indexedBuffer";

export interface Triple {
  x: number;
  y: number;
  z: number;
}

export interface Tyres {
  frontLeft: number;
  frontRight: number;
  rearLeft: number;
  rearRight: number;
}

export class CarDashMessage {
  isRaceOn: boolean = false;
  timestampMS: number = NaN;
  engineMaxRpm: number = NaN;
  engineIdleRpm: number = NaN;
  currentEngineRpm: number = NaN;

  acceleration: Triple = { x: NaN, y: NaN, z: NaN }; //In the car's local space; X = right, Y = up, Z = forward
  velocity: Triple = { x: NaN, y: NaN, z: NaN }; //In the car's local space; X = right, Y = up, Z = forward
  angularVelocity: Triple = { x: NaN, y: NaN, z: NaN }; //In the car's local space; X = pitch, Y = yaw, Z = roll

  yaw: number = NaN;
  pitch: number = NaN;
  roll: number = NaN;

  normalizedSuspensionTravel: Tyres = {
    frontLeft: NaN,
    frontRight: NaN,
    rearLeft: NaN,
    rearRight: NaN,
  }; // Suspension travel normalized: 0.0f = max stretch; 1.0 = max compression
  tireSlipRatio: Tyres = {
    frontLeft: NaN,
    frontRight: NaN,
    rearLeft: NaN,
    rearRight: NaN,
  }; // Tire normalized slip ratio, = 0 means 100% grip and |ratio| > 1.0 means loss of grip.
  wheelRotationSpeed: Tyres = {
    frontLeft: NaN,
    frontRight: NaN,
    rearLeft: NaN,
    rearRight: NaN,
  }; // Wheel rotation speed radians/sec.
  wheelOnRumbleStrip: Tyres = {
    frontLeft: NaN,
    frontRight: NaN,
    rearLeft: NaN,
    rearRight: NaN,
  }; // = 1 when wheel is on rumble strip, = 0 when off.
  wheelInPuddleDepth: Tyres = {
    frontLeft: NaN,
    frontRight: NaN,
    rearLeft: NaN,
    rearRight: NaN,
  }; // = from 0 to 1, where 1 is the deepest puddle
  surfaceRumble: Tyres = {
    frontLeft: NaN,
    frontRight: NaN,
    rearLeft: NaN,
    rearRight: NaN,
  }; // Non-dimensional surface rumble values passed to controller force feedback
  tireSlipAngle: Tyres = {
    frontLeft: NaN,
    frontRight: NaN,
    rearLeft: NaN,
    rearRight: NaN,
  }; // Tire normalized slip angle, = 0 means 100% grip and |angle| > 1.0 means loss of grip.
  tireCombinedSlip: Tyres = {
    frontLeft: NaN,
    frontRight: NaN,
    rearLeft: NaN,
    rearRight: NaN,
  }; // Tire normalized combined slip, = 0 means 100% grip and |slip| > 1.0 means loss of grip.
  suspensionTravelMeters: Tyres = {
    frontLeft: NaN,
    frontRight: NaN,
    rearLeft: NaN,
    rearRight: NaN,
  }; // Actual suspension travel in meters

  carOrdinal: number = NaN; //Unique ID of the car make/model
  carClass: number = NaN; //Between 0 (D -- worst cars) and 7 (X class -- best cars) inclusive
  carPerformanceIndex: number = NaN; //Between 100 (slowest car) and 999 (fastest car) inclusive
  drivetrainType: number = NaN; //Corresponds to EDrivetrainType; 0 = FWD, 1 = RWD, 2 = AWD
  numCylinders: number = NaN; //Number of cylinders in the engine
  position: Triple = { x: NaN, y: NaN, z: NaN }; //Position (meters)
  speed: number = NaN; // meters per second
  power: number = NaN; // watts
  torque: number = NaN; // newton meter

  tireTemp: Tyres = {
    frontLeft: NaN,
    frontRight: NaN,
    rearLeft: NaN,
    rearRight: NaN,
  };

  boost: number = NaN;
  fuel: number = NaN;
  distanceTraveled: number = NaN;
  bestLap: number = NaN; // seconds
  lastLap: number = NaN; // seconds
  currentLap: number = NaN; //seconds
  currentRaceTime: number = NaN; //seconds
  lapNumber: number = NaN;
  racePosition: number = NaN;
  accel: number = NaN; // 0 - 255
  brake: number = NaN; // 0 - 255
  clutch: number = NaN;
  handBrake: number = NaN;
  gear: number = NaN;
  steer: number = NaN;
  normalizedDrivingLine: number = NaN;
  normalizedAIBrakeDifference: number = NaN;

  constructor(message: IndexedBuffer | null = null, isHorizon4Format: boolean) {
    if (!message) {
      return;
    }

    // sled properties

    this.isRaceOn = message.readInt32() == 1;

    this.timestampMS = message.readInt32(); //Getting wrong data
    this.engineMaxRpm = message.readFloatLE();
    this.engineIdleRpm = message.readFloatLE();
    this.currentEngineRpm = message.readFloatLE();

    this.acceleration = message.readTriple();

    this.velocity = message.readTriple();

    this.angularVelocity = message.readTriple();

    this.yaw = message.readFloatLE();
    this.pitch = message.readFloatLE();
    this.roll = message.readFloatLE();

    this.normalizedSuspensionTravel = message.readTyres();
    this.tireSlipRatio = message.readTyres();
    this.wheelRotationSpeed = message.readTyres();
    this.wheelOnRumbleStrip = message.readTyres();
    this.wheelInPuddleDepth = message.readTyres();
    this.surfaceRumble = message.readTyres();
    this.tireSlipAngle = message.readTyres();
    this.tireCombinedSlip = message.readTyres();
    this.suspensionTravelMeters = message.readTyres();

    this.carOrdinal = message.readInt32();
    this.carClass = message.readInt32();
    this.carPerformanceIndex = message.readInt32();
    this.drivetrainType = message.readInt32();
    this.numCylinders = message.readInt32();

    // start of car dash properties

    if (isHorizon4Format) {
      message.advancePosition(12);
    }

    this.position = message.readTriple();

    this.speed = message.readFloatLE();
    this.power = message.readFloatLE();
    this.torque = message.readFloatLE();

    this.tireTemp = message.readTyres();

    this.boost = message.readFloatLE();
    this.fuel = message.readFloatLE();
    this.distanceTraveled = message.readFloatLE();
    this.bestLap = message.readFloatLE();
    this.lastLap = message.readFloatLE();
    this.currentLap = message.readFloatLE();
    this.currentRaceTime = message.readFloatLE();

    this.lapNumber = message.readUInt16();
    this.racePosition = message.readUInt8();

    this.accel = message.readUInt8();
    this.brake = message.readUInt8();
    this.clutch = message.readUInt8();
    this.handBrake = message.readUInt8();
    this.gear = message.readUInt8();
    this.steer = message.readUInt8();

    this.normalizedDrivingLine = message.readUInt8();
    this.normalizedAIBrakeDifference = message.readUInt8();
  }
}
