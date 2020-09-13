import SerialPort from "serialport";
const Readline = require("@serialport/parser-readline");

export class FanControl {
  port?: SerialPort;

  private isConnected: boolean = false;
  private device: string = "";
  public timeoutHandler: NodeJS.Timeout | null = null;

  init(device: string) {
    if (this.port && this.isConnected) {
      this.port.close();
      this.isConnected = false;
    }

    this.device = device;
    console.log("[Fan Control] initialising device", device);

    if (this.timeoutHandler) {
      clearTimeout(this.timeoutHandler);
      this.timeoutHandler = null;
    }

    this.port = new SerialPort(device, { baudRate: 9600 });

    this.port.on("open", () => {
      console.log("[Fan Control] serial port connected");
      this.isConnected = true;
    });

    this.port.on("error", (data: any) => {
      console.log("[Fan Control] Error:", data);
      this.reconnect();
    });

    const parser = this.port.pipe(new Readline({ delimiter: "\n" }));
    parser.on("data", (data: any) => {
      console.log("[Fan Control] Msg Received:", data);
    });
  }

  private reconnect() {
    this.isConnected = false;

    const controller: FanControl = this;
    if (!this.timeoutHandler) {
      controller.timeoutHandler = setTimeout(() => {
        console.log("[Fan Control] Retrying serial connection");
        controller.init(this.device);
      }, 30000);
    }
  }

  private createCommand(aSpeed: number, bSpeed: number): string {
    let message: string = "";

    if (!isNaN(aSpeed)) {
      message = `A:${Math.floor(aSpeed)}`;
    }

    if (!isNaN(bSpeed)) {
      if (message) {
        message = message + ";";
      }

      message = message + `B:${Math.floor(bSpeed)}`;
    }

    return message;
  }

  write(aSpeed: number = NaN, bSpeed: number = NaN) {
    if (!this.isConnected) {
      return;
    }

    const message = this.createCommand(aSpeed, bSpeed);
    if (!message) {
      return;
    }

    this.port?.write(`${message}\n`, (err: any) => {
      if (err) {
        console.log("[Fan Control] Error sending command", err.message);
        this.reconnect();
        return;
      }
      //console.log("[Fan Control] Command Sent", message);
    });
  }
}
