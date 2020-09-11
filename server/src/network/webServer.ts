import express from "express";
const bodyParser = require("body-parser");

const SerialPort = require("@serialport/stream");
import { PortInfo } from "serialport";

import PropertiesReader from "properties-reader";

import { RaceState } from "../model/raceStateType";
import { Fan } from "../model/fanType";

export class WebServer {
  app = express();
  raceState: RaceState;
  portChangeCallBack: null | ((port: string) => void) = null;

  constructor(raceState: RaceState) {
    this.raceState = raceState;
    this.init();
  }

  private setup() {
    this.app.use(function (
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

    this.app.use(bodyParser.json());
    this.app.use(bodyParser.urlencoded({ extended: true }));
  }

  private init() {
    this.setup();
    this.initialiseReadApis();
    this.intialiseWriteApis();

    this.app.listen(8080, () => {
      console.log("[Express Server] ON");
    });
  }

  private intialiseWriteApis() {
    this.initaliseSetUSBDevicePort();
    this.initaliseSetFanChannelSpeed();
  }

  private initaliseSetFanChannelSpeed() {
    this.app.post("/fan/:channel/", (req: any, res: any) => {
      console.log(req.body);

      const channel: string = this.getChannel(req);
      let speed = req.body?.speed;
      let fan = this.getFanForChannel(channel);

      console.log(fan);

      if (fan) {
        if (speed == -1) {
          fan.override = false;
          fan.setSpeed(0);
        } else {
          fan.setSpeed(speed, true);
          fan.override = true;
        }

        console.log(fan);
        res.json({ channel, speed });
      }
    });
  }

  private initaliseSetUSBDevicePort() {
    this.app.post("/port", (req: any, res: any) => {
      const port: string = req.body.path as string;

      res.send(`port set to ${port}`);
      this.portChangeCallBack?.(port);
    });
  }

  onPortChange(callback: (port: string) => void) {
    this.portChangeCallBack = callback;
  }

  private initialiseReadApis() {
    this.app.get("/", (req: any, res: { send: (val: string) => any }) => {
      return res.send(this.raceState.statusMsg());
    });

    this.app.get(
      "/fan/:channel/",
      (req: any, res: { send: (arg0: {}) => any }) => {
        const channel: string = this.getChannel(req);
        let fan: Fan | null = this.getFanForChannel(channel);

        if (fan) {
          return res.send("" + fan.pwmSpeed);
        } else {
          return res.send(`unknown channel ${channel}`);
        }
      }
    );

    this.app.get("/ports", async function (req: any, res: any) {
      const ports: PortInfo[] = await SerialPort.list();
      const portValues = ports.map((port) => {
        return `<option value="${port.path}">${port.path}</option>`;
      });

      const form: string = `<form action="/port/" method="post"><select id='path' name='path'>${portValues.join(
        "\n"
      )}</select><input type="submit"></form>`;
      res.send(form);
    });
  }

  private getFanForChannel(channel: string) {
    let fan: Fan | null = null;

    if (channel == "a") {
      fan = this.raceState.fanA;
    } else if (channel == "b") {
      fan = this.raceState.fanB;
    }
    return fan;
  }

  private getChannel(req: any): string {
    return req.params.channel
      ? req.params.channel.toLowerCase()
      : req.params.channel;
  }
}
