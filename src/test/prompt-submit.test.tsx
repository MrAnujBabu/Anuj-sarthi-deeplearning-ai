import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PromptInput, PromptInputTextarea, usePromptInputAttachments } from "@/components/ai-elements/prompt-input";
import { Button } from "@/components/ui/button";

const hydration = vi.hoisted(() => ({ ready: false }));
vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...await importOriginal<typeof import("@tanstack/react-router")>(),
  useHydrated: () => hydration.ready,
}));
afterEach(cleanup);

function AttachmentCount() {
  const { files } = usePromptInputAttachments();
  return <output aria-label="Attachment count">{files.length}</output>;
}

describe("Question submission", () => {
  it("detaches sent files before an async answer finishes and preserves new attachments", async () => {
    hydration.ready = true;
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('data:application/pdf;base64,cGRm');
    let finish: (() => void) | undefined;
    const pending = new Promise<void>((resolve) => { finish = resolve; });
    const onSubmit = vi.fn((_message: import('@/components/ai-elements/prompt-input').PromptInputMessage) => pending);
    const screen = render(<PromptInput onSubmit={onSubmit}><AttachmentCount /><PromptInputTextarea /><Button type="submit">Send</Button></PromptInput>);
    const input = screen.container.querySelector('input[type=file]');
    if (!input) throw new Error('Missing file input');
    fireEvent.change(input, { target: { files: [new File(['pdf'], 'worksheet.pdf', { type: 'application/pdf' })] } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(screen.getByLabelText('Attachment count').textContent).toBe('0');
    expect(onSubmit.mock.calls[0]?.[0].files[0]?.filename).toBe('worksheet.pdf');
    fireEvent.change(input, { target: { files: [new File(['new'], 'next.pdf', { type: 'application/pdf' })] } });
    await act(async () => { finish?.(); await pending; });
    expect(screen.getByLabelText('Attachment count').textContent).toBe('1');
    vi.restoreAllMocks();
  });
  it("restores the submitted file and question when submission fails", async () => {
    hydration.ready = true;
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('data:application/pdf;base64,cGRm');
    const screen = render(<PromptInput onSubmit={async () => { throw new Error('failed'); }}><AttachmentCount /><PromptInputTextarea /><Button type="submit">Send</Button></PromptInput>);
    const input = screen.container.querySelector('input[type=file]');
    if (!input) throw new Error('Missing file input');
    fireEvent.change(input, { target: { files: [new File(['pdf'], 'worksheet.pdf', { type: 'application/pdf' })] } });
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Quiz from this PDF' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    await waitFor(() => expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('Quiz from this PDF'));
    expect(screen.getByLabelText('Attachment count').textContent).toBe('1');
    vi.restoreAllMocks();
  });
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