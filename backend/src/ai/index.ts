import { env } from "../config/env.js";
import type { AIProvider } from "./AIProvider.js";
import { GrokProvider } from "./GrokProvider.js";
import { MockProvider } from "./MockProvider.js";

export type { AIProvider } from "./AIProvider.js";
export { MockProvider } from "./MockProvider.js";
export { GrokProvider } from "./GrokProvider.js";
export { assertGrounded } from "./AIProvider.js";

export function createAIProvider(): AIProvider {
  if (env.aiProvider === "grok") {
    return new GrokProvider();
  }
  return new MockProvider();
}
