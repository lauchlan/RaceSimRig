import * as http from "http";
import * as WebSocket from "ws";

export class WebSocketServer {
  webSocket: WebSocket | null = null;

  constructor(app: any) {
    const httpServer = http.createServer(app);
    const webSocketServer = new WebSocket.Server({ server: httpServer });

    webSocketServer.on("connection", (socket: WebSocket) => {
      this.webSocket = socket;
      socket.on("message", (message: string) => {
        console.log("[Web Socket] received: %s", message);
      });
    });

    //start our server

    httpServer.listen(process.env.PORT || 8999, () => {
      console.log(
        `Server started on port ${
          (httpServer.address() as WebSocket.AddressInfo).port
        } :)`
      );
    });
  }

  send(data: Object) {
    this.webSocket?.send(JSON.stringify(data));
  }
}
