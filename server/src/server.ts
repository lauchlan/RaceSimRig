import { CarDashMessage } from "./model/carDashMessage";
import { IndexedBuffer } from "./model/indexedBuffer";
import { EchoClient } from "./network/echoClient";
import { DatagramServer } from "./network/datagramServer";
import { FanControl } from "./controller/fanControl";

import { WebServer } from "./network/webServer";
import { WebSocketServer } from "./network/webSocketServer";
import { RaceState } from "./model/raceState";

import { getArguments } from "./arguments";

import { interval } from "rxjs";
import { map, bufferCount } from "rxjs/operators";

import fs from "fs";

const propertiesReader = require("properties-reader");
import PropertiesReader from "properties-reader";
import { getCaptureStream } from "./controller/replayCapture";

function init(
  updateRate: number,
  statusInterval: number,
  enableUsb: number,
  verbose: boolean,
  enableVoice: boolean,
  replayCaptureFile: string,
  captureLoops: number,
  replayDelay: number,
  performCapture: boolean,
  enableEcho: boolean
) {
  let properties: PropertiesReader.Reader = openPropertiesFile();
  const { udpServerPort, relayPort, relayIp, serialPort } = readProperties(
    properties
  );

  const echoClient: EchoClient = new EchoClient();
  const raceState = new RaceState(enableVoice);

  const webServer = new WebServer(raceState);

  webServer.onPortChange((devicePort) => {
    properties.set("fans.port", devicePort);
    properties.save("server.properties");

    if (enableUsb) {
      fanControl.init(devicePort as string);
    }
  });

  const udpServer = new DatagramServer(udpServerPort, "0.0.0.0");

  console.log("[Server] Using test data:", replayCaptureFile);
  const buffer$ = replayCaptureFile
    ? getCaptureStream(replayCaptureFile, replayDelay, captureLoops)
    : udpServer.datagram$;

  if (replayCaptureFile) {
    buffer$.subscribe({
      complete: () => {
        console.log("[Server] Replay complete", raceState.maxX, raceState.maxY);

        process.exit();
      },
    });
  }

  const captureFile = performCapture
    ? fs.createWriteStream("capture.bin")
    : null;

  buffer$.subscribe((message: Buffer) => {
    if (enableEcho) {
      echoClient.send(message);
    }

    if (captureFile) {
      captureFile.write(message);
    }
  });

  console.log(
    `[Server] Status output every ${statusInterval}ms, processing every ${updateRate} message`
  );

  buffer$
    .pipe(
      bufferCount(updateRate),
      map((buffer) => getCarMessageFromBuffer(buffer))
    )
    .subscribe((carDashMessage: CarDashMessage) => {
      raceState.processNewMessage(carDashMessage);
      fanControl.write(raceState.fanA.pwmSpeed, raceState.fanB.pwmSpeed);
      webSocketServer.send(createWebMetrics(raceState));
    });

  if (enableEcho) {
    echoClient.connect(relayPort, relayIp);
  }

  const fanControl: FanControl = new FanControl();
  if (enableUsb) {
    fanControl.init(serialPort as string);
  }

  const webSocketServer = new WebSocketServer(webServer.app);

  const statusStream = interval(statusInterval).subscribe(() =>
    console.log(raceState.statusMsg(verbose))
  );
}

function createWebMetrics(raceState: RaceState): Object {
  return {
    time: raceState.timeStamp,
    isRaceOn: raceState.isRaceOn,
    fanA: raceState.fanA,
    fanB: raceState.fanB,
    currentSpeed: raceState.speed,
    maxObservedSpeed: raceState.maxObservedSpeed,
    gear: raceState.gear,
    maxRpm: raceState.maxRpm,
    currentRpm: raceState.currentRpm,
    idleRpm: raceState.idleRpm,
    position: raceState.position,
    lap: raceState.lap,
  };
}

function getCarMessageFromBuffer(buffer: Buffer[]) {
  const messageBuffer: IndexedBuffer = new IndexedBuffer(
    buffer.pop() as Buffer
  );
  const carDashMessage = new CarDashMessage(messageBuffer);

  return carDashMessage;
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

const argv = getArguments();

init(
  argv.delay,
  argv.statsInterval,
  argv.enableUsb,
  argv.verbose,
  argv.voice,
  argv.inputFile,
  argv.loops,
  argv.delay,
  argv.capture,
  argv.enableEcho
);
