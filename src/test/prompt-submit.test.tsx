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
  it("accepts PPTX by extension when browser MIME is missing", async () => {
    hydration.ready = true;
    const createUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test-pptx');
    const screen = render(<PromptInput accept=".pptx" onSubmit={vi.fn()}><PromptInputTextarea /></PromptInput>);
    const input = screen.container.querySelector('input[type=file]');
    if (!input) throw new Error('Missing file input');
    fireEvent.change(input, { target: { files: [new File(['slides'], 'lesson.PPTX', { type: '' })] } });
    await waitFor(() => expect(createUrl).toHaveBeenCalledTimes(1));
    expect(createUrl.mock.calls[0]?.[0]).toMatchObject({ name: 'lesson.PPTX', type: '' });
    createUrl.mockRestore();
  });
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
  it("keeps the selected model when clearing a submitted question", async () => {
    hydration.ready = true;
    const onSubmit = vi.fn();
    const screen = render(<PromptInput onSubmit={onSubmit}>
      <PromptInputTextarea />
      <select aria-label="Model" defaultValue="sonnet"><option value="sonnet">Sonnet</option><option value="haiku">Haiku</option></select>
      <Button type="submit">Send</Button>
    </PromptInput>);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "haiku" } });
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Chemical bonding" } });
    act(() => screen.getByRole("button", { name: "Send" }).click());
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect((screen.getByRole("combobox") as HTMLSelectElement).value).toBe("haiku");
    expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toBe("");
  });
});