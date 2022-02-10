import { LogglyInstance } from "loggly";
import loggly, { LogglyBulkOptions } from "node-loggly-bulk";

class Bunyan2Loggly {
  _buffer: any[];
  _timeoutId: ReturnType<typeof setTimeout> | undefined;
  bufferLength: number;
  bufferTimeout: number | undefined;
  // eslint-disable-next-line no-unused-vars
  callback: (err: any, results: any, content: any) => void;
  logglyClient: LogglyInstance;

  constructor(
    logglyConfig: LogglyBulkOptions,
    bufferLength = 1,
    bufferTimeout?: number,
    // eslint-disable-next-line no-unused-vars
    callback?: (err: any, results: any, content: any) => void
  ) {
    if (!logglyConfig || !logglyConfig.token || !logglyConfig.subdomain) {
      throw new Error("bunyan-loggly requires a config object with token and subdomain");
    }

    logglyConfig.json = true;

    this.logglyClient = loggly.createClient(logglyConfig);

    this._buffer = [];
    this.bufferLength = bufferLength;
    this.bufferTimeout = bufferTimeout;
    this.callback = callback || function () {};
  }

  write(data: any) {
    if (typeof data !== "object") {
      throw new Error("bunyan-loggly requires a raw stream. Please define the type as raw when setting up the bunyan stream.");
    }

    // loggly prefers timestamp over time
    if (data.time) {
      data.timestamp = data.time;
      delete data.time;
    }

    this._buffer.push(data);

    this._checkBuffer();
  }

  private _processBuffer() {
    if (this._timeoutId) {
      clearTimeout(this._timeoutId);
    }

    let content = this._buffer.slice();

    this._buffer = [];

    if (content.length === 1) {
      [content] = content;
    }

    this.logglyClient.log(content, (error: any, result: any) => {
      this.callback(error, result, content);
    });
  }

  private _checkBuffer() {
    if (!this._buffer.length) {
      return;
    }

    if (this._buffer.length >= this.bufferLength) {
      // eslint-disable-next-line consistent-return
      return this._processBuffer();
    }

    if (this.bufferTimeout) {
      if (this._timeoutId) {
        clearTimeout(this._timeoutId);
      }
      this._timeoutId = setTimeout(() => { this._processBuffer(); }, this.bufferTimeout);
    }
  }
}

export default Bunyan2Loggly;
