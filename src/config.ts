import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  OPENAI_API_KEY: z.string().optional(),
  GITHUB_TOKEN: z.string().optional(),
  GITLAB_TOKEN: z.string().optional(),
  AITOFIX_MODEL: z.string().default("gpt-5.1-codex"),
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
  isCI: !!processEnv.CI || !!processEnv.GITHUB_ACTIONS || !!processEnv.GITLAB_CI,
  isGithub: !!processEnv.GITHUB_ACTIONS,
  isGitlab: !!processEnv.GITLAB_CI,
};

export type Config = typeof config;


