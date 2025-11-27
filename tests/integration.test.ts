import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { spawn } from "child_process";
import { writeFile, unlink } from "fs/promises";

// We will create a temporary 'failing' script and run aitofix against it.
// Note: We need to mock OPENAI and GITHUB/GITLAB APIs if we want a true unit test,
// but for an integration test of the CLI flow, we can observe stdout.

// Since we can't easily mock the OpenAI API call in a subprocess without
// specific tooling, we'll focus on testing the *wrapper* behavior and
// config parsing first.

const MOCK_SCRIPT = "tests/temp-fail.ts";

describe("aitofix integration", () => {
  beforeAll(async () => {
    await writeFile(MOCK_SCRIPT, `
      console.log("Running fail script");
      process.exit(1);
    `);
  });

  afterAll(async () => {
    try {
        await unlink(MOCK_SCRIPT);
    } catch {}
  });

  it("should exit with the original exit code if verification is skipped", async () => {
    // We run without API key so analysis fails/skips, 
    // ensuring it falls back to the original exit code.
    const proc = spawn("bun", ["src/index.ts", "bun", MOCK_SCRIPT], {
        env: { ...process.env, OPENAI_API_KEY: "", AITOFIX_MIN_CONFIDENCE: "0" },
        stdio: "pipe"
    });

    let stdout = "";
    proc.stdout?.on("data", d => stdout += d.toString());
    
    const code = await new Promise(resolve => proc.on("close", resolve));

    expect(code).toBe(1); // Should mirror the failing script
    expect(stdout).toContain("[aitofix] Command failed with exit code 1");
    // It might warn about API key or fail analysis
  });
});





