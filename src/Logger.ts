import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";

export class Logger {
  private logStream: fs.WriteStream;
  private logFilePath: string;

  constructor(options?: { logFolder?: string; logFileName?: string }) {
    const { logFolder = "logs", logFileName } = options || {};

    if (!fs.existsSync(logFolder)) {
      fs.mkdirSync(logFolder, { recursive: true });
    }

    // Replace colons and periods in the timestamp to avoid issues with Windows file paths
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    this.logFilePath = path.join(
      logFolder,
      logFileName || `workflow-log-${timestamp}.log`
    );
    this.logStream = fs.createWriteStream(this.logFilePath, { flags: "a" });

    // Close the log stream when the process exits
    process.on("exit", () => {
      this.close();
    });
  }

  private log(level: string, message: string, data?: Record<string, any>) {
    const timestamp = new Date().toISOString();

    // Write the log entry to the log file as a NDJSON (Newline Delimited JSON) entry
    this.logStream.write(
      JSON.stringify({
        timestamp,
        severity: level,
        textPayload: message,
        jsonPayload: data,
      }) + "\n",
      (error) => {
        if (error) {
          console.error(`Failed to write log: ${error.message}`);
        }
      }
    );
  }

  info(message: string, data?: Record<string, any>) {
    this.log("INFO", message, data);
  }

  debug(message: string, data?: Record<string, any>) {
    this.log("DEBUG", message, data);
  }

  warn(message: string, data?: Record<string, any>) {
    this.log("WARN", message, data);
  }

  error(message: string, error?: Error, data?: Record<string, any>) {
    const errorData = {
      message: error?.message,
      stack: error?.stack,
      ...data,
    };
    this.log("ERROR", message, errorData);
  }

  close() {
    this.logStream.end();
  }

  destroy() {
    fs.unlinkSync(this.logFilePath);
  }

  /**
   * Parses the log file and returns an array of log entries.
   * @returns Promise<Array<Record<string, any>>> - Array of log entries.
   */
  async getLogs(): Promise<Array<Record<string, any>>> {
    const logs: Array<Record<string, any>> = [];

    try {
      const fileStream = fs.createReadStream(this.logFilePath);

      const readlineInterface = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity,
      });

      for await (const line of readlineInterface) {
        try {
          const logEntry = JSON.parse(line);
          logs.push(logEntry);
        } catch (error) {
          if (error instanceof Error)
            console.error(
              `Failed to parse line: ${line}, error: ${error.message}`
            );
        }
      }
    } catch (error) {
      if (error instanceof Error)
        console.error(`Failed to read log file: ${error.message}`);
      throw error;
    }

    return logs;
  }
}
