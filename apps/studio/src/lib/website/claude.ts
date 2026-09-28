import 'server-only';
import { UserError } from '@/lib/action';

// Sends the brief (and the business's own material) to Claude through the Anthropic API
// and returns Claude's reply. The key (ANTHROPIC_API_KEY) stays on the server.
// Streamed, so a long website doesn't hit connection time limits.

/** Fast enough to write a whole website within the hosting time limit; set ANTHROPIC_MODEL to change. */
export const DEFAULT_MODEL = 'claude-sonnet-5';

export type Attachment =
  | { kind: 'pdf'; filename: string; data: Uint8Array }
  | { kind: 'text'; filename: string; text: string }
  | { kind: 'image'; caption: string; data: Uint8Array };

export type ClaudeReply = { text: string; model: string; inputTokens: number; outputTokens: number; seconds: number };

export const claudeConnected = () => !!process.env.ANTHROPIC_API_KEY;

function content(brief: string, attachments: Attachment[]) {
  const blocks: unknown[] = [];
  for (const a of attachments) {
    if (a.kind === 'pdf') blocks.push({ type: 'document', title: a.filename, source: { type: 'base64', media_type: 'application/pdf', data: Buffer.from(a.data).toString('base64') } });
    else if (a.kind === 'text') blocks.push({ type: 'document', title: a.filename, source: { type: 'text', media_type: 'text/plain', data: a.text } });
    else {
      blocks.push({ type: 'text', text: a.caption });
      blocks.push({ type: 'image', source: { type: 'base64', media_type: 'image/webp', data: Buffer.from(a.data).toString('base64') } });
    }
  }
  blocks.push({ type: 'text', text: brief });
  return blocks;
}

/** Reads Anthropic's server-sent events: the text as it arrives, token counts and why it stopped. */
async function readStream(body: ReadableStream<Uint8Array>) {
  const reader = body.getReader();
  const dec = new TextDecoder();
  let buf = '', text = '', input = 0, output = 0, stop = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf('\n\n')) >= 0) {
      const event = buf.slice(0, i);
      buf = buf.slice(i + 2);
      const data = event.split('\n').filter((l) => l.startsWith('data:')).map((l) => l.slice(5).trim()).join('');
      if (!data) continue;
      const e = JSON.parse(data) as { type: string; delta?: { type?: string; text?: string; stop_reason?: string }; message?: { usage?: { input_tokens?: number } }; usage?: { output_tokens?: number }; error?: { message?: string } };
      if (e.type === 'message_start') input = e.message?.usage?.input_tokens ?? 0;
      else if (e.type === 'content_block_delta' && e.delta?.type === 'text_delta') text += e.delta.text ?? '';
      else if (e.type === 'message_delta') { output = e.usage?.output_tokens ?? output; stop = e.delta?.stop_reason ?? stop; }
      else if (e.type === 'error') throw new UserError(`Claude stopped with an error: ${e.error?.message ?? 'unknown'}. Please try again.`);
    }
  }
  return { text, input, output, stop };
}

export async function askClaude(brief: string, attachments: Attachment[] = [], f: typeof fetch = fetch): Promise<ClaudeReply> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new UserError('Automatic building isn’t connected yet: add ANTHROPIC_API_KEY to the server settings. Or use the copy-and-paste route below.');
  const model = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;
  const base = (process.env.ANTHROPIC_API_URL ?? 'https://api.anthropic.com').replace(/\/$/, '');
  const started = Date.now();
  let r: Response;
  try {
    r = await f(`${base}/v1/messages`, {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model, max_tokens: 32000, stream: true, messages: [{ role: 'user', content: content(brief, attachments) }] }),
      signal: AbortSignal.timeout(280_000),
    });
  } catch {
    throw new UserError('Claude took too long to answer. Please try again; a shorter brief (fewer pages) is quicker.');
  }
  if (!r.ok || !r.body) {
    const detail = await r.json().then((d: { error?: { message?: string } }) => d.error?.message ?? '').catch(() => '');
    if (r.status === 401) throw new UserError('Anthropic refused the key. Check ANTHROPIC_API_KEY in the server settings.');
    if (/credit balance/i.test(detail)) throw new UserError('Your Anthropic account is out of credit. Add credit at console.anthropic.com → Billing, then try again.');
    if (r.status === 429 || r.status === 529) throw new UserError('Claude is busy right now. Please try again in a minute.');
    if (r.status === 404 && /model/i.test(detail)) throw new UserError(`The Claude model “${model}” isn’t available to this key. Check ANTHROPIC_MODEL in the server settings.`);
    throw new UserError(`Claude couldn’t take the request${detail ? `: ${detail}` : ''}. Please try again.`);
  }
  const { text, input, output, stop } = await readStream(r.body);
  if (stop === 'max_tokens') throw new UserError('Claude’s website was longer than one answer allows. Ask for fewer pages or sections in “Anything else Claude should know”, then try again.');
  if (!text.trim()) throw new UserError('Claude sent an empty answer. Please try again.');
  return { text, model, inputTokens: input, outputTokens: output, seconds: Math.round((Date.now() - started) / 1000) };
}
