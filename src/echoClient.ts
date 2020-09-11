var dgram = require("dgram");

export class EchoClient {
  private client: any = null;

  private willRetry: boolean = false;
  connected: boolean = false;

  connect(port: number, host: string) {
    console.log("[Relay Client] Connecting to echo client...");
    this.connected = false;

    this.client = dgram.createSocket(
      { type: "udp4" },
      (msg: Buffer, rinfo: { address: string; port: number }) =>
        console.log(msg)
    );

    this.client.on(
      "error",
      (e: { errno: number; code: string; syscall: string }) => {
        if (e.code == "ECONNREFUSED" && !this.willRetry) {
          this.connected = false;
          console.log(
            "[Relay Client] Error - Failed to connect to echo client, will retry in 3s"
          );
          this.client.close();
          this.willRetry = true;
          setTimeout(() => {
            this.willRetry = false;
            this.connect(port, host);
          }, 3000);
        } else if (e.code != "ECONNREFUSED") {
          console.log(`[Relay Client] Error - unexpected echo client error`, e);
        }
      }
    );

    this.client.on("connect", (a: any) => {
      this.connected = true;
      console.log("[Relay Client] connected");
    });
    this.client.on("close", (a: any) => {
      this.connected = false;
      console.log("[Relay Client] closed");
    });
    this.client.on("end", (a: any) => {
      this.connected = false;
      console.log("[Relay Client] end", a);
    });

    this.client.connect(port, host);
  }

  send(message: Buffer) {
    if (this.connected) {
      this.client.send(message);
    }
  }
}
