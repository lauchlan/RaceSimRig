const MPH_MULTIPLIER: number = 2.23694;
const INITIAL_MAX_SPEED = 120 / MPH_MULTIPLIER; // m/s

import { PortInfo } from "serialport";
const SerialPort = require("@serialport/stream");

import { CarDashMessage } from "./carDashMessage";
import { IndexedBuffer } from "./indexedBuffer";
import { EchoClient } from "./echoClient";
import { CarDashServer } from "./carDashServer";
import { FanControl } from "./fanControl";

import express from "express";
import * as http from "http";
import * as WebSocket from "ws";

const app = express();

//initialize a simple http server
const httpServer = http.createServer(app);

//initialize the WebSocket server instance
const wss = new WebSocket.Server({ server: httpServer });

let ws: WebSocket | null = null;

app.use(function (
  _req: any,
  res: { header: (arg0: string, arg1: string) => void },
  next: () => void
) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

const echoClient: EchoClient = new EchoClient();

const carDashMessage = new CarDashMessage();
var messageBuffer: IndexedBuffer = new IndexedBuffer();

var maxObservedSpeed: number = INITIAL_MAX_SPEED;
var currentSpeed: number = 0;
var isRaceOn: boolean = false;

class Fan {
  name: string;
  currentSpeed = 0;
  override = false;
  strength: number = 0;

  constructor(name: string) {
    this.name = name;
  }

  setSpeed(speed: number) {
    if (!this.override) {
      this.currentSpeed = speed;
      this.strength = Math.round((this.currentSpeed / 255) * 100);
    }
  }
}

const fanA = new Fan("A");
const fanB = new Fan("B");

let maxSpeedTimeout: NodeJS.Timeout | null = null;
let backOffTimeout: NodeJS.Timeout | null = null;

const bodyParser = require("body-parser");
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get("/", (req: any, res: { send: (val: string) => any }) => {
  return res.send(statusMsg());
});

app.get("/data", function (req: any, res: { send: (arg0: {}) => any }) {
  return res.send(carDashMessage);
});

app.get("/fan/:channel/", function (
  req: any,
  res: { send: (arg0: {}) => any }
) {
  const channel: string = getChannel(req);

  let fan: Fan | null = null;

  if (channel == "a") {
    fan = fanA;
  } else if (channel == "b") {
    fan = fanB;
  }

  if (fan) {
    return res.send("" + fan.currentSpeed);
  } else {
    return res.send(`unknown channel ${channel}`);
  }
});

app.get("/ports", async function (req: any, res: any) {
  const ports: PortInfo[] = await SerialPort.list();
  const portValues = ports.map((port) => {
    return `<option value="${port.path}">${port.path}</option>`;
  });

  const form: string = `<form action="/port/" method="post"><select id='path' name='path'>${portValues.join(
    "\n"
  )}</select><input type="submit"></form>`;
  res.send(form);
});

app.post("/port", (req: any, res: any) => {
  const port: string = req.body.path as string;

  res.send(`port set to ${port}`);

  properties.set("fans.port", port);
  properties.save("server.properties");

  fanControl.init(port as string);
});

function getChannel(req: any): string {
  return req.params.channel
    ? req.params.channel.toLowerCase()
    : req.params.channel;
}

app.post("/fan/:channel/", (req: any, res: any) => {
  const channel: string = getChannel(req);

  console.log(req.body);
  let speed = req.body?.speed;

  let fan: Fan | null = null;

  if (channel == "a") {
    fan = fanA;
  } else if (channel == "b") {
    fan = fanB;
  }

  console.log(fan);

  if (fan) {
    if (speed == -1) {
      fan.override = false;
      fan.setSpeed(0);
    } else {
      fan.override = false;
      fan.setSpeed(speed);
      fan.override = true;
    }

    console.log(fan);
    fanControl.write(fanA.currentSpeed, fanB.currentSpeed);
    res.json({ channel, speed });
  }
});

const fanControl: FanControl = new FanControl();

function statusMsg(): string {
  const speedMph: number = Math.round(carDashMessage.speed * MPH_MULTIPLIER);
  const maxSpeedMph: number = Math.round(maxObservedSpeed * MPH_MULTIPLIER);

  return `[Status] Race On:${carDashMessage.isRaceOn}, Speed: ${speedMph}mph, Max Speed ${maxSpeedMph} Gear:${carDashMessage.gear}, fan A: ${fanA.strength}%, fan B: ${fanB.strength}%`;
}

const propertiesReader = require("properties-reader");
import PropertiesReader from "properties-reader";
var properties: PropertiesReader.Reader;

function init() {
  try {
    properties = propertiesReader("server.properties");
  } catch {
    console.log(
      "Failed to read properties file. Please ensure that server.properties exists and is valid"
    );
    process.exit(1);
  }

  const ip: PropertiesReader.Value | null = properties.get("relay.client.ip");
  const port: PropertiesReader.Value | null = properties.get(
    "relay.client.port"
  );

  const serialPort: PropertiesReader.Value | null = properties.get("fans.port");

  const serverPort: PropertiesReader.Value | null = properties.get(
    "server.port"
  );

  const server = new CarDashServer(serverPort as number, "0.0.0.0");

  server.onMessage((message: Buffer) => {
    messageBuffer.init(message);
    echoClient.send(message);
    carDashMessage.populate(messageBuffer);

    isRaceOn = carDashMessage.isRaceOn;

    if (!carDashMessage.isRaceOn) {
      if (!maxSpeedTimeout) {
        maxSpeedTimeout = setTimeout(
          () => (maxObservedSpeed = INITIAL_MAX_SPEED),
          90000
        );
      }

      if (!backOffTimeout) {
        backOffTimeout = setInterval(
          () => (currentSpeed = currentSpeed * 0.9),
          1000
        );
      }
    } else {
      if (maxSpeedTimeout) {
        clearTimeout(maxSpeedTimeout);
        maxSpeedTimeout = null;
      }

      if (backOffTimeout) {
        clearTimeout(backOffTimeout);
        backOffTimeout = null;
      }

      currentSpeed = carDashMessage.speed;
      maxObservedSpeed = Math.max(currentSpeed, maxObservedSpeed);
    }
  });

  server.init();
  echoClient.connect(port as number, ip as string);
  fanControl.init(serialPort as string);

  wss.on("connection", (socket: WebSocket) => {
    ws = socket;
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

  app.listen(8080, () => {
    console.log("[Express Server] ON");
  });

  setInterval(() => {
    console.log(statusMsg());
  }, 5000);

  setInterval(() => {
    let value: number = 0;

    if (isRaceOn || backOffTimeout) {
      value = Math.floor((currentSpeed / maxObservedSpeed) * 255);
    }

    fanA.setSpeed(value);
    fanB.setSpeed(value);

    fanControl.write(fanA.currentSpeed, fanB.currentSpeed);

    ws?.send(
      JSON.stringify({
        fanA,
        fanB,
        currentSpeed,
        maxObservedSpeed,
        gear: carDashMessage.gear,
        maxRpm: carDashMessage.engineMaxRpm,
        currentRpm: carDashMessage.currentEngineRpm,
        idleRpm: carDashMessage.engineIdleRpm,
      })
    );
  }, 250);
}

init();
