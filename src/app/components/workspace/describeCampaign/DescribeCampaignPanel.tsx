import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, Loader2, MessageSquare, Send, AlertTriangle } from 'lucide-react';
import type { CampaignItem } from '../types';
import { mergeDraftsToCampaignItems } from '../import/mergeImportDrafts';
import {
  runDescribeTurn,
  validateDescribeDraftForMerge,
  normalizeDescribeDraftInput,
  type DescribeChatMessage,
  type DescribeFormField,
} from './describeCampaignTurn';
import { draftHasAnyDateStrictlyBeforeToday } from './draftDateGuards';
import { localTodayYmd } from '../import/dateLocal';
import type { ImportCampaignDraft } from '../import/importDto';

export interface DescribeCampaignPanelProps {
  apiKey: string;
  genId: () => string;
  colorStartIndex: number;
  onSuccess: (campaigns: CampaignItem[]) => void;
  onBack: () => void;
}

export function DescribeCampaignPanel({
  apiKey,
  genId,
  colorStartIndex,
  onSuccess,
  onBack,
}: DescribeCampaignPanelProps) {
  const [messages, setMessages] = useState<DescribeChatMessage[]>([]);
  const [draft, setDraft] = useState<unknown>({});
  const [formFields, setFormFields] = useState<DescribeFormField[]>([]);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  /** Short final step: merge + hand off to parent (modal may close). */
  const [committing, setCommitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  /** Block auto-commit until user confirms when any date is before today. */
  const [pendingPastDraft, setPendingPastDraft] = useState<ImportCampaignDraft | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, formFields]);

  const applyTurn = useCallback((turn: Awaited<ReturnType<typeof runDescribeTurn>>) => {
    setDraft(normalizeDescribeDraftInput(turn.draft));
    setReady(turn.ready);
    setFormFields(turn.form ?? []);
    const nextFv: Record<string, string> = {};
    for (const f of turn.form ?? []) {
      if (f.value != null && f.value !== '') nextFv[f.id] = f.value;
    }
    setFormValues(prev => ({ ...nextFv, ...prev }));
  }, []);

  const send = useCallback(async (userText: string, extraForm?: Record<string, string>) => {
    const trimmed = userText.trim();
    const mergedForm = { ...formValues, ...(extraForm || {}) };
    if (!trimmed && Object.keys(mergedForm).length === 0) return;
    if (!apiKey) {
      setError('Missing VITE_OPENAI_API_KEY in .env.local');
      return;
    }

    setError(null);
    setPendingPastDraft(null);
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    const userLine = trimmed || (Object.keys(mergedForm).length > 0 ? '(Submitted structured fields)' : '');
    if (!userLine) return;
    setMessages(prev => [...prev, { role: 'user', content: userLine }]);
    setLoading(true);

    let handedOffToTimeline = false;
    try {
      const turn = await runDescribeTurn({
        apiKey,
        history: messages,
        userText: trimmed || 'The user submitted only the structured field answers below.',
        currentDraft: draft,
        formValues: Object.keys(mergedForm).length > 0 ? mergedForm : undefined,
        signal: ac.signal,
      });
      setMessages(prev => [...prev, { role: 'assistant', content: turn.assistant_message }]);
      applyTurn(turn);

      const norm = normalizeDescribeDraftInput(turn.draft);
      const v = validateDescribeDraftForMerge(norm);
      if (turn.ready && v.ok) {
        const todayYmd = localTodayYmd();
        if (draftHasAnyDateStrictlyBeforeToday(v.data, todayYmd)) {
          setPendingPastDraft(v.data);
          if (!trimmed) setInput('');
          return;
        }
        setLoading(false);
        setCommitting(true);
        await new Promise<void>(resolve => {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        });
        try {
          const items = mergeDraftsToCampaignItems([v.data], genId, colorStartIndex, { aiDescribeImport: true });
          if (items.length === 0) {
            setError('Merge produced no campaign. Try adding more detail.');
            return;
          }
          onSuccess(items);
          handedOffToTimeline = true;
        } catch (err) {
          setError((err as Error).message || 'Failed to add campaign');
        }
        if (handedOffToTimeline) return;
        return;
      }

      if (!trimmed) setInput('');
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
      setError((e as Error).message || 'Request failed');
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setLoading(false);
      if (!handedOffToTimeline) setCommitting(false);
    }
  }, [apiKey, applyTurn, colorStartIndex, draft, formValues, genId, messages, onSuccess]);

  const handleSendClick = useCallback(() => {
    if (loading || committing) return;
    const t = input;
    setInput('');
    void send(t);
  }, [committing, input, loading, send]);

  const handleApplyForm = useCallback(() => {
    if (loading || committing) return;
    void send('', formValues);
  }, [committing, formValues, loading, send]);

  const handleCreate = useCallback(async () => {
    const v = validateDescribeDraftForMerge(draft);
    if (!v.ok) {
      setError(v.error);
      return;
    }
    const todayYmd = localTodayYmd();
    if (draftHasAnyDateStrictlyBeforeToday(v.data, todayYmd)) {
      setPendingPastDraft(v.data);
      setError(null);
      return;
    }
    setError(null);
    setCommitting(true);
    await new Promise<void>(resolve => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });
    try {
      const items = mergeDraftsToCampaignItems([v.data], genId, colorStartIndex, { aiDescribeImport: true });
      onSuccess(items);
    } catch (e) {
      setError((e as Error).message || 'Could not add campaign');
    } finally {
      setCommitting(false);
    }
  }, [colorStartIndex, draft, genId, onSuccess]);

  const handleConfirmPastDates = useCallback(async () => {
    const data = pendingPastDraft;
    if (!data) return;
    setError(null);
    setCommitting(true);
    await new Promise<void>(resolve => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });
    try {
      const items = mergeDraftsToCampaignItems([data], genId, colorStartIndex, { aiDescribeImport: true });
      if (items.length === 0) {
        setError('Could not build campaign from draft.');
        return;
      }
      setPendingPastDraft(null);
      onSuccess(items);
    } catch (e) {
      setError((e as Error).message || 'Could not add campaign');
    } finally {
      setCommitting(false);
    }
  }, [colorStartIndex, genId, onSuccess, pendingPastDraft]);

  const mergeCheck = useMemo(() => validateDescribeDraftForMerge(draft), [draft]);
  const canCreate = mergeCheck.ok;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, minHeight: 360, position: 'relative' }}>
      <style>{`@keyframes describeSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      {(loading || committing) && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 10,
            borderRadius: 'inherit',
            backgroundColor: 'rgba(0,0,0,0.06)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            padding: 20,
            pointerEvents: 'all',
          }}
        >
          <Loader2 size={28} style={{ animation: 'describeSpin 0.9s linear infinite', color: 'var(--primary)' }} />
          <span style={{ fontFamily: 'var(--font-family-text)', fontSize: 13, fontWeight: 'var(--font-weight-semibold)', color: 'var(--foreground)', textAlign: 'center' }}>
            {committing ? 'Legger til kampanje …' : 'Working…'}
          </span>
        </div>
      )}
      <button
        type="button"
        onClick={onBack}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          alignSelf: 'flex-start',
          gap: 4,
          marginBottom: 10,
          padding: '4px 8px',
          background: 'none',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          cursor: 'pointer',
          fontFamily: 'var(--font-family-text)',
          fontSize: 12,
          fontWeight: 'var(--font-weight-semibold)',
          color: 'var(--foreground)',
        }}
      >
        <ChevronLeft size={14} />
        Back
      </button>

      <h2
        style={{
          fontFamily: 'var(--font-family-display)',
          fontSize: 18,
          fontWeight: 'var(--font-weight-semibold)',
          color: 'var(--foreground)',
          margin: '0 0 4px',
        }}
      >
        Describe your campaign
      </h2>
      <p
        style={{
          fontFamily: 'var(--font-family-text)',
          fontSize: 12,
          fontWeight: 'var(--font-weight-light)',
          color: 'var(--muted-foreground)',
          margin: '0 0 12px',
        }}
      >
        Chat with the assistant; it will suggest missing details but you can save anytime with **Add to plan** once the draft validates (name required). Campaigns without dates appear in the list and editor but **not** on the timeline until you set a period.
      </p>

      <div
        ref={listRef}
        style={{
          flex: 1,
          minHeight: 200,
          maxHeight: 280,
          overflow: 'auto',
          padding: 12,
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border)',
          backgroundColor: 'var(--secondary)',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        {messages.length === 0 && !loading && (
          <div
            style={{
              fontFamily: 'var(--font-family-text)',
              fontSize: 12,
              color: 'var(--muted-foreground)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <MessageSquare size={16} style={{ flexShrink: 0, opacity: 0.6 }} />
            <span>Example: “Q2 TV and digital for Acme, 500k NOK, Oslo and Viken, April–June.”</span>
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '92%',
              padding: '8px 10px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: m.role === 'user' ? 'var(--primary)' : 'var(--card)',
              color: m.role === 'user' ? 'var(--primary-foreground)' : 'var(--foreground)',
              fontFamily: 'var(--font-family-text)',
              fontSize: 12,
              lineHeight: 1.45,
              whiteSpace: 'pre-wrap',
            }}
          >
            {m.content}
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--muted-foreground)' }}>
            <Loader2 size={16} style={{ display: 'inline-block', animation: 'describeSpin 0.9s linear infinite' }} />
            Thinking…
          </div>
        )}
      </div>

      {formFields.length > 0 && (
        <div
          style={{
            marginTop: 10,
            padding: 12,
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <span style={{ fontFamily: 'var(--font-family-text)', fontSize: 11, fontWeight: 'var(--font-weight-semibold)', color: 'var(--muted-foreground)' }}>
            Additional fields
          </span>
          {formFields.map(f => (
            <label key={f.id} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontFamily: 'var(--font-family-text)', fontSize: 11, color: 'var(--foreground)' }}>{f.label}</span>
              {f.type === 'textarea' ? (
                <textarea
                  value={formValues[f.id] ?? f.value ?? ''}
                  onChange={e => setFormValues(prev => ({ ...prev, [f.id]: e.target.value }))}
                  rows={2}
                  style={{
                    fontFamily: 'var(--font-family-text)',
                    fontSize: 12,
                    padding: 8,
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--background)',
                    color: 'var(--foreground)',
                    resize: 'vertical',
                  }}
                />
              ) : f.type === 'select' && f.options?.length ? (
                <select
                  value={formValues[f.id] ?? f.value ?? ''}
                  onChange={e => setFormValues(prev => ({ ...prev, [f.id]: e.target.value }))}
                  style={{
                    fontFamily: 'var(--font-family-text)',
                    fontSize: 12,
                    padding: 8,
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--background)',
                    color: 'var(--foreground)',
                  }}
                >
                  <option value="">—</option>
                  {f.options.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              ) : (
                <input
                  type={f.type === 'date' ? 'date' : 'text'}
                  value={formValues[f.id] ?? f.value ?? ''}
                  onChange={e => setFormValues(prev => ({ ...prev, [f.id]: e.target.value }))}
                  style={{
                    fontFamily: 'var(--font-family-text)',
                    fontSize: 12,
                    padding: 8,
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--background)',
                    color: 'var(--foreground)',
                  }}
                />
              )}
            </label>
          ))}
          <button
            type="button"
            onClick={handleApplyForm}
            disabled={loading || committing}
            style={{
              alignSelf: 'flex-start',
              marginTop: 4,
              padding: '6px 12px',
              fontFamily: 'var(--font-family-text)',
              fontSize: 11,
              fontWeight: 'var(--font-weight-semibold)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--secondary)',
              cursor: loading || committing ? 'default' : 'pointer',
            }}
          >
            Submit fields
          </button>
        </div>
      )}

      {error && (
        <div style={{ marginTop: 8, fontFamily: 'var(--font-family-text)', fontSize: 12, color: 'var(--destructive)' }}>
          {error}
        </div>
      )}

      {pendingPastDraft && (
        <div
          role="alert"
          style={{
            marginTop: 10,
            padding: '12px 14px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid color-mix(in srgb, var(--destructive) 35%, var(--border))',
            backgroundColor: 'color-mix(in srgb, var(--destructive) 8%, var(--card))',
            fontFamily: 'var(--font-family-text)',
            fontSize: 12,
            lineHeight: 1.45,
            color: 'var(--foreground)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 10 }}>
            <AlertTriangle size={18} style={{ flexShrink: 0, color: 'var(--destructive)', marginTop: 1 }} />
            <span>
              <span style={{ fontWeight: 'var(--font-weight-semibold)' }}>Some dates are before today.</span>
              {' '}
              Are these dates correct? If not, keep chatting or adjust structured fields before adding.
            </span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <button
              type="button"
              onClick={() => void handleConfirmPastDates()}
              disabled={loading || committing}
              style={{
                padding: '8px 14px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--primary)',
                backgroundColor: 'var(--primary)',
                color: 'var(--primary-foreground)',
                fontFamily: 'var(--font-family-text)',
                fontSize: 12,
                fontWeight: 'var(--font-weight-semibold)',
                cursor: loading || committing ? 'default' : 'pointer',
              }}
            >
              Yes, add with these dates
            </button>
            <button
              type="button"
              onClick={() => setPendingPastDraft(null)}
              disabled={loading || committing}
              style={{
                padding: '8px 14px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--secondary)',
                color: 'var(--foreground)',
                fontFamily: 'var(--font-family-text)',
                fontSize: 12,
                fontWeight: 'var(--font-weight-semibold)',
                cursor: loading || committing ? 'default' : 'pointer',
              }}
            >
              No, keep editing
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendClick();
            }
          }}
          placeholder="Type a message…"
          disabled={loading || committing}
          style={{
            flex: 1,
            minWidth: 0,
            padding: '10px 12px',
            fontFamily: 'var(--font-family-text)',
            fontSize: 13,
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)',
            backgroundColor: 'var(--background)',
            color: 'var(--foreground)',
          }}
        />
        <button
          type="button"
          onClick={handleSendClick}
          disabled={loading || committing}
          style={{
            flexShrink: 0,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--primary)',
            backgroundColor: 'var(--primary)',
            color: 'var(--primary-foreground)',
            cursor: loading ? 'default' : 'pointer',
            fontFamily: 'var(--font-family-text)',
            fontSize: 12,
            fontWeight: 'var(--font-weight-semibold)',
          }}
        >
          {loading || committing ? <Loader2 size={16} style={{ display: 'inline-block', animation: 'describeSpin 0.9s linear infinite' }} /> : <Send size={16} />}
          Send
        </button>
      </div>

      {ready && !mergeCheck.ok && (
        <div
          style={{
            marginTop: 10,
            padding: '10px 12px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)',
            backgroundColor: 'var(--card)',
            fontFamily: 'var(--font-family-text)',
            fontSize: 12,
            lineHeight: 1.45,
            color: 'var(--foreground)',
          }}
        >
          <span style={{ fontWeight: 'var(--font-weight-semibold)', color: 'var(--muted-foreground)' }}>
            The assistant thinks it is ready, but the draft needs one more pass:{' '}
          </span>
          {mergeCheck.error}
        </div>
      )}

      {mergeCheck.ok && !pendingPastDraft && (
        <button
          type="button"
          onClick={() => void handleCreate()}
          disabled={!canCreate || loading || committing}
          style={{
            marginTop: 12,
            width: '100%',
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--primary)',
            backgroundColor: canCreate ? 'var(--primary)' : 'var(--secondary)',
            color: canCreate ? 'var(--primary-foreground)' : 'var(--foreground)',
            opacity: canCreate ? 1 : 0.9,
            fontFamily: 'var(--font-family-text)',
            fontSize: 13,
            fontWeight: 'var(--font-weight-semibold)',
            cursor: canCreate && !loading ? 'pointer' : 'not-allowed',
          }}
        >
          {canCreate ? 'Add to plan' : 'Need a campaign name'}
        </button>
      )}
    </div>
  );
}
