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

function normalizeModelName(raw) {
  const normalized = raw.trim().toLowerCase().replace(/\s+/g, "-");
  if (/[^a-z0-9._-]/.test(normalized) || normalized.length < 3) return null;
  return normalized;
}

function getModelName() {
  const raw = (process.env.GEMINI_MODEL || "gemini-3.5-flash-lite").trim();
  return normalizeModelName(raw) || "gemini-3.5-flash-lite";
}

// Similar, low-latency, tool-calling capable fallbacks for simple MilkEdin usecase.
// Stable models per https://ai.google.dev/gemini-api/docs/models (Sep 2026) & deprecations:
// - gemini-2.5-flash-lite / gemini-2.5-flash / gemini-2.5-pro are GA, no shutdown
// - gemini-3.5-flash / gemini-3.5-flash-lite / gemini-3.6/3.7/3.8-flash are latest stable
// Avoid gemini-2.0-* (shutdown Jun 1 2026) and preview models.
const DEFAULT_FALLBACK_MODELS = [
  "gemini-2.5-flash-lite", // fastest/budget, same tool-calling, highest RPM
  "gemini-2.5-flash", // balanced flash
  "gemini-3.5-flash", // newer flash generation
  "gemini-2.5-pro", // reasoning fallback (last resort)
];

function getFallbackModels() {
  const envRaw = process.env.GEMINI_FALLBACK_MODELS;
  if (envRaw && envRaw.trim()) {
    const parsed = envRaw
      .split(",")
      .map((s) => normalizeModelName(s))
      .filter(Boolean);
    if (parsed.length > 0) return parsed;
  }
  return DEFAULT_FALLBACK_MODELS;
}

function getModelChain() {
  const primary = getModelName();
  const fallbacks = getFallbackModels();
  const chain = [primary];
  for (const m of fallbacks) {
    if (!chain.includes(m)) chain.push(m);
  }
  return chain;
}

function isRetryableError(err) {
  // ApiError timeout from our own Promise.race is retryable
  if (err instanceof ApiError) {
    const m = (err.message || "").toLowerCase();
    if (m.includes("timed out")) return true;
    // auth errors are NOT retryable
    if (err.statusCode === 401 || err.statusCode === 403) return false;
    return false;
  }
  const msg = (err?.message || String(err)).toLowerCase();
  const status = err?.status || err?.code || err?.statusCode;
  // Auth / config errors -> not retryable
  if (status === 401 || status === 403) return false;
  if (msg.includes("api_key") || msg.includes("api key")) return false;
  // All busy/down/overloaded/model-unavailable/empty cases -> retryable
  if (
    msg.includes("429") ||
    msg.includes("rate") ||
    msg.includes("quota") ||
    msg.includes("resource exhausted") ||
    msg.includes("503") ||
    msg.includes("502") ||
    msg.includes("500") ||
    msg.includes("504") ||
    status === 429 ||
    status === 503 ||
    status === 500 ||
    status === 502 ||
    status === 504 ||
    msg.includes("overloaded") ||
    msg.includes("overload") ||
    msg.includes("unavailable") ||
    msg.includes("high demand") ||
    msg.includes("busy") ||
    msg.includes("timeout") ||
    msg.includes("deadline") ||
    msg.includes("internal error") ||
    msg.includes("try again") ||
    msg.includes("temporarily") ||
    msg.includes("empty response") ||
    msg.includes("invalid response") ||
    msg.includes("no candidates") ||
    msg.includes("is not found") ||
    msg.includes("is not supported") ||
    msg.includes("no longer available") ||
    msg.includes("unexpected model")
  )
    return true;
  return false;
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

async function generateWithFallback({ client, contents, systemInstruction, tools, temperature, modelChain, startIndex }) {
  let lastError = null;
  for (let i = startIndex; i < modelChain.length; i++) {
    const model = modelChain[i];
    try {
      const promise = client.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction,
          tools,
          temperature,
        },
      });
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("AI service timed out")), GEMINI_TIMEOUT_MS)
      );
      const response = await Promise.race([promise, timeout]);
      const candidate = response?.candidates?.[0];
      if (!candidate || !candidate.content) {
        throw new Error("AI service returned an invalid response - no candidates");
      }
      // Check for empty result (no text and no function calls) -> treat as retryable empty
      const { text, calls } = extractTextAndCalls(candidate);
      if (!text && calls.length === 0) {
        // Some models return empty parts when overloaded
        throw new Error("AI service returned an empty response");
      }
      return { response, model, index: i };
    } catch (err) {
      lastError = err;
      const msg = err?.message || String(err);
      const status = err?.status || err?.code || err?.statusCode;
      const retryable = isRetryableError(err);
      // Auth errors: fail fast, no fallback
      if (!retryable) {
        if (msg.includes("API_KEY") || msg.includes("API key") || status === 401 || status === 403) {
          throw ApiError.internal("AI service configuration error. Check GEMINI_API_KEY.");
        }
        throw err;
      }
      // If retryable and we have more models, log and try next
      if (i < modelChain.length - 1) {
        const nextModel = modelChain[i + 1];
        console.warn(`[AI] Model "${model}" failed (${status || ""} ${msg.slice(0, 300)}), falling back to "${nextModel}" (${i + 1}/${modelChain.length - 1})`);
        // small delay to avoid hammering
        await new Promise((r) => setTimeout(r, 200 * (i - startIndex + 1)));
        continue;
      }
      // Last model also failed
      console.error("[AI] All fallback models failed:", { lastModel: model, msg: msg.slice(0, 800), status });
      // Map to user-friendly message
      const lower = msg.toLowerCase();
      if (msg.includes("429") || lower.includes("rate") || lower.includes("quota") || status === 429) {
        throw ApiError.internal("AI service is busy (high demand). Please try again in a moment.");
      }
      if (lower.includes("503") || lower.includes("overloaded") || lower.includes("unavailable") || lower.includes("high demand") || status === 503) {
        throw ApiError.internal("AI service is busy (high demand). Please try again in a moment.");
      }
      throw ApiError.internal("AI service is temporarily unavailable. Please try again.");
    }
  }
  throw lastError || ApiError.internal("AI service is temporarily unavailable. Please try again.");
}

export async function chat({ userId, message }) {
  const client = getGenAIClient();
  const modelChain = getModelChain();
  const todayIST = getTodayIST();

  const contents = [
    { role: "user", parts: [{ text: buildUserMessage(message, todayIST) }] },
  ];

  const tools = toGeminiTools();
  const toolsUsed = [];
  let iterations = 0;
  let finalAnswer = "";
  let activeModelIndex = 0; // sticky: once a model succeeds, keep using it for subsequent tool rounds
  let lastSuccessfulModel = modelChain[0];

  while (iterations < MAX_TOOL_CALLS) {
    iterations++;

    const { response, model: usedModel, index: usedIndex } = await generateWithFallback({
      client,
      contents,
      systemInstruction: SYSTEM_INSTRUCTION,
      tools,
      temperature: 0.4,
      modelChain,
      startIndex: activeModelIndex,
    });
    // Stick to the successful model for next iterations (avoid flapping)
    activeModelIndex = usedIndex;
    lastSuccessfulModel = usedModel;
    if (usedIndex !== 0) {
      console.log(`[AI] Using fallback model "${usedModel}" (primary "${modelChain[0]}" failed)`);
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

  return { answer: finalAnswer, tools_used: [...new Set(toolsUsed)], model_used: lastSuccessfulModel };
}
