import { Octokit } from "@octokit/rest";
import { config } from "../config.js";
import { readFile } from "fs/promises";

export class GithubPlatform {
  private octokit: Octokit;
  private owner: string = "";
  private repo: string = "";
  private prNumber: number | undefined;
  private commitSha: string | undefined;

  constructor() {
    if (!config.githubToken) {
      console.warn("[aitofix] GITHUB_TOKEN is missing.");
    }
    this.octokit = new Octokit({ auth: config.githubToken });
  }

  async init() {
    if (!config.isGithub) return;

    const [owner, repo] = (process.env.GITHUB_REPOSITORY || "/").split("/");
    this.owner = owner;
    this.repo = repo;
    this.commitSha = process.env.GITHUB_SHA;

    // Try to find PR number from event.json
    if (process.env.GITHUB_EVENT_PATH) {
      try {
        const eventData = JSON.parse(
          await readFile(process.env.GITHUB_EVENT_PATH, "utf8")
        );
        // Pull Request event
        if (eventData.pull_request) {
          this.prNumber = eventData.pull_request.number;
        }
      } catch (e) {
        console.warn("[aitofix] Failed to parse GITHUB_EVENT_PATH", e);
      }
    }
  }

  async postComment(body: string) {
    if (!this.owner || !this.repo) {
        console.error("[aitofix] No repo context found.");
        return;
    }

    try {
      if (this.prNumber) {
        await this.octokit.issues.createComment({
          owner: this.owner,
          repo: this.repo,
          issue_number: this.prNumber,
          body,
        });
        console.log(`[aitofix] Posted comment to PR #${this.prNumber}`);
      } else if (this.commitSha) {
        await this.octokit.repos.createCommitComment({
          owner: this.owner,
          repo: this.repo,
          commit_sha: this.commitSha,
          body,
        });
         console.log(`[aitofix] Posted comment to commit ${this.commitSha}`);
      } else {
          console.warn("[aitofix] No PR or Commit SHA found to comment on.");
      }
    } catch (e: any) {
      console.error(`[aitofix] Failed to post comment: ${e.message}`);
    }
  }
}


