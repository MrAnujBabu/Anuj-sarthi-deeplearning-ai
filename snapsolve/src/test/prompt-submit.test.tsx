import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PromptInput, PromptInputTextarea } from "@/components/ai-elements/prompt-input";
import { Button } from "@/components/ui/button";

const hydration = vi.hoisted(() => ({ ready: false }));
vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...await importOriginal<typeof import("@tanstack/react-router")>(),
  useHydrated: () => hydration.ready,
}));
afterEach(cleanup);

describe("Question submission", () => {
  it("blocks submission until ready, then sends the typed question once", async () => {
    hydration.ready = false;
    const onSubmit = vi.fn();
    const composer = () => <PromptInput onSubmit={onSubmit}>
      <PromptInputTextarea />
      <Button type="submit">Send</Button>
    </PromptInput>;
    const screen = render(composer());
    act(() => screen.getByRole("button", { name: "Send" }).click());
    expect(onSubmit).not.toHaveBeenCalled();
    hydration.ready = true;
    screen.rerender(composer());
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Find acceleration for 2 kg and 8 N" } });
    act(() => screen.getByRole("button", { name: "Send" }).click());
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0]?.[0]).toEqual({ text: "Find acceleration for 2 kg and 8 N", files: [] });
  });
});