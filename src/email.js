// Copied from https://github.com/hyjin/bunyan-emailstream/blob/master/index.js
import stream from "stream";
import nodemailer from "nodemailer";

const Stream = stream.Writable || stream.Stream;

// Levels
const LEVELS = {
  10: "TRACE",
  20: "DEBUG",
  30: "INFO",
  40: "WARN",
  50: "ERROR",
  60: "FATAL"
};

/**
 * Convert level integer to level name string
 */
function levelName(level) {
  return LEVELS[level] || `LVL${level}`;
}

export default class EmailStream extends Stream {
  constructor(mailOptions, transportOptions) {
    super();

    this._mailOptions = Object.assign({}, mailOptions);
    this._transportOptions = Object.assign({}, transportOptions);
    this._transport = nodemailer.createTransport(this._transportOptions);
  }

  formatBody(log) {
    const rows = [];
    rows.push(`* name: ${log.name}`);
    rows.push(`* hostname:  ${log.hostname}`);
    rows.push(`* pid: ${log.pid}`);
    rows.push(`* time: ${log.time}`);

    if (log.msg) {
      rows.push(`* msg: ${log.msg}`);
    }

    if (log.err) {
      rows.push(`* err.stack: ${log.err.stack}`);
    }

    return rows.join("\n");
  }

  formatSubject(log) {
    return `[${levelName(log.level)}] ${log.name}/${log.pid} on ${log.hostname}`;
  }

  write(log) {
    const message = Object.assign({}, this._mailOptions);

    if (!message.subject) {
      message.subject = this.formatSubject(log);
    }
    message.text = this.formatBody(log);

    this._transport.sendMail(message, (err, response) => {
      if (err) {
        this.emit("error", err);
      } else {
        this.emit("mailSent", response);
      }
    });
  }

  end() {
    if (this._transport) {
      this._transport.close();
    }
  }
}
