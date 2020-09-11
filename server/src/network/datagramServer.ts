var dgram = require("dgram");

export class DatagramServer {
  server: any;

  constructor(port: number, host: string) {
    this.server = dgram.createSocket("udp4");
    this.server.bind(port, host);

    this.init();
  }

  onMessage(callback: (message: Buffer) => void) {
    this.server.on("message", callback);
  }

  private init() {
    const serverInstance: any = this.server;

    this.server.on("listening", function () {
      const address = serverInstance.address();
      console.log(
        "[Cash Dash Server] UDP Server listening on " +
          address.address +
          ":" +
          address.port
      );
    });
  }
}
