import Bunyan from "bunyan";
import BunyanFormat from "bunyan-format";
import Bunyan2Loggly from "./loggly";


// configure bunyan logging module for reaction server
// See: https://github.com/trentm/node-bunyan#levels
const levels = ["fatal", "error", "warn", "info", "debug", "trace"];

const customLevel = process.env.REACTION_LOG_LEVEL;

let level: Bunyan.LogLevel = "info";
if (customLevel && levels.includes(customLevel)) {
  level = customLevel as Bunyan.LogLevel;
}

// allow overriding the stdout log formatting
// https://www.npmjs.com/package/bunyan-format
const outputModes = ["short", "long", "simple", "json", "bunyan"];
type OutputMode = "short" | "long" | "simple" | "json" | "bunyan";

const customOutputMode = process.env.REACTION_LOG_FORMAT;
let outputMode: OutputMode = "short";
if (customOutputMode && outputModes.includes(customOutputMode)) {
  outputMode = customOutputMode as OutputMode;
}

// default console config (stdout)
const streams: Bunyan.Stream[] = [{
  level,
  stream: BunyanFormat({ outputMode })
}];

// Loggly config (only used if configured)
const logglyToken = process.env.LOGGLY_TOKEN;
const logglySubdomain = process.env.LOGGLY_SUBDOMAIN;

if (logglyToken && logglySubdomain) {
  const logglyStream = <Bunyan.Stream>{
    type: "raw",
    level: process.env.LOGGLY_LOG_LEVEL || "DEBUG",
    stream: new Bunyan2Loggly(
      {
        token: logglyToken,
        subdomain: logglySubdomain
      },
      process.env.LOGGLY_BUFFER_LENGTH ? +process.env.LOGGLY_BUFFER_LENGTH : 1
    )
  };
  streams.push(logglyStream);
}

type ReactionLogger = Bunyan & {
  bunyan?: typeof Bunyan,
  bunyanFormat?: typeof BunyanFormat
}

// create default logger instance
const Logger: ReactionLogger = Bunyan.createLogger({
  name: process.env.REACTION_LOGGER_NAME || "Reaction",
  streams
});

// Export bunyan so users can create their own loggers from scratch if needed.
// In order to be compatible with Node ES modules, we can't have named CommonJS
// exports, so we set these as properties of the default export instead.
Logger.bunyan = Bunyan;
Logger.bunyanFormat = BunyanFormat;

export default Logger;
