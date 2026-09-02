import { GoogleGenAI } from "@google/genai";
import ApiError from "../../common/utils/api-error.js";
import { SYSTEM_INSTRUCTION, buildUserMessage } from "./ai.prompts.js";
import { toolDefinitions, executeTool, allowedToolNames } from "./ai.tools.js";

const MAX_TOOL_CALLS = 5;
const GEMINI_TIMEOUT_MS = 45000;

function getTodayIST() {
  // Asia/Kolkata is UTC+5:30, no DST
  const now = new Date();
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const ist = new Date(now.getTime() + istOffsetMs);
  // Use UTC methods after offset to avoid local TZ double-shift
  const y = ist.getUTCFullYear();
  const m = String(ist.getUTCMonth() + 1).padStart(2, "0");
  const d = String(ist.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getModelName() {
  const raw = (process.env.GEMINI_MODEL || "gemini-3.5-flash-lite").trim();
  // normalize accidental "Gemini 3.1 Flash Lite" -> "gemini-3.1-flash-lite"
  const normalized = raw.toLowerCase().replace(/\s+/g, "-");
  if (/[^a-z0-9._-]/.test(normalized) || normalized.length < 3) return "gemini-3.5-flash-lite";
  return normalized;
}

function getGenAIClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw ApiError.internal("AI service is not configured. Missing GEMINI_API_KEY");
  return new GoogleGenAI({ apiKey });
}

function toGeminiTools() {
  return [{ functionDeclarations: toolDefinitions }];
}

function extractTextAndCalls(candidate) {
  const parts = candidate?.content?.parts || [];
  let text = "";
  const calls = [];
  for (const p of parts) {
    if (p.text) text += p.text;
    if (p.functionCall) calls.push(p.functionCall);
  }
  return { text: text.trim(), calls };
}

export async function chat({ userId, message }) {
  const client = getGenAIClient();
  const model = getModelName();
  const todayIST = getTodayIST();

  const contents = [
    { role: "user", parts: [{ text: buildUserMessage(message, todayIST) }] },
  ];

  const tools = toGeminiTools();
  const toolsUsed = [];
  let iterations = 0;
  let finalAnswer = "";

  while (iterations < MAX_TOOL_CALLS) {
    iterations++;

    let response;
    try {
      const promise = client.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          tools,
          temperature: 0.4,
        },
      });
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(ApiError.internal("AI service timed out. Please try again.")), GEMINI_TIMEOUT_MS)
      );
      response = await Promise.race([promise, timeout]);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      const msg = err?.message || String(err);
      const status = err?.status || err?.code;
      console.error("[AI] Gemini error:", { status, msg: msg.slice(0, 800), model });
      if (msg.includes("429") || msg.toLowerCase().includes("rate") || status === 429 || status === 503 || msg.includes("503") || msg.toLowerCase().includes("unavailable") || msg.toLowerCase().includes("high demand")) {
        throw ApiError.internal("AI service is busy (high demand). Please try again in a moment.");
      }
      if (msg.includes("API_KEY") || msg.includes("API key") || status === 401 || status === 403) {
        throw ApiError.internal("AI service configuration error. Check GEMINI_API_KEY.");
      }
      if (
        msg.includes("unexpected model name format") ||
        (msg.toLowerCase().includes("is not found") && msg.toLowerCase().includes("model")) ||
        (msg.toLowerCase().includes("is not supported") && msg.toLowerCase().includes("model")) ||
        msg.includes("no longer available")
      ) {
        throw ApiError.internal(`AI model "${model}" is invalid or unavailable. Update GEMINI_MODEL in .env (try gemini-3.5-flash-lite).`);
      }
      console.error("[AI] Full error:", err);
      throw ApiError.internal("AI service is temporarily unavailable. Please try again.");
    }

    const candidate = response?.candidates?.[0];
    if (!candidate) throw ApiError.internal("AI service returned an invalid response.");

    const { text, calls } = extractTextAndCalls(candidate);

    if (calls.length === 0) {
      finalAnswer = text || "I could not generate a response for that question.";
      break;
    }

    // Validate and execute each function call
    const functionResponseParts = [];
    for (const call of calls) {
      const name = call.name;
      const args = call.args || {};

      if (!allowedToolNames.has(name)) {
        throw ApiError.badRequest(`AI requested an unknown tool: ${name}`);
      }
      toolsUsed.push(name);

      let result;
      try {
        result = await executeTool(name, args, userId);
      } catch (toolErr) {
        // Return error as tool result so model can explain gracefully
        const errMsg = toolErr instanceof ApiError ? toolErr.message : "Tool execution failed";
        result = { error: errMsg };
      }

      functionResponseParts.push({
        functionResponse: {
          name,
          ...(call.id ? { id: call.id } : {}),
          response: { result },
        },
      });
    }

    // Append model functionCall turn and tool results to history
    // Note: Gemini API v1beta expects tool responses with role "user" (not "tool")
    contents.push(candidate.content);
    contents.push({ role: "user", parts: functionResponseParts });

    // If model also returned text alongside calls, capture it as potential answer on next iter
    if (text && iterations === MAX_TOOL_CALLS) {
      finalAnswer = text;
    }
  }

  if (!finalAnswer) {
    // One more call is not needed; synthesize from last iteration if loop exhausted
    finalAnswer = "I gathered the data but could not formulate a final answer. Please try rephrasing your question.";
  }

  return { answer: finalAnswer, tools_used: [...new Set(toolsUsed)] };
}
