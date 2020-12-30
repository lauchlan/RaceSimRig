const yargs = require("yargs");

export function getArguments() {
  var argv = yargs
    .option("i", {
      alias: "inputFile",
      description: "File of test data to replay instead of live capture",
      type: "string",
    })
    .option("d", {
      alias: "delay",
      description: "Delay between capture data message replay, in ms",
      type: "number",
      default: 17,
    })
    .option("l", {
      alias: "loops",
      description:
        "Numbers of time to play capture data, where 0 means infinite",
      type: "number",
      default: 0,
    })
    .option("c", {
      alias: "capture",
      description: "Record data to file 'capture.bin'",
      type: "boolean",
    })
    .option("v", {
      alias: "voice",
      description: "enable voice output",
      type: "boolean",
      default: false,
    })
    .option("o", {
      alias: "outputRate",
      description:
        "Sample rate to update fans/output telemtry. Defaults to using every 15th msg",
      type: "number",
      default: 15,
    })
    .option("s", {
      alias: "statsInterval",
      description: "How often to output status to console",
      type: "number",
      default: 5000,
    })
    .option("u", {
      alias: "enableUsb",
      description: "Enable output to USB device",
      type: "boolean",
      default: true,
    })
    .option("p", {
      alias: "pcars",
      description: "Enable pcars mode",
      type: "boolean",
      default: false,
    })
    .option("vv", {
      alias: "verbose",
      description: "Verbose output",
      type: "boolean",
      default: false,
    })
    .option("e", {
      alias: "enableEcho",
      description: "Disable Echo Client",
      type: "boolean",
      default: true,
    })
    .help()
    .alias("help", "h").argv;

  return argv;
}
