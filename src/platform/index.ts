import { config } from "../config.js";
import { GithubPlatform } from "./github.js";
import { GitlabPlatform } from "./gitlab.js";

export interface Platform {
  init(): Promise<void>;
  postComment(body: string): Promise<void>;
}

export function getPlatform(): Platform | null {
  if (config.isGithub) {
    return new GithubPlatform();
  }
  if (config.isGitlab) {
    return new GitlabPlatform();
  }
  return null;
}






