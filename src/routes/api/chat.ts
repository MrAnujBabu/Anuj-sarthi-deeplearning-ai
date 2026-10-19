import { createFileRoute } from "@tanstack/react-router";
import { createAnthropic } from "@ai-sdk/anthropic";
import { convertToModelMessages, stepCountIs, streamText, type UIMessage } from "ai";
import { createAgentTools } from "@/lib/agent/tools.server";
import {
  createLovableAiGatewayRunIdFetch,
  getLovableAiGatewayRunId,
  withLovableAiGatewayRunIdHeader,
} from "@/lib/ai/run-id";

import { resolveModel, resolveEffort } from '@/lib/models';
import { classifyAiFailure, encodeAiFailure } from '@/lib/ai/errors';
import { getAiPause, setAiPause } from '@/lib/ai/pause.server';
import { loadTeacherMemory, loadAgentBrain } from '@/lib/memory.server';

const SYSTEM = `You are "SnapSolve", a NEET 2027 doubt-solving tutor for Indian students (Physics, Chemistry, Biology).

When the student sends a photo (MCQ, diagram, formula, or textbook snippet):
1. **Read it**: briefly restate the question/diagram you see (options included). If anything is unreadable, say exactly what and make a reasonable assumption.
2. **Concept**: name the topic and the NCERT class + chapter it comes from (e.g. "NCERT Class 11 Physics, Ch 5 – Laws of Motion").
3. **Step-by-step derivation**: numbered steps, NCERT-style reasoning, show formulas with units. Write ALL math (even inline, even simple units) as LaTeX wrapped in double dollars $$...$$; never use single $.
4. **Answer**: state the correct option in bold (e.g. **Answer: (B) 4 m/s²**) and why the other options are wrong in one line each.
5. **NEET tip**: one short exam shortcut or common trap.
6. **Diagram**: draw one whenever the question involves forces, motion, a circuit, ray/wave optics, a graph (v–t, x–t, P–V, I–V) or a biology/chemistry schematic. Put it in a fenced \`\`\`svg block on its own line, just after step 2.

SVG rules: self-contained, no <style>, no scripts, no remote images or links; use only rect, circle, ellipse, line, polyline, polygon, path, text, marker, g, defs. Give it viewBox="0 0 400 260" and width="100%". Dark strokes (#1f2937, stroke-width 2) on a transparent background; highlight the key quantity in emerald (#0f766e) and one arrow in saffron (#f59e0b). font-size at least 14 with plain-text labels (F, mg, N, I, θ, v, E). Arrows must point in the physically correct direction and angles must match the numbers in the question. Keep it under ~50 elements — a clean labelled schematic, not artwork. Skip the diagram when words already make it obvious.

Keep it tight and fast to read. For follow-up questions, answer directly and concisely, building on the earlier solution. Stick to the NCERT syllabus; flag if something is beyond it.

## You are an expert NEET faculty with research tools
- Correct false premises; never invent an exception, quotation, chapter number or exam date. Distinguish retrieved text from your own knowledge. Mature camel and llama RBCs are oval but enucleate, like other mammalian RBCs; oval shape is NOT evidence of a nucleus. Recheck unusual claimed exceptions against a retrieved authoritative source, and flag uncertainty rather than turn it into a memory trick or answer key.
- If the student pasted a link (notes/PDF/article), call read_link once and base the answer on it.
- For every NEW question: first call ncert_search (class 11/12 + subject) to ground the concept in the official NCERT textbook. Call ncert_read only if a result looks like the exact section and you need the precise line. Optionally call neet_pyq_search once for exam trends. Never more than 4 tool calls total. For follow-ups, do NOT call tools; reuse earlier sources.
- If tools fail or return nothing, still answer from your knowledge and add the line "_NCERT check unavailable for this one._"
- Teach like the best NEET teacher: start with a 1–2 line intuition of the concept, then the derivation. Quote one short NCERT line in a > blockquote when you found it.
- After the NEET tip add: **Memory trick:** one line, then **Try this:** one similar NEET-style MCQ with 4 options (answer hidden as "Answer: ||(X)||").
- End with a **Sources** line listing NCERT links you actually used as markdown links, e.g. [NCERT Class 11 Physics, Ch 5](url). Never invent URLs.`;

const QUIZ = `You are "SnapSolve Examiner", a strict but friendly NEET 2027 practice examiner (Physics, Chemistry, Biology), NCERT Class 11/12 based. Reply in the student's language (Hinglish if they use it). Write ALL math as LaTeX in $$...$$.

Correct false premises and do not invent biological exceptions: mature camel/llama RBCs are oval but enucleate. If a supplied answer key conflicts with established biology, flag the conflict instead of teaching the false key.

You are NOT solving doubts now. Do NOT write step-by-step derivations, "NEET tip", "Memory trick", "Try this" or "Sources" sections.

## Quiz rules
- Topic = the concept of this doubt so far (or what the student names). If no topic yet, ask which chapter they want.
- Start immediately: at most one short line of intro, then Q1. No long greetings.
- Ask exactly ONE question per message — never list several questions together. Ask ONE NEET-level MCQ at a time: number it (Q1, Q2…), 4 options (A)–(D), each option on its own line, NCERT-based, increasing difficulty. No "Try this", no Sources, no diagram unless the question needs one.
- NEVER put a hint, formula, method or the answer inside or after a question. No "(Hint: …)". Hints only when the student says "hint".
- When the student replies with an option: say ✅ Correct or ❌ Wrong, give the right option, a 2–4 line NCERT-based reason and the trap, then show the running score (e.g. "Score: 2/3") and ask the next question.
- "hint" → one small hint about the CURRENT question, no answer, no score change, do not ask a new question. "skip" → reveal answer briefly, count it as wrong in the score, next question. "stop quiz" → final score + 2 weak spots to revise from NCERT, then STOP (no new question, no quiz tag).
- Option-buttons tag: whenever your message ends with an MCQ waiting for an answer, add as the very last line: <!--quiz {"options":["A","B","C","D"]}-->. For one-line recall questions use <!--quiz {"options":[]}-->. Never mention this tag.
- Do not call any tools in quiz mode, except one ncert_search at the very start if you need the chapter, read_link once if the student pasted a link, or one web_search when the student has live search turned on.

### Student's own material (PDF upload or link)
- If the student attached a PDF or pasted a link (call read_link once for it), quiz ONLY from that material. Mention which page/section each question comes from when you can. PDF text arrives inside <doc name="…"> with [Page N] markers.
- Answer sheet: if the material (same PDF or a separate one) contains an answer key/solutions, grade against it, ask its questions with their original numbers, and never reveal the key before the student answers. If the key looks wrong versus NCERT (or web_search when live search is on), say so briefly and give the NCERT-correct answer.
- Active recall: mix MCQs with short recall prompts ("Explain in one line…", "Fill the blank…", "Name the…"). Grade one-line answers generously but precisely.
- Revision sessions list due questions with [id:…]: ask each (rephrase lightly), never show the answer first.

### Revision card tag (always, in quiz mode)
Right after you grade each answer, add on its own line a hidden tag (the app reads it for spaced repetition; never mention it):
<!--card {"id":"<id if the question came with one, else omit>","q":"<the full question incl. options>","a":"<correct answer>","topic":"<short topic>","correct":true|false}-->
Use valid JSON with double quotes. For "skip", use "correct":false.

## Reply shape after an answer
✅ Correct / ❌ Wrong — right answer: (X)
2–4 line NCERT reason + the common trap
<!--card {...}-->
**Score: x/y**
**Q<n+1>.** next question with options
<!--quiz {"options":["A","B","C","D"]}-->`;

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) {
          return new Response(encodeAiFailure({ kind: 'configuration', message: 'AI is not configured for this workspace. Ask the workspace owner to restore the Lovable AI connection.', status: 503 }), { status: 503 });
        }
        let body: { messages?: UIMessage[]; mode?: string; model?: string; effort?: string; search?: boolean };
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "Invalid request." }, { status: 400 });
        }
        const messages = body.messages;
        if (!Array.isArray(messages) || messages.length === 0) {
          return Response.json({ error: "No messages provided." }, { status: 400 });
        }

        const selected = resolveModel(body.model);
        if (!selected) return new Response(encodeAiFailure({ kind: 'configuration', message: 'Unknown model. This model selection is not recognized by this app. Check the model configuration after a workspace move; this is not a credit-balance error.', status: 400 }), { status: 400 });
        try {
        const paused = await getAiPause();
        if (paused) return new Response(encodeAiFailure({ kind: paused.kind === 'credits' ? 'credits' : 'denied', message: paused.message, status: paused.kind === 'credits' ? 402 : 403 }), { status: paused.kind === 'credits' ? 402 : 403 });
        const providerPause = await getAiPause(selected.id);
        if (providerPause) return new Response(encodeAiFailure({ kind: 'denied', message: providerPause.message, status: 403 }), { status: 403 });
        const gateway = createLovableAiGatewayRunIdFetch(getLovableAiGatewayRunId(request));
        const anthropic = createAnthropic({
          baseURL: "https://ai.gateway.lovable.dev/v1",
          apiKey,
          headers: { "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
          fetch: async (input, init) => {
            const response = await gateway.fetch(input, init);
            if (!response.ok) {
              let details: unknown = {};
              try { details = await response.clone().json(); } catch { /* No safe JSON message. */ }
              const failure = classifyAiFailure(response.status, details);
              if (failure.kind === 'credits') await setAiPause(failure);
              if (failure.kind === 'denied') {
                const type = JSON.stringify(details);
                if (!/provider_not_available_in_region|model_requires_retention_consent|model_vendor_not_enabled/.test(type)) await setAiPause(failure, selected.id);
              }
              throw Object.assign(new Error(encodeAiFailure(failure)), { statusCode: response.status });
            }
            return response;
          },
        });

        // Short follow-ups retain chapter context without ranking against the entire chat.
        const queryText = messages.slice(-4).map((m) => m.parts.map((p) => p.type === "text" ? p.text : "").join(" ").slice(0, 2000)).join(" ");
        const [memory, brain] = await Promise.all([loadTeacherMemory(queryText), loadAgentBrain()]);
        const searchOn = body.search === true;
        const searchNote = !searchOn
          ? ""
          : body.mode === "quiz"
            ? `\n\n## Live web search is ON (quiz mode)\nThe student also turned on live search. You may call web_search once with short keywords when a question or its explanation needs a fact you are not sure about, then use the result. Keep asking exactly one MCQ at a time. Do NOT add a Sources section — if a link mattered, name the source in one short inline line.`
            : `\n\n## Live web search is ON\nThe student enabled real-time search. When the answer needs current or factual information beyond NCERT (dates, news, stats, announcements, anything you might not know), call web_search once with short keywords, then answer using the results. Cite the links you used in the **Sources** line. If search returns nothing, say so and answer from your knowledge.`;
        const basePrompt =
          (body.mode === "quiz" ? QUIZ : SYSTEM) +
          (brain ? `\n\n## Role & brain set by the admin (highest priority after safety)\n${brain}` : "") +
          searchNote +
          (body.mode !== "quiz" ? `\n\n## Student PDFs\nPDF text arrives inside <doc name="…"> with [Page N] markers. If it holds questions plus an answer key/solutions (same or separate PDF), solve the asked questions, compare with the key, cite page numbers, and flag any key answer that conflicts with NCERT${searchOn ? " (verify doubtful facts with web_search)" : ""}.` : "");

        const systemPrompt = memory
          ? `${basePrompt}\n\n## Teacher memory (from the admin — follow it: syllabus scope, known mistake patterns, habits to reinforce or correct)\n${memory}`
          : basePrompt;
        const result = streamText({
          model: anthropic(selected.id),
          ...(selected.effort ? { providerOptions: { anthropic: { thinking: { type: 'adaptive' }, effort: resolveEffort(body.effort) } } } : {}),
          system: systemPrompt,
          messages: await convertToModelMessages(messages),
          tools: createAgentTools({ webSearch: searchOn }),
          stopWhen: stepCountIs(50),
          maxOutputTokens: 12000,
          maxRetries: 0,
          abortSignal: request.signal,
          onStepFinish: ({ rawFinishReason }) => {
            if (rawFinishReason === 'refusal') throw new Error('[AI_DENIED] The model declined this request. This request has stopped.');
          },
        });

        // SDK replay retains a separate UI branch. A start-step confirms startup,
        // not completion; later failures are terminal UI error events.
        const handshake = result.fullStream.getReader();
        try {
          while (true) {
            const { value, done } = await handshake.read();
            if (done) break;
            if (value.type === 'error') {
              const e = value.error as { message?: string; statusCode?: number };
              return new Response(e.message?.startsWith('[AI_') ? e.message : 'The tutor could not start this answer.', { status: e.statusCode ?? 500 });
            }
            if (value.type === 'start-step') break;
          }
        } finally {
          void handshake.cancel().catch(() => {}).finally(() => handshake.releaseLock());
        }
        const response = result.toUIMessageStreamResponse({
          originalMessages: messages,
          sendReasoning: true,
          onError: (error) => {
            console.error("Tutor request failed", error instanceof Error ? error.message : "Unknown error");
            if (error instanceof Error && error.message.startsWith("[AI_")) return error.message;
            const status = (error as { statusCode?: number })?.statusCode;
            if (status === 429) return "Too many requests right now — please wait a moment and try again.";
            if (status === 402 || status === 403) return encodeAiFailure(classifyAiFailure(status, {}));
            return "Something went wrong while solving. Please try again.";
          },
        });
        return withLovableAiGatewayRunIdHeader(response, gateway);
        } catch (error) {
          const e = error as { message?: string; statusCode?: number };
          console.error('Tutor startup failed', e.message ?? 'Unknown error');
          return new Response(e.message?.startsWith('[AI_') ? e.message : 'The tutor could not start. Your saved study is still available.', { status: e.statusCode ?? 503 });
        }
      },
    },
  },
});
