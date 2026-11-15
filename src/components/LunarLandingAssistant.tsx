import { useRef, useState } from 'react';
import { Bot, MessageCircle, Send, Sparkles, X } from 'lucide-react';
import { askLunarLandingAssistant } from '@/lib/lunar-assistant.functions';

type Message = { role: 'user' | 'assistant'; content: string };
const STARTER: Message = { role: 'assistant', content: 'Hi! I can explain the lunar south-pole planner, its sunlight and Earth-visibility estimates, or the assumptions behind a landing-site comparison. What are you curious about?' };
const SUGGESTIONS = ['Why does sunlight change so much?', 'What does “Earth in view” mean?', 'How should I read the longest dark period?'];

export function LunarLandingAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([STARTER]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  const send = async (text: string) => {
    const question = text.trim();
    if (!question || sending) return;
    const next = [...messages, { role: 'user' as const, content: question }].slice(-8);
    setMessages(next);
    setDraft('');
    setError('');
    setSending(true);
    try {
      const result = await askLunarLandingAssistant({ data: { messages: next } });
      if (result.ok) setMessages([...next, { role: 'assistant', content: result.answer }]);
      else setError(result.error);
    } catch {
      setError('The assistant could not respond. Please try again in a moment.');
    } finally {
      setSending(false);
      window.setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), 30);
    }
  };

  return <div className="lunar-assistant-root">
    {open && <section className="lunar-assistant-panel" aria-label="Lunar Landing Assistant">
      <header className="lunar-assistant-header"><div className="flex min-w-0 items-center gap-3"><span className="assistant-avatar"><Sparkles className="size-4" /></span><div className="min-w-0"><h2 className="truncate text-sm font-semibold">Lunar Landing Assistant</h2><p className="mt-0.5 text-[10px] text-white/55">Plain-language mission guide</p></div></div><button type="button" aria-label="Close assistant" onClick={() => setOpen(false)} className="rounded-lg p-2 text-white/60 hover:bg-white/10 hover:text-white"><X className="size-4" /></button></header>
      <div className="lunar-assistant-messages" aria-live="polite">
        {messages.map((message, i) => <div key={`${i}-${message.role}`} className={`assistant-message ${message.role === 'user' ? 'assistant-message-user' : 'assistant-message-bot'}`}><span className="mb-1 block text-[9px] uppercase tracking-wider opacity-55">{message.role === 'user' ? 'You' : 'Lunar guide'}</span><p className="whitespace-pre-wrap text-xs leading-relaxed">{message.content}</p></div>)}
        {sending && <div className="assistant-message assistant-message-bot"><span className="assistant-thinking"><i /><i /><i /></span><span className="sr-only">Assistant is thinking</span></div>}
        {error && <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-[11px] leading-relaxed text-destructive">{error}</p>}
        {messages.length === 1 && <div className="flex flex-wrap gap-1.5">{SUGGESTIONS.map(suggestion => <button type="button" key={suggestion} onClick={() => void send(suggestion)} className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-left text-[10px] text-white/65 transition hover:border-primary/30 hover:text-white">{suggestion}</button>)}</div>}
        <div ref={endRef} />
      </div>
      <form className="lunar-assistant-compose" onSubmit={event => { event.preventDefault(); void send(draft); }}><textarea value={draft} onChange={event => setDraft(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void send(draft); } }} maxLength={1200} rows={2} aria-label="Ask the Lunar Landing Assistant" placeholder="Ask about lunar sites, sunlight, or the model…" className="min-h-11 flex-1 resize-none bg-transparent text-xs leading-relaxed text-foreground outline-none placeholder:text-muted-foreground" /><button type="submit" disabled={sending || !draft.trim()} aria-label="Send message" className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"><Send className="size-4" /></button></form>
      <p className="px-4 pb-3 text-center text-[9px] leading-relaxed text-muted-foreground">AI explanations can be wrong. Planning estimates are not flight guidance.</p>
    </section>}
    <button type="button" onClick={() => setOpen(v => !v)} className="lunar-assistant-launcher" aria-expanded={open} aria-label={open ? 'Close Lunar Landing Assistant' : 'Open Lunar Landing Assistant'}>{open ? <X className="size-5" /> : <><MessageCircle className="size-5" /><span className="assistant-launcher-label">Ask Lunar AI</span><Bot className="assistant-launcher-bot size-4" /></>}</button>
  </div>;
}
