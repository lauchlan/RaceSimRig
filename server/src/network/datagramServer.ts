const dgram = require("dgram");

import { Observable, Observer, Subject } from "rxjs";

export class DatagramServer {
  private server: any;
  datagram$: Subject<Buffer> = new Subject<Buffer>();

  constructor(port: number, host: string) {
    this.server = dgram.createSocket("udp4");
    this.server.bind(port, host);

    this.init();
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

    this.server.on("message", (val: Buffer) => this.datagram$.next(val));
    this.server.on("error", (err: any) => this.datagram$.error(err));
  }
}
