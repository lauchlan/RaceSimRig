import { CarDashMessage } from "./model/carDashMessage";
import { IndexedBuffer } from "./model/indexedBuffer";
import { EchoClient } from "./network/echoClient";
import { DatagramServer } from "./network/datagramServer";
import { FanControl } from "./controller/fanControl";

import { WebServer } from "./network/webServer";
import { WebSocketServer } from "./network/webSocketServer";
import { RaceState } from "./model/raceStateType";

const propertiesReader = require("properties-reader");
import PropertiesReader from "properties-reader";

function init() {
  let properties: PropertiesReader.Reader;
  const { serverPort, port, ip, serialPort } = readProperties();

  const echoClient: EchoClient = new EchoClient();
  const raceState = new RaceState();

  const carDashMessage = new CarDashMessage();
  var messageBuffer: IndexedBuffer = new IndexedBuffer();

  const webServer = new WebServer(raceState);
  const udpServer = new DatagramServer(serverPort, "0.0.0.0");

  udpServer.onMessage((message: Buffer) => {
    echoClient.send(message);

    messageBuffer.init(message);
    carDashMessage.populate(messageBuffer);

    raceState.processNewMessage(carDashMessage);
  });

  echoClient.connect(port as number, ip as string);

  const fanControl: FanControl = new FanControl();
  fanControl.init(serialPort as string);

  const webSocketServer = new WebSocketServer(webServer.app);

  webServer.onPortChange((port) => {
    properties.set("fans.port", port);
    properties.save("server.properties");

    fanControl.init(port as string);
  });

  setInterval(() => {
    console.log(raceState.statusMsg());
  }, 5000);

  setInterval(() => {
    fanControl.write(raceState.fanA.pwmSpeed, raceState.fanB.pwmSpeed);

    webSocketServer.send({
      fanA: raceState.fanA,
      fanB: raceState.fanB,
      currentSpeed: raceState.speed,
      maxObservedSpeed: raceState.maxObservedSpeed,
      gear: raceState.gear,
      maxRpm: raceState.maxRpm,
      currentRpm: raceState.currentRpm,
      idleRpm: raceState.idleRpm,
    });
  }, 250);

  function readProperties() {
    try {
      properties = propertiesReader("server.properties");
    } catch {
      console.log(
        "Failed to read properties file. Please ensure that server.properties exists and is valid"
      );
      process.exit(1);
    }

    const ip: string = properties.get("relay.client.ip") as string;
    const port: number = properties.get("relay.client.port") as number;
    const serialPort: string = properties.get("fans.port") as string;
    const serverPort: number = properties.get("server.port") as number;

    return { serverPort, port, ip, serialPort };
  }
}

init();
