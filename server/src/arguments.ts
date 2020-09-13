const yargs = require("yargs");

export function getArguments() {
  var argv = yargs
    .option("t", {
      alias: "useTestData",
      description: "play capture data",
      type: "string",
    })
    .option("c", {
      alias: "capture",
      description: "capture data",
      type: "boolean",
    })
    .option("s", {
      alias: "speak",
      description: "speak mode",
      type: "boolean",
    })
    .option("d", {
      alias: "replayDelay",
      description: "Delay between capture data message replay, in ms",
      type: "number",
      default: 17,
    })
    .option("r", {
      alias: "updateRate",
      description:
        "Sample rate to update fans/output telemtry. Defaults to using every 15th msg",
      type: "number",
      default: 15,
    })
    .option("i", {
      alias: "statusInterval",
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
    .option("v", {
      alias: "verbose",
      description: "Verbose output",
      type: "boolean",
      default: false,
    })
    .option("l", {
      alias: "loops",
      description:
        "Numbers of time to play capture data, where 0 means infinite",
      type: "number",
      default: 0,
    })
    .help()
    .alias("help", "h").argv;

  return argv;
}
