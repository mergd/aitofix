import { spawn } from "child_process";
import { writeFile, readFile } from "fs/promises";
import { existsSync } from "fs";

export interface RunResult {
  exitCode: number;
  logs: string;
}

export interface FileChange {
  file_path: string;
  content: string;
}

export class Runner {
  private maxBufferLines: number;

  constructor(maxBufferLines: number = 100) {
    this.maxBufferLines = maxBufferLines;
  }

  async runCommand(command: string, args: string[] = []): Promise<RunResult> {
    return new Promise((resolve) => {
      const fullCommand = [command, ...args].join(" ");
      console.log(`[aitofix] Running: ${fullCommand}`);

      const child = spawn(fullCommand, {
        shell: true,
        stdio: ["inherit", "pipe", "pipe"],
      });

      const logBuffer: string[] = [];

      const appendLog = (data: Buffer | string) => {
        const lines = data.toString().split("\n");
        for (const line of lines) {
            if (!line) continue;
            console.log(line); 
            logBuffer.push(line);
            if (logBuffer.length > this.maxBufferLines) {
                logBuffer.shift();
            }
        }
      };

      child.stdout.on("data", appendLog);
      child.stderr.on("data", appendLog);

      child.on("close", (code) => {
        resolve({
          exitCode: code ?? 1,
          logs: logBuffer.join("\n"),
        });
      });
      
      child.on("error", (err) => {
          console.error(`[aitofix] Failed to start command: ${err.message}`);
          resolve({
              exitCode: 1,
              logs: logBuffer.join("\n") + `\nError: ${err.message}`
          });
      });
    });
  }

  async applyChanges(changes: FileChange[]): Promise<Map<string, string>> {
    const backups = new Map<string, string>();
    for (const change of changes) {
      try {
        if (existsSync(change.file_path)) {
          const original = await readFile(change.file_path, "utf8");
          backups.set(change.file_path, original);
        }
        await writeFile(change.file_path, change.content);
        console.log(`[aitofix] Applied fix to ${change.file_path}`);
      } catch (e: any) {
        console.error(`[aitofix] Failed to write file ${change.file_path}: ${e.message}`);
      }
    }
    return backups;
  }

  async revertChanges(backups: Map<string, string>) {
    for (const [path, content] of backups) {
      try {
        await writeFile(path, content);
        console.log(`[aitofix] Reverted changes to ${path}`);
      } catch (e: any) {
        console.error(`[aitofix] Failed to revert ${path}: ${e.message}`);
      }
    }
  }
}
