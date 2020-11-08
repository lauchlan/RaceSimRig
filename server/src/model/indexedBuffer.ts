import { Triple, Tyres } from "./carDashMessage.js";

export class IndexedBuffer {
  private message: Buffer;
  private position: number;

  constructor(msg: Buffer) {
    this.message = msg;
    this.position = 0;
  }

  advancePosition(value: number) {
    this.position += value;
  }

  length() {
    return this.message.length;
  }

  readInt32(): number {
    const val = this.message.readInt32LE(this.position);
    this.position += 4;

    return val;
  }

  readUInt32(): number {
    const val = this.message.readUInt32LE(this.position);
    this.position += 4;

    return val;
  }

  readUInt16(): number {
    const val = this.message.readUInt16LE(this.position);
    this.position += 2;

    return val;
  }

  readUInt8(): number {
    const val = this.message.readUInt8(this.position);
    this.position += 1;

    return val;
  }

  readFloatLE(): number {
    const val = this.message.readFloatLE(this.position);
    this.position += 4;

    return val;
  }

  readTriple(): Triple {
    const x = this.readFloatLE();
    const y = this.readFloatLE();
    const z = this.readFloatLE();

    return { x, y, z };
  }

  readTyres(): Tyres {
    const frontLeft = this.readFloatLE();
    const frontRight = this.readFloatLE();
    const rearLeft = this.readFloatLE();
    const rearRight = this.readFloatLE();

    return { frontLeft, frontRight, rearLeft, rearRight };
  }
}
