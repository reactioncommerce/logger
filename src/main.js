import Bunyan from "bunyan";
import BunyanFormat from "bunyan-format";
import Hooks from "@reactioncommerce/hooks";
import Bunyan2Loggly from "./loggly";
import EmailStream from "./email";


// export bunyan so users can create their own loggers from scratch if needed
export { default as bunyan } from "bunyan";
export { default as BunyanFormat } from "bunyan-format";


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
    stream: new Bunyan2Loggly({
      token: logglyToken,
      subdomain: logglySubdomain
    }, process.env.LOGGLY_BUFFER_LENGTH || 1)
  };
  streams.push(logglyStream);
}

// Create mutable logger instance and export it. This is intentional,
// even if we need to deal with it on import (CommonJS does not export bindings)
// http://2ality.com/2015/07/es6-module-exports.html
// eslint-disable-next-line import/no-mutable-exports
export let Logger = Bunyan.createLogger({
  name: "Reaction",
  streams
});

// This won't work, even if the Logger instance is declared with let.
// Because babel will translate this to export (disconnected) copy of a copy
// http://2ality.com/2015/07/es6-module-exports.html
// export default Logger;

const alertNotifications = process.env.REACTION_ENABLE_ALERT_NOTFICATIONS;
if (alertNotifications) {
  Hooks.Events.add("afterCoreInit", (Reaction) => {
    const reactionEmail = Reaction.getShopEmail();
    if (reactionEmail) {
      try {
        const { user, password, host, port } = Reaction.getShopSettings().mail;
        // Don't start via plaintext when using 465.
        // (Beware: false doesn't mean it's un-encrypted, either)
        const secureConnection = port === 465;
        // Nodemailer transportOptions
        const transportOptions = {
          host,
          port,
          secureConnection
        };

        // Some server, e.g. Maildev don't like credentials
        if (user && password) {
          transportOptions.auth = {
            user,
            pass: password
          };
        }

        const reactionAlertsNotificationEmail = process.env.REACTION_ALERT_NOTFICATIONS_EMAIL || reactionEmail;
        const emailStream = new EmailStream(
          // Nodemailer mailOptions
          {
            from: reactionEmail,
            to: reactionAlertsNotificationEmail
          },
          transportOptions
        );

        // Add emailStream handler to the already existing ones.
        streams.push({
          type: "raw", // You should use EmailStream with "raw" type!
          stream: emailStream,
          level: "FATAL"
        });

        // Replace previously created console logger with this mailer-aware version
        Logger = Bunyan.createLogger({
          name: "Reaction",
          streams
        });
      } catch (error) {
        // Not much we can do, but also not a situation we want to exit.
        // Assuming that the standard logger is in place, we may log an error.
        Logger.error("Can't setup email messages for fatal errors: ", error.message);
      }
    }
  });
}
