import { describe, expect, it } from "vitest";
import { isConnectionError, isResumeText, RESUME_TEXT } from "./chat-resume";

describe("chat pause/resume", () => {
  it("auto-resumes only on dropped connections", () => {
    expect(isConnectionError("Failed to fetch")).toBe(true);
    expect(isConnectionError("network error")).toBe(true);
    expect(isConnectionError("Not enough credits")).toBe(false);
    expect(isConnectionError("Connection refused: 403 forbidden")).toBe(false);
  });
  it("recognises the resume message", () => {
    expect(isResumeText(RESUME_TEXT)).toBe(true);
    expect(isResumeText("continue please")).toBe(false);
  });
});
