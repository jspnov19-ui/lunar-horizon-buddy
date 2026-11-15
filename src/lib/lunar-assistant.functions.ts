import { createServerFn } from '@tanstack/react-start';
import { getRequestHeader } from '@tanstack/react-start/server';
import { z } from 'zod';

const Message = z.object({ role: z.enum(['user', 'assistant']), content: z.string().trim().min(1).max(1600) });
const AskSchema = z.object({ messages: z.array(Message).min(1).max(8) });
const recentRequests = new Map<string, number[]>();

export const askLunarLandingAssistant = createServerFn({ method: 'POST' })
  .validator(AskSchema)
  .handler(async ({ data }) => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return { ok: false as const, error: 'The assistant is not connected yet. The site owner needs to configure its server-side AI key.' };

    const ip = getRequestHeader('cf-connecting-ip') ?? getRequestHeader('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    const now = Date.now();
    const recent = (recentRequests.get(ip) ?? []).filter(time => now - time < 60_000);
    if (recent.length >= 12) return { ok: false as const, error: 'That is a lot of questions at once. Please wait a minute and try again.' };
    recent.push(now);
    if (recentRequests.size > 5000) recentRequests.clear();
    recentRequests.set(ip, recent);

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
        store: false,
        instructions: `You are Lunar Landing Assistant, a friendly explainer for a student lunar south-pole planning project. Answer in plain language first, then add one concise technical detail when useful. Keep answers under 150 words. Explain sunlight as line-of-sight above an illustrative local horizon, and Earth visibility as geometric direct-to-Earth visibility; neither guarantees power production or a usable radio link. The app uses a low-precision truncated Meeus ephemeris and illustrative 12-sector built-in horizon masks. Custom sites use a user-declared constant horizon, never surveyed terrain. Treat rankings as preliminary screening, not flight-certified guidance. Do not invent mission metrics or claim access to the live page unless those values are included in the conversation. When asked for a site recommendation, explain tradeoffs and ask which mission priority matters if it is unclear.`,
        input: data.messages.map(message => ({ role: message.role, content: message.content })),
        max_output_tokens: 320,
      }),
    });
    if (!response.ok) {
      if (response.status === 429) return { ok: false as const, error: 'The assistant is busy right now. Please try again shortly.' };
      return { ok: false as const, error: 'I could not reach the lunar assistant right now. Please try again.' };
    }
    const payload = await response.json() as { output?: Array<{ content?: Array<{ type?: string; text?: string }> }> };
    const answer = payload.output?.flatMap(item => item.content ?? []).filter(part => part.type === 'output_text').map(part => part.text ?? '').join('\n').trim();
    return answer ? { ok: true as const, answer } : { ok: false as const, error: 'I did not get an answer back. Please try asking another way.' };
  });
