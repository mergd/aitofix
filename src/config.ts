import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  // BYOK - Check for OPENAI_API_KEY first
  OPENAI_API_KEY: z.string().optional(),
  // Internal/Managed key could be added here later (e.g. AITOFIX_API_KEY)

  GITHUB_TOKEN: z.string().optional(),
  GITLAB_TOKEN: z.string().optional(),
  AITOFIX_MODEL: z.string().default("gpt-5.1-codex"),
  AITOFIX_MIN_CONFIDENCE: z.coerce.number().min(0).max(100).default(80),
  AITOFIX_COMMENT_MODE: z
    .enum(["verified_only", "always", "silent"])
    .default("verified_only"),
  AITOFIX_ENABLE_SKIP_MSG: z
    .string()
    .transform((val) => val === "true")
    .default("false"),
  CI: z.string().optional(), // Generic CI flag
  GITHUB_ACTIONS: z.string().optional(),
  GITLAB_CI: z.string().optional(),
});

const processEnv = envSchema.parse(process.env);

export const config = {
  openaiApiKey: processEnv.OPENAI_API_KEY,
  githubToken: processEnv.GITHUB_TOKEN,
  gitlabToken: processEnv.GITLAB_TOKEN,
  model: processEnv.AITOFIX_MODEL,
  minConfidence: processEnv.AITOFIX_MIN_CONFIDENCE,
  commentMode: processEnv.AITOFIX_COMMENT_MODE,
  enableSkipMsg: processEnv.AITOFIX_ENABLE_SKIP_MSG,
  isCI:
    !!processEnv.CI || !!processEnv.GITHUB_ACTIONS || !!processEnv.GITLAB_CI,
  isGithub: !!processEnv.GITHUB_ACTIONS,
  isGitlab: !!processEnv.GITLAB_CI,
};

export type Config = typeof config;
