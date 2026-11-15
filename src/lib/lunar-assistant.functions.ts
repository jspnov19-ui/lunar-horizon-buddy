import { createServerFn } from '@tanstack/react-start';
import { getRequestHeader } from '@tanstack/react-start/server';
import { z } from 'zod';

const Message = z.object({ role: z.enum(['user', 'assistant']), content: z.string().trim().min(1).max(1600) });
const AskSchema = z.object({ messages: z.array(Message).min(1).max(8) });
const recentRequests = new Map<string, number[]>();

export const askLunarLandingAssistant = createServerFn({ method: 'POST' })
  .validator(AskSchema)
  .handler(async ({ data }) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return { ok: false as const, error: 'The assistant is not connected yet. The site owner needs to configure its server-side Gemini API key.' };

    const ip = getRequestHeader('cf-connecting-ip') ?? getRequestHeader('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    const now = Date.now();
    const recent = (recentRequests.get(ip) ?? []).filter(time => now - time < 60_000);
    if (recent.length >= 12) return { ok: false as const, error: 'That is a lot of questions at once. Please wait a minute and try again.' };
    recent.push(now);
    if (recentRequests.size > 5000) recentRequests.clear();
    recentRequests.set(ip, recent);

    const model = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: `You are Lunar Landing Assistant, a friendly explainer for a student lunar south-pole planning project. Answer in plain language first, then add one concise technical detail when useful. Keep answers under 100 words. Explain sunlight as line-of-sight above the horizon source named in the planner, and Earth visibility as geometric direct-to-Earth visibility; neither guarantees power production or a usable radio link. The planner uses a low-precision truncated Meeus ephemeris and, for built-in sites when the files load, a 72-sector local skyline derived from NASA LRO LOLA data at 240 m grid spacing. Other orbital views may use illustrative masks. Custom sites use a user-declared constant horizon, never surveyed terrain. Treat rankings as preliminary screening, not flight-certified guidance. Do not invent mission metrics or claim access to live page values unless included in the conversation. Explain tradeoffs for recommendations.` }] },
        contents: data.messages.map(message => ({ role: message.role === 'assistant' ? 'model' : 'user', parts: [{ text: message.content }] })),
        generationConfig: { maxOutputTokens: 180, temperature: 0.4 },
      }),
    });
    if (!response.ok) {
      if (response.status === 429) return { ok: false as const, error: 'The assistant is busy right now. Please try again shortly.' };
      return { ok: false as const, error: 'I could not reach the lunar assistant right now. Please try again.' };
    }
    const payload = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const answer = payload.candidates?.[0]?.content?.parts?.map(part => part.text ?? '').join('\n').trim();
    return answer ? { ok: true as const, answer } : { ok: false as const, error: 'I did not get an answer back. Please try asking another way.' };
  });
