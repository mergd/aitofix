import { Gitlab } from "@gitbeaker/rest";
import { config } from "../config.js";

export class GitlabPlatform {
  private gitlab: any; // Type inference can be tricky with gitbeaker sometimes, using any for safety or InstanceType<typeof Gitlab>
  private projectId: string | undefined;
  private mrIid: number | undefined;
  private commitSha: string | undefined;

  constructor() {
    if (!config.gitlabToken) {
      console.warn("[aitofix] GITLAB_TOKEN is missing.");
    }
    // @ts-ignore - gitbeaker constructor types can vary
    this.gitlab = new Gitlab({
      token: config.gitlabToken,
      host: process.env.CI_SERVER_URL || "https://gitlab.com",
    });
  }

  async init() {
    if (!config.isGitlab) return;

    this.projectId = process.env.CI_PROJECT_ID;
    this.mrIid = process.env.CI_MERGE_REQUEST_IID
      ? parseInt(process.env.CI_MERGE_REQUEST_IID)
      : undefined;
    this.commitSha = process.env.CI_COMMIT_SHA;
  }

  async postComment(body: string) {
    if (!this.projectId) {
      console.error("[aitofix] No GitLab project ID found.");
      return;
    }

    try {
      if (this.mrIid) {
        await this.gitlab.MergeRequestNotes.create(
          this.projectId,
          this.mrIid,
          body
        );
        console.log(`[aitofix] Posted comment to MR !${this.mrIid}`);
      } else if (this.commitSha) {
        await this.gitlab.Commits.createComment(
          this.projectId,
          this.commitSha,
          body
        );
        console.log(`[aitofix] Posted comment to commit ${this.commitSha}`);
      } else {
        console.warn("[aitofix] No MR or Commit found to comment on.");
      }
    } catch (e: any) {
      console.error(`[aitofix] Failed to post comment: ${e.message}`);
    }
  }
}


