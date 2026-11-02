import { SarvamAIClient } from "sarvamai";

const apiSubscriptionKey = process.env.SARVAM_API_KEY;
if (!apiSubscriptionKey) {
  console.error("Set SARVAM_API_KEY in your local .env before running this script.");
  process.exit(1);
}

const client = new SarvamAIClient({ apiSubscriptionKey });

try {
  const response = await client.chat.completions({
    model: "sarvam-105b-conversations",
    messages: [{ role: "user", content: "नमस्ते! अपना परिचय एक वाक्य में दीजिए।" }],
  }, { maxRetries: 0 });
  const reply = response.choices?.[0]?.message?.content;
  if (!reply) throw new Error("No reply returned");
  console.log(reply);
} catch (error) {
  // Do not dump SDK errors: they can contain request credentials.
  const status = typeof error?.statusCode === "number" ? error.statusCode : null;
  console.error(status ? `Sarvam call failed (HTTP ${status}).` : "Sarvam call failed or returned no reply.");
  process.exitCode = 1;
}