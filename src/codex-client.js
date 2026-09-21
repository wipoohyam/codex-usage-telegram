import { spawn } from "node:child_process";
import readline from "node:readline";

export class CodexAppServerClient {
  constructor({ command = "codex", timeoutMs = 30_000, logger = console } = {}) {
    this.command = command;
    this.timeoutMs = timeoutMs;
    this.logger = logger;
    this.nextId = 1;
    this.pending = new Map();
    this.process = null;
    this.reader = null;
  }

  async start() {
    if (this.process) return;

    this.process = spawn(this.command, ["app-server"], {
      stdio: ["pipe", "pipe", "pipe"],
      env: process.env,
    });

    this.process.once("error", (error) => this.#failAll(error));
    this.process.once("exit", (code, signal) => {
      this.#failAll(new Error(`Codex app-server exited (code=${code}, signal=${signal})`));
      this.process = null;
    });

    this.process.stderr.setEncoding("utf8");
    this.process.stderr.on("data", (chunk) => {
      const message = chunk.trim();
      if (message) this.logger.warn?.(`[codex] ${message}`);
    });

    this.reader = readline.createInterface({ input: this.process.stdout });
    this.reader.on("line", (line) => this.#handleLine(line));

    await this.request("initialize", {
      clientInfo: {
        name: "codex_usage_telegram",
        title: "Codex Usage Telegram",
        version: "0.1.0",
      },
    });
    this.notify("initialized", {});
  }

  request(method, params) {
    if (!this.process?.stdin?.writable) {
      return Promise.reject(new Error("Codex app-server is not running"));
    }

    const id = this.nextId++;
    const message = { method, id };
    if (params !== undefined) message.params = params;

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Codex request timed out: ${method}`));
      }, this.timeoutMs);

      this.pending.set(id, { resolve, reject, timer, method });
      this.#write(message);
    });
  }

  notify(method, params) {
    const message = { method };
    if (params !== undefined) message.params = params;
    this.#write(message);
  }

  async getAccount() {
    return this.request("account/read", { refreshToken: false });
  }

  async getRateLimits() {
    return this.request("account/rateLimits/read");
  }

  async close() {
    if (!this.process) return;
    this.reader?.close();
    this.process.stdin.end();
    const child = this.process;
    await new Promise((resolve) => {
      const timer = setTimeout(() => {
        child.kill("SIGTERM");
        resolve();
      }, 2_000);
      child.once("exit", () => {
        clearTimeout(timer);
        resolve();
      });
    });
    this.process = null;
  }

  #write(message) {
    this.process.stdin.write(`${JSON.stringify(message)}\n`);
  }

  #handleLine(line) {
    let message;
    try {
      message = JSON.parse(line);
    } catch {
      this.logger.warn?.("Ignoring non-JSON output from Codex app-server");
      return;
    }

    if (message.id === undefined) return;
    const pending = this.pending.get(message.id);
    if (!pending) return;

    clearTimeout(pending.timer);
    this.pending.delete(message.id);
    if (message.error) {
      pending.reject(
        new Error(
          `Codex ${pending.method} failed: ${message.error.message || JSON.stringify(message.error)}`,
        ),
      );
    } else {
      pending.resolve(message.result);
    }
  }

  #failAll(error) {
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(error);
    }
    this.pending.clear();
  }
}

export async function readCodexStatus(options) {
  const client = new CodexAppServerClient(options);
  try {
    await client.start();
    const account = await client.getAccount();
    if (!account?.account || account.account.type !== "chatgpt") {
      throw new Error(
        "Codex is not signed in with ChatGPT. Run the login command before starting the monitor.",
      );
    }
    const limits = await client.getRateLimits();
    return { account: account.account, limits };
  } finally {
    await client.close();
  }
}
