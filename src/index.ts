#!/usr/bin/env bun
import { Runner } from "./runner.js";
import { Analyzer } from "./analyzer.js";
import { getPlatform } from "./platform/index.js";

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

  console.log(`[aitofix] Command failed with exit code ${result.exitCode}. Analyzing...`);
  
  const analyzer = new Analyzer();
  const analysis = await analyzer.analyze(command, result.exitCode, result.logs);

  console.log(`[aitofix] Analysis: ${analysis.analysis}`);

  if (!analysis.is_easy_fix || analysis.changes.length === 0) {
    console.log("[aitofix] No easy fix identified. Exiting.");
    process.exit(result.exitCode);
  }

  console.log("[aitofix] Identified potential fix. Verifying...");
  
  // Apply changes
  const backups = await runner.applyChanges(analysis.changes);
  
  // Rerun
  console.log("[aitofix] Re-running command to verify fix...");
  const verifyResult = await runner.runCommand(command);

  // Revert changes (we only want to verify, not leave the repo in a dirty state? 
  // Or maybe leave it dirty so user can inspect?
  // Plan says "Re-run... If it passes, mark as Verified Fix... If it fails, discard".
  // If it passes, we should probably still revert because we can't commit here easily without credentials/permissions complications,
  // and we want to suggest the fix via comment. 
  // If we leave it dirty, the next step in CI might be confused, or if we fail the CI, the runner wipes it anyway.
  // But let's revert to be clean.)
  
  await runner.revertChanges(backups);

  if (verifyResult.exitCode === 0) {
    console.log("[aitofix] Fix VERIFIED! The suggested changes make the build pass.");
    
    const platform = getPlatform();
    if (platform) {
      await platform.init();
      
      const commentBody = `
### 🤖 AITOFIX Suggestion
I detected a failure and found a fix that **verifies successfully**.

**Analysis:** ${analysis.analysis}

**Suggested Changes:**
${analysis.changes.map(c => `
**${c.file_path}**:
\`\`\`${detectLanguage(c.file_path)}
${c.content}
\`\`\`
`).join("\n")}

*(I verified this by applying the changes and re-running the command, and it passed.)*
`;
      await platform.postComment(commentBody);
    } else {
      console.log("[aitofix] No supported CI platform detected (GitHub/GitLab). Skipping comment.");
      console.log("SUGGESTED FIX:");
      console.log(JSON.stringify(analysis.changes, null, 2));
    }
  } else {
    console.log("[aitofix] Verification failed. The fix did not make the command pass.");
    // Optionally post about the failed attempt? No, simpler to stay silent if it didn't work.
  }

  // Always exit with original error so CI fails (unless we want to 'fix' the pipeline execution, but that's risky)
  process.exit(result.exitCode);
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

main().catch(err => {
  console.error("[aitofix] Unexpected error:", err);
  process.exit(1);
});


