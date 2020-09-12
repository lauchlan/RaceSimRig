import { CarDashMessage } from "./model/carDashMessage";
import { IndexedBuffer } from "./model/indexedBuffer";
import { EchoClient } from "./network/echoClient";
import { DatagramServer } from "./network/datagramServer";
import { FanControl } from "./controller/fanControl";

import { WebServer } from "./network/webServer";
import { WebSocketServer } from "./network/webSocketServer";
import { RaceState } from "./model/raceStateType";

import { interval, Observable, Observer, from, of, merge } from "rxjs";
import {
  throttleTime,
  filter,
  map,
  delayWhen,
  mergeMap,
  concatMap,
  delay,
} from "rxjs/operators";

import fs from "fs";

const propertiesReader = require("properties-reader");
import PropertiesReader from "properties-reader";
import { getCaptureStream } from "./controller/replayCapture";

async function init(useTestData: boolean) {
  let properties: PropertiesReader.Reader = openPropertiesFile();
  const { udpServerPort, relayPort, relayIp, serialPort } = readProperties(
    properties
  );

  const echoClient: EchoClient = new EchoClient();
  const raceState = new RaceState();

  const webServer = new WebServer(raceState);

  webServer.onPortChange((devicePort) => {
    properties.set("fans.port", devicePort);
    properties.save("server.properties");

    fanControl.init(devicePort as string);
  });

  const udpServer = new DatagramServer(udpServerPort, "0.0.0.0");

  let capture$ = new Observable<Buffer>();

  if (useTestData) {
    capture$ = getCaptureStream("testData/capture.bin");
  }

  const buffer$ = merge(udpServer.datagram$, capture$);

  buffer$.subscribe((message: Buffer) => {
    echoClient.send(message);
  });

  buffer$
    .pipe(throttleTime(250))
    .pipe(
      map((buffer) => {
        const messageBuffer: IndexedBuffer = new IndexedBuffer(buffer);
        const carDashMessage = new CarDashMessage(messageBuffer);

        return carDashMessage;
      })
    )
    .subscribe((carDashMessage: CarDashMessage) => {
      raceState.processNewMessage(carDashMessage);

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
    });

  echoClient.connect(relayPort, relayIp);

  const fanControl: FanControl = new FanControl();
  fanControl.init(serialPort as string);

  const webSocketServer = new WebSocketServer(webServer.app);

  const statusStream = interval(5000).subscribe(() =>
    console.log(raceState.statusMsg())
  );
}

function openPropertiesFile() {
  let properties: PropertiesReader.Reader;
  try {
    properties = propertiesReader("server.properties");
  } catch {
    console.log(
      "Failed to read properties file. Please ensure that server.properties exists and is valid"
    );
    process.exit(1);
  }

  return properties;
}

function readProperties(properties: PropertiesReader.Reader) {
  const relayIp: string = properties.get("relay.client.ip") as string;
  const relayPort: number = properties.get("relay.client.port") as number;
  const serialPort: string = properties.get("fans.port") as string;
  const udpServerPort: number = properties.get("server.port") as number;

  return { udpServerPort, relayPort, relayIp, serialPort };
}

const yargs = require("yargs");

const argv = yargs
  .option("useTestData", {
    alias: "t",
    description: "play capture data",
    type: "boolean",
  })
  .help()
  .alias("help", "h").argv;

init(argv.useTestData);
