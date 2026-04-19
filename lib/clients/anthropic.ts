import Anthropic from "@anthropic-ai/sdk";

let _client: Anthropic | undefined;

export function anthropic(): Anthropic {
  if (!_client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");
    _client = new Anthropic({ apiKey });
  }
  return _client;
}

export const CLAUDE_MODEL = "claude-sonnet-4-6";
