import { importRootSchema, type ImportRoot } from './importDto';
import type { SheetChunk } from './chunkWorkbook';

const DEFAULT_MODEL = 'gpt-4o-mini';

const SYSTEM = `You convert media agency Excel/CSV-style excerpts into structured campaign data for AdWeb (Norwegian media planning prototype).

Output a single JSON object with this shape:
{ "campaigns": [ ... ] }

Each campaign:
- name (string), advertiser (string), startDate, endDate as YYYY-MM-DD if possible
- status optional: draft | booked | active | completed | paused (default draft)
- budget optional: { total (number), currency NOK|EUR|USD, type gross|net }
- notes optional string
- orderLines: array of { name, startDate, endDate, budgetWeight 0-100 optional, requisitionNumbers optional (array of strings, or one comma-separated string), targeting optional { county, gender, context }, flights: [ { name, channel, startDate, endDate, budgetWeight optional, targetAudience optional } ] }

Dates: copy calendar dates from the sheet literally as YYYY-MM-DD. Do not shift days for time zones or UTC; if the source shows 2025-03-15, output "2025-03-15" exactly.

Targeting (when present on the sheet; otherwise omit targeting and the app will default to all regions / all genders / all contexts):
- county: Norwegian fylke name OR the literal string "All" for all regions
- gender: all | male | female | other ("all" = no gender restriction)
- context: all | sport | news | entertainment | reality | living | family ("all" = any editorial context)

Channels must be one of: tv, digital, radio, outdoor (map synonyms: TV/linear->tv, online/display/programmatic/social->digital, radio->radio, OOH/outdoor->outdoor).

Norwegian counties (fylker) use 2024 exact names when possible: Agder, Akershus, Buskerud, Finnmark, Innlandet, Møre og Romsdal, Nordland, Oslo, Rogaland, Telemark, Troms, Trøndelag, Vestfold, Vestland, Østfold. You may still output legacy merged names (Viken, Vestfold og Telemark, Troms og Finnmark) — the app will expand them.

If the sheet lists multiple clients or campaigns, emit multiple campaigns. If information is missing, omit optional fields; never invent real client PII beyond what appears in the sheet text.

If you cannot extract any campaigns, return { "campaigns": [] }.`;

function extractJsonObject(raw: string): string {
  const t = raw.trim();
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start >= 0 && end > start) return t.slice(start, end + 1);
  return t;
}

async function mapOneChunk(
  apiKey: string,
  userContent: string,
  model: string,
  signal?: AbortSignal,
): Promise<ImportRoot> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: userContent },
      ],
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

  const result = importRootSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`Model JSON failed validation: ${result.error.message}`);
  }
  return result.data;
}

/** Run one completion per sheet chunk and merge campaigns. */
export async function mapSpreadsheetChunksToImportRoot(
  apiKey: string,
  chunks: SheetChunk[],
  options?: { model?: string; signal?: AbortSignal; onProgress?: (label: string, index: number, total: number) => void },
): Promise<ImportRoot> {
  const model = options?.model ?? DEFAULT_MODEL;
  const merged: ImportRoot = { campaigns: [] };

  let i = 0;
  for (const ch of chunks) {
    options?.onProgress?.(ch.sheetName, i, chunks.length);
    const user = `Spreadsheet excerpt (tab-separated cells, one row per line):\n\n${ch.text}`;
    const part = await mapOneChunk(apiKey, user, model, options?.signal);
    merged.campaigns.push(...part.campaigns);
    i += 1;
  }
  options?.onProgress?.('done', chunks.length, chunks.length);
  return merged;
}
