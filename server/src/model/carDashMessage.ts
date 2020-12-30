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
enum EUDPStreamerPacketHandlerType
{
	eCarPhysics = 0,
	eRaceDefinition = 1,
	eParticipants = 2,
	eTimings = 3,
	eGameState = 4,
	eWeatherState = 5, // not sent at the moment, information can be found in the game state packet
	eVehicleNames = 6, //not sent at the moment
	eTimeStats = 7,
	eParticipantVehicleNames = 8
};

  
export class CarDashMessage {

  categoryCount: number = 0; // message counter for category (pcars)
  isValid: boolean = false;

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

  constructor(message: IndexedBuffer | null = null, isHorizon4Format: boolean, isPCars2: boolean = false) {
    if (!message) {
      return;
    }

    // sled properties

    if (isPCars2) {
      this.parsePCars2(message);
    }
    else {
      this.isValid = true;
      this.parseForza(message, isHorizon4Format);
    }

  }

  private parsePCars2(message:IndexedBuffer) {

    
    message.readUInt32(); //0 counter reflecting all the packets that have been sent during the game run
    this.categoryCount = message.readUInt32();	//4 counter of the packet groups belonging to the given category
    message.readUInt8();  	//8 If the data from this class had to be sent in several packets, the index number
    message.readUInt8(); 		//9 If the data from this class had to be sent in several packets, the total number
    const packetType = message.readUInt8(); //	//10 what is the type of this packet (see EUDPStreamerPacketHanlderType for details)
    const mPacketVersion = message.readUInt8();

    if (packetType == EUDPStreamerPacketHandlerType.eCarPhysics) {
      this.isRaceOn = true;
      this.isValid = true;
      message.advancePosition(1); // sViewedParticipantIndex;	 12 1
      this.accel = message.readUInt8();
      this.brake = message.readUInt8();
      this.steer = message.readUInt8();
      this.clutch = message.readInt8();
      
      message.advancePosition(12);
      // Car state
      /*
			unsigned char							sCarFlags;												// 17 1
			signed short							sOilTempCelsius;									// 18 2
			unsigned short							sOilPressureKPa;									// 20 2
			signed short							sWaterTempCelsius;								// 22 2
			unsigned short							sWaterPressureKpa;								// 24 2
			unsigned short							sFuelPressureKpa;									// 26 2
      unsigned char							sFuelCapacity;										// 28 1
      */
      
      

      this.brake = message.readUInt8();
      this.accel = message.readUInt8();
      this.clutch = message.readInt8();

      this.fuel = message.readFloatLE();
      this.speed = message.readFloatLE();
      this.currentEngineRpm = message.readUInt16();
      this.engineMaxRpm = message.readUInt16();

      this.steer = message.readUInt8();
      this.gear = message.readUInt8() & 0xf;
      if (this.gear == 15) this.gear = 0;

      message.advancePosition(2);
      /*
			unsigned char							sBoostAmount;											// 46 1
      unsigned char							sCrashState;											// 47 1
      */

      message.advancePosition(88);
      /*
			float							sOdometerKM;											// 48 4
			float							sOrientation[3];									// 52 12
			float							sLocalVelocity[3];								// 64 12
			float							sWorldVelocity[3];								// 76 12
			float							sAngularVelocity[3];							// 88 12
			float							sLocalAcceleration[3];						// 100 12
			float							sWorldAcceleration[3];						// 112 12
      float							sExtentsCentre[3];								// 124 12
      */

      message.advancePosition(218);
      /*
			unsigned char							sTyreFlags[4];										// 136 4
			unsigned char							sTerrain[4];											// 140 4
			float							sTyreY[4];												// 144 16
			float							sTyreRPS[4];											// 160 16
			unsigned char							sTyreTemp[4];											// 176 4
			float							sTyreHeightAboveGround[4];				// 180 16
			unsigned char							sTyreWear[4];											// 196 4
			unsigned char							sBrakeDamage[4];									// 200 4
			unsigned char							sSuspensionDamage[4];							// 204 4
			signed short							sBrakeTempCelsius[4];							// 208 8
			unsigned short							sTyreTreadTemp[4];								// 216 8
			unsigned short							sTyreLayerTemp[4];								// 224 8
			unsigned short							sTyreCarcassTemp[4];							// 232 8
			unsigned short							sTyreRimTemp[4];									// 240 8
			unsigned short							sTyreInternalAirTemp[4];					// 248 8
			unsigned short							sTyreTempLeft[4];									// 256 8
			unsigned short							sTyreTempCenter[4];								// 264 8
			unsigned short							sTyreTempRight[4];								// 272 8
			float							sWheelLocalPositionY[4];					// 280 16
			float							sRideHeight[4];										// 296 16
			float							sSuspensionTravel[4];							// 312 16
			float							sSuspensionVelocity[4];						// 328 16
			unsigned short							sSuspensionRideHeight[4];					// 344 8
      unsigned short							sAirPressure[4];									// 352 8
      */

      message.advancePosition(4);
      //float							sEngineSpeed;											// 360 4
      
      this.torque = message.readFloatLE();
      
      /*
      unsigned char							sWings[2];												// 368 2
			unsigned char							sHandBrake;												// 370 1
																												// Car damage
			unsigned char							sAeroDamage;											// 371 1
			unsigned char							sEngineDamage;										// 372 1
																												//  HW state
			unsigned int							sJoyPad0;													// 376 4
			unsigned char							sDPad;														// 377 1
			char						sTyreCompound[4][TYRE_NAME_LENGTH_MAX]; // 378 160
			float							sTurboBoostPressure;							// 538 4
			float							sFullPosition[3];									// 542 12
			unsigned char							sBrakeBias;												// 554 1 -- quantized brake bias
      unsigned int							sTickCount;		
      */		
    }

  }

  private parseForza(message: IndexedBuffer, isHorizon4Format: boolean) {
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
