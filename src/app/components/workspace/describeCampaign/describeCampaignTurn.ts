import { z } from 'zod';
import { importCampaignSchema, type ImportCampaignDraft } from '../import/importDto';

const DEFAULT_MODEL = 'gpt-4o-mini';

export const describeFormFieldSchema = z.object({
  id: z.string(),
  label: z.string(),
  type: z.enum(['text', 'textarea', 'select', 'date']),
  options: z.array(z.string()).optional(),
  value: z.string().optional(),
});

export const describeTurnResultSchema = z.object({
  assistant_message: z.string(),
  ready: z.boolean(),
  /** Full campaign draft in import shape; replace previous each turn. */
  draft: z.unknown(),
  form: z.array(describeFormFieldSchema).optional(),
});

export type DescribeTurnResult = z.infer<typeof describeTurnResultSchema>;
export type DescribeFormField = z.infer<typeof describeFormFieldSchema>;

export type DescribeChatMessage = { role: 'user' | 'assistant'; content: string };

function extractJsonObject(raw: string): string {
  const t = raw.trim();
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start >= 0 && end > start) return t.slice(start, end + 1);
  return t;
}

function buildSystemPrompt(): string {
  return `You are a media planning assistant for AdWeb (Norwegian media planning). Help the user describe a campaign in a short, friendly conversation.

You MUST respond with a single JSON object (no markdown code fences) with exactly these keys:
- "assistant_message" (string): What you say to the user — concise, helpful. Suggest dates, budget, order lines, or flights when useful, but **nothing is required** before the user can save a campaign.
- "ready" (boolean): Set true when the draft is usable (even minimal: e.g. only a name), or when you think saving makes sense. Set false while you have nothing meaningful to merge yet.
- "draft" (object): The full updated campaign in the import JSON shape below. Replace the entire draft each turn with all fields you know.
- "form" (optional array): If structured input helps (e.g. region, channel pickers), add fields: { "id", "label", "type": "text"|"textarea"|"select"|"date", "options"?: string[], "value"?: string }

Import / draft shape:
- name (string), advertiser (string), startDate, endDate as YYYY-MM-DD when known — use "" if dates are not set yet
- status optional: draft | booked | active | completed | paused
- budget optional: { total (number), currency NOK|EUR|USD, type gross|net }
- notes optional string
- orderLines: array (may be empty). Each order line: { name, startDate, endDate (YYYY-MM-DD or ""), budgetWeight 0-100 optional, requisitionNumbers optional, targeting optional { county, gender, context }, flights: [ { name, channel, startDate, endDate (YYYY-MM-DD or ""), budgetWeight optional, targetAudience optional } ] }

**Ask** politely for missing details (dates, budget, structure) but **never block** creating — partial drafts must stay valid JSON.

**Timeline:** Campaigns without both campaign startDate and endDate (valid ISO days) appear in the list and editor but **not** on the timeline until dates are set.

Targeting (optional):
- county: Norwegian fylke name OR "All"
- gender: all | male | female | other
- context: all | sport | news | entertainment | reality | living | family

Channels must be one of: tv, digital, radio, outdoor.

Norwegian counties: use 2024 names when possible (Akershus, Oslo, …). Legacy merged names are ok.

Never invent real client PII. If name is unknown, use a short placeholder until the user provides one.

Dates: use YYYY-MM-DD; do not shift for time zones.

Calendar year default: If the user gives only day/month, only week numbers, or any range **without a calendar year**, assume **the current calendar year** (today's year unless they specify another year explicitly).

Week numbers (ISO weeks, Europe/Norway): When the user expresses a span with **week numbers** (e.g. "uke 10–12", "weeks 12 to 14"):
- The **startDate** for that span must be the **Monday** of the **starting** ISO week.
- The **endDate** must be the **Sunday** of the **ending** ISO week (the last day of that calendar week — Monday–Sunday weeks).
Use ISO 8601 week numbering (Week 1 contains the year's first Thursday). If ranges cross a year boundary, output the correct calendar year on each YYYY-MM-DD.

Whenever any resolved date falls **before today** and the user has not explicitly asked for historical or backdated periods, mention that in assistant_message. The app may require the user to confirm before saving.

For optional fields, omit keys entirely from JSON when unknown — do not use null (null breaks the app parser). Use [] for empty orderLines or flights arrays, not null.

Never tell the user to "wait", "hold on", or that something is processing in the background — there is no async job.

Do not say the campaign is "already" on the timeline, "created in the app", or "in your plan" in the assistant text — the UI adds it only after this JSON response.

If the user only gave a title, still output e.g. { "name": "…", "advertiser": "", "startDate": "", "endDate": "", "orderLines": [] } and set ready:true so they can save and add details later.`;
}

/**
 * LLMs often emit `null` for optional fields; Zod (import DTO) expects omitted keys or
 * `undefined` — `null` fails validation, which blocked "Add to timeline" even when the
 * conversation looked complete. Also fixes stringified `draft` and `flights: null`.
 */
export function normalizeDescribeDraftInput(d: unknown): unknown {
  if (d == null) return {};
  let x: unknown = d;
  if (typeof x === 'string') {
    const t = x.trim();
    if (!t) return {};
    try {
      x = JSON.parse(t) as unknown;
    } catch {
      return {};
    }
  }
  if (x === null || typeof x !== 'object') return {};
  return stripNullsAndFixCollections(x);
}

function stripNullsAndFixCollections(v: unknown): unknown {
  if (v === null) return undefined;
  if (Array.isArray(v)) return v.map(stripNullsAndFixCollections);
  if (typeof v !== 'object') return v;
  const o = v as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [k, val] of Object.entries(o)) {
    if (val === null) continue;
    out[k] = stripNullsAndFixCollections(val);
  }
  if (Array.isArray(out.orderLines)) {
    out.orderLines = (out.orderLines as unknown[]).map(ol => {
      if (ol == null || typeof ol !== 'object') {
        return { name: 'Order line', startDate: '', endDate: '', flights: [] };
      }
      const row = { ...(ol as Record<string, unknown>) };
      if (row.flights == null) row.flights = [];
      if (!Array.isArray(row.flights)) row.flights = [];
      return row;
    });
  }
  return out;
}

/** Client-side gate before merge when the model sets ready: true. */
export function validateDescribeDraftForMerge(d: unknown): { ok: true; data: ImportCampaignDraft } | { ok: false; error: string } {
  const cleaned = normalizeDescribeDraftInput(d);
  const r = importCampaignSchema.safeParse(cleaned);
  if (!r.success) {
    return {
      ok: false,
      error: r.error.issues.map(i => `${i.path.join('.') || 'root'}: ${i.message}`).join('; '),
    };
  }
  const data = r.data;
  const name = String(data.name ?? '').trim();
  if (!name) {
    return { ok: false, error: 'Gi kampanjen et navn (eller skriv litt mer i chatten).' };
  }
  return { ok: true, data };
}

export interface RunDescribeTurnOptions {
  apiKey: string;
  /** Prior turns: user/assistant text only (no JSON). */
  history: DescribeChatMessage[];
  /** New user message (plain). */
  userText: string;
  /** Current draft object; sent with the user turn for context. */
  currentDraft: unknown;
  /** Optional answers from dynamic form fields (id -> value). */
  formValues?: Record<string, string>;
  model?: string;
  signal?: AbortSignal;
}

export async function runDescribeTurn(options: RunDescribeTurnOptions): Promise<DescribeTurnResult> {
  const {
    apiKey,
    history,
    userText,
    currentDraft,
    formValues,
    model = DEFAULT_MODEL,
    signal,
  } = options;

  let body = userText.trim();
  if (formValues && Object.keys(formValues).length > 0) {
    body += `\n\nStructured field answers (JSON):\n${JSON.stringify(formValues)}`;
  }
  body += `\n\n---\nCurrent draft JSON (output a complete replacement in "draft"):\n${JSON.stringify(currentDraft ?? {}, null, 0)}`;

  const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
    { role: 'system', content: buildSystemPrompt() },
  ];
  for (const m of history) {
    messages.push({ role: m.role, content: m.content });
  }
  messages.push({ role: 'user', content: body });

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages,
    }),
    signal,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI HTTP ${res.status}: ${errText.slice(0, 500)}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('OpenAI returned empty content');

  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJsonObject(content));
  } catch {
    throw new Error('OpenAI returned non-JSON');
  }

  const result = describeTurnResultSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`Model JSON failed validation: ${result.error.message}`);
  }
  return result.data;
}
