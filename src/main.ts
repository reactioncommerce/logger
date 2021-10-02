// @ts-expect-error ts-migrate(7016) FIXME: Could not find a declaration file for module 'buny... Remove this comment to see the full error message
import Bunyan from "bunyan";
// @ts-expect-error ts-migrate(7016) FIXME: Could not find a declaration file for module 'buny... Remove this comment to see the full error message
import BunyanFormat from "bunyan-format";
import Bunyan2Loggly from "./loggly";


// configure bunyan logging module for reaction server
// See: https://github.com/trentm/node-bunyan#levels
const levels = ["FATAL", "ERROR", "WARN", "INFO", "DEBUG", "TRACE"];

// set stdout log level
let level = process.env.REACTION_LOG_LEVEL || "INFO";

// allow overriding the stdout log formatting
// available options: short|long|simple|json|bunyan
// https://www.npmjs.com/package/bunyan-format
const outputMode = process.env.REACTION_LOG_FORMAT || "short";

level = level.toUpperCase();

if (!levels.includes(level)) {
  level = "INFO";
}

// default console config (stdout)
const streams = [{
  level,
  stream: BunyanFormat({ outputMode })
}];

// Loggly config (only used if configured)
const logglyToken = process.env.LOGGLY_TOKEN;
const logglySubdomain = process.env.LOGGLY_SUBDOMAIN;

if (logglyToken && logglySubdomain) {
  const logglyStream = {
    type: "raw",
    level: process.env.LOGGLY_LOG_LEVEL || "DEBUG",
    // @ts-expect-error ts-migrate(2554) FIXME: Expected 4 arguments, but got 2.
    stream: new Bunyan2Loggly({
      token: logglyToken,
      subdomain: logglySubdomain
    }, process.env.LOGGLY_BUFFER_LENGTH || 1)
  };
  streams.push(logglyStream);
}

// create default logger instance
const Logger = Bunyan.createLogger({
  name: process.env.REACTION_LOGGER_NAME || "Reaction",
  streams
});

// Export bunyan so users can create their own loggers from scratch if needed.
// In order to be compatible with Node ES modules, we can't have named CommonJS
// exports, so we set these as properties of the default export instead.
Logger.bunyan = Bunyan;
Logger.bunyanFormat = BunyanFormat;

export default Logger;
