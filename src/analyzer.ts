import OpenAI from "openai";
import { config } from "./config.js";

export interface FileChange {
  file_path: string;
  content: string;
}

export interface AnalysisResult {
  analysis: string;
  is_easy_fix: boolean;
  confidence: number;
  changes: FileChange[];
}

export class Analyzer {
  private openai: OpenAI;

  constructor() {
    if (!config.openaiApiKey) {
      // We can arguably fail here, or just let it fail when called.
      // But better to warn.
      console.warn("[aitofix] Warning: OPENAI_API_KEY is not set.");
    }
    this.openai = new OpenAI({
      apiKey: config.openaiApiKey,
    });
  }

  async analyze(
    command: string,
    exitCode: number,
    logs: string
  ): Promise<AnalysisResult> {
    const prompt = `
You are an expert CI/CD debugger and code fixer.
The following command failed in a CI environment:
Command: ${command}
Exit Code: ${exitCode}

Last ${logs.split("\n").length} lines of logs:
${logs}

Please analyze the error.
1. Provide a brief explanation of why it failed.
2. Determine if this is an "easy fix" (e.g., typo, missing import, simple logic error) that can be safely applied automatically.
3. Assign a confidence score (0-100) representing how certain you are that your fix will make the command pass.
4. If it is an easy fix and you are confident, provide the corrected file contents.

Respond ONLY in valid JSON format with the following structure:
{
  "analysis": "Brief explanation of the error",
  "is_easy_fix": boolean,
  "confidence": number, // 0-100
  "changes": [
    { "file_path": "path/to/file", "content": "full new content of the file" }
  ]
}
If you cannot fix it or it requires complex changes, set "is_easy_fix" to false, "confidence" to 0, and "changes" to empty array.
`;

    try {
      const response = await this.openai.chat.completions.create({
        model: config.model,
        messages: [
          {
            role: "system",
            content: "You are a helpful AI that fixes code errors.",
          },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error("No content received from OpenAI");
      }

      const result = JSON.parse(content) as AnalysisResult;
      return result;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error("[aitofix] Analysis failed:", errorMessage);
      return {
        analysis: "Failed to analyze error",
        is_easy_fix: false,
        confidence: 0,
        changes: [],
      };
    }
  }
}
