#!/usr/bin/env bun
import { Runner } from "./runner.js";
import { Analyzer, type AnalysisResult } from "./analyzer.js";
import { getPlatform } from "./platform/index.js";
import { config } from "./config.js";

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error("Usage: npx aitofix <command>");
    process.exit(1);
  }

  const command = args.join(" ");
  const runner = new Runner();

  console.log("[aitofix] Starting original command...");
  const result = await runner.runCommand(command);

  if (result.exitCode === 0) {
    console.log("[aitofix] Command passed successfully.");
    process.exit(0);
  }

  console.log(
    `[aitofix] Command failed with exit code ${result.exitCode}. Analyzing...`
  );

  const analyzer = new Analyzer();
  const analysis = await analyzer.analyze(
    command,
    result.exitCode,
    result.logs
  );

  console.log(`[aitofix] Analysis: ${analysis.analysis}`);
  console.log(
    `[aitofix] Confidence: ${analysis.confidence}% (Threshold: ${config.minConfidence}%)`
  );

  // Handle Low Confidence or No Fix
  if (
    !analysis.is_easy_fix ||
    analysis.changes.length === 0 ||
    analysis.confidence < config.minConfidence
  ) {
    const reason = !analysis.is_easy_fix
      ? "No easy fix identified"
      : analysis.confidence < config.minConfidence
      ? "Confidence too low"
      : "No changes generated";

    console.log(`[aitofix] ${reason}. Skipping verification.`);

    if (config.commentMode === "always" || config.enableSkipMsg) {
      await postComment(analysis, false, reason);
    }
    process.exit(result.exitCode);
  }

  console.log("[aitofix] Identified potential fix. Verifying...");

  // Apply changes
  const backups = await runner.applyChanges(analysis.changes);

  // Rerun
  console.log("[aitofix] Re-running command to verify fix...");
  const verifyResult = await runner.runCommand(command);

  await runner.revertChanges(backups);

  if (verifyResult.exitCode === 0) {
    console.log(
      "[aitofix] Fix VERIFIED! The suggested changes make the build pass."
    );
    if (config.commentMode !== "silent") {
      await postComment(analysis, true);
    }
  } else {
    console.log(
      "[aitofix] Verification failed. The fix did not make the command pass."
    );
    if (config.commentMode === "always") {
      await postComment(analysis, false, "Verification Failed");
    }
  }

  process.exit(result.exitCode);
}

async function postComment(
  analysis: AnalysisResult,
  verified: boolean,
  failureReason?: string
) {
  const platform = getPlatform();
  if (!platform) {
    console.log(
      "[aitofix] No supported CI platform detected. Skipping comment."
    );
    return;
  }
  await platform.init();

  const icon = verified ? "✅" : "⚠️";
  const title = verified ? "Fix Verified" : "Analysis Only";

  let body = `### ${icon} AITOFIX Suggestion: ${title}\n\n`;
  body += `**Analysis:** ${analysis.analysis}\n\n`;
  body += `**Confidence:** ${analysis.confidence}%\n\n`;

  if (failureReason) {
    body += `> **Note:** Automatic verification was not completed: ${failureReason}\n\n`;
  } else if (verified) {
    body += `> **Success:** I verified this fix by re-running the command locally, and it passed!\n\n`;
  }

  if (analysis.changes.length > 0) {
    body += `**Suggested Changes:**\n`;
    body += analysis.changes
      .map(
        (c) => `
**${c.file_path}**:
\`\`\`${detectLanguage(c.file_path)}
${c.content}
\`\`\`
`
      )
      .join("\n");
  }

  await platform.postComment(body);
}

function detectLanguage(path: string): string {
  if (path.endsWith(".ts")) return "typescript";
  if (path.endsWith(".js")) return "javascript";
  if (path.endsWith(".json")) return "json";
  if (path.endsWith(".py")) return "python";
  if (path.endsWith(".go")) return "go";
  if (path.endsWith(".rs")) return "rust";
  return "";
}

main().catch((err) => {
  console.error("[aitofix] Unexpected error:", err);
  process.exit(1);
});
