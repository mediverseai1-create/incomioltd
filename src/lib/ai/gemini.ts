import 'server-only';
import { z } from 'zod';

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
export class AiUnavailable extends Error {}

type Part = { text: string } | { inlineData: { mimeType: string; data: string } };

async function call(parts: Part[], system: string, json: boolean, attempt = 0): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new AiUnavailable('GEMINI_API_KEY is not configured.');
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts }],
      generationConfig: { temperature: 0.2, ...(json ? { responseMimeType: 'application/json' } : {}) },
    }),
  });
  if ((res.status === 429 || res.status >= 500) && attempt < 2) {
    await new Promise((r) => setTimeout(r, 800 * 2 ** attempt));
    return call(parts, system, json, attempt + 1);
  }
  if (!res.ok) throw new AiUnavailable(`Gemini request failed (${res.status}).`);
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('');
  if (!text) throw new AiUnavailable('Gemini returned an empty response.');
  return text;
}

export const aiConfigured = () => !!process.env.GEMINI_API_KEY;

export const SYSTEM_RULES = `You are Incomio, a financial operations analyst. Rules:
- Use ONLY the JSON data provided. Never invent customers, invoices, amounts, dates or forecasts.
- All figures in the data were calculated by the application; quote them exactly, never recalculate or mix currencies.
- Cite supporting records by their invoice reference or customer name. If data is missing, say so plainly.
- You analyse and recommend; you cannot move money, change records or contact customers. Recommendations require human approval.
- Present forecasts as estimates, not guarantees. This is analytical assistance, not accounting advice.`;

const stripFence = (t: string) => t.replace(/^\s*```(?:json)?\s*/i, '').replace(/```\s*$/, '');

export async function generateText(prompt: string, data: unknown) {
  return call([{ text: `${prompt}\n\nDATA:\n${JSON.stringify(data)}` }], SYSTEM_RULES, false);
}

/** Structured output validated with Zod; one repair retry on malformed JSON. */
export async function generateJson<T>(prompt: string, data: unknown, schema: z.ZodType<T>): Promise<T> {
  let lastErr = '';
  for (let i = 0; i < 2; i++) {
    const text = await call([{ text: `${prompt}${lastErr ? `\n\nYour previous reply was invalid: ${lastErr}. Return valid JSON only.` : ''}\n\nDATA:\n${JSON.stringify(data)}` }], SYSTEM_RULES, true);
    try { return schema.parse(JSON.parse(stripFence(text))); } catch (e) { lastErr = (e as Error).message.slice(0, 300); }
  }
  throw new AiUnavailable('Gemini returned malformed output twice.');
}

export async function extractFromFile<T>(prompt: string, mimeType: string, base64: string, schema: z.ZodType<T>): Promise<T> {
  const text = await call([{ inlineData: { mimeType, data: base64 } }, { text: prompt }], SYSTEM_RULES, true);
  return schema.parse(JSON.parse(stripFence(text)));
}
