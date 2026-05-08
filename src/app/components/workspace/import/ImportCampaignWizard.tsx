import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, AlertTriangle, CheckCircle2, ChevronRight } from 'lucide-react';
import type { CampaignItem } from '../types';
import { targetingContextLabel, targetingGenderLabel, targetingRegionsLabel } from '../types';
import { parseWorkbookFile, type ParsedWorkbook } from './parseWorkbook';
import { buildSheetChunks } from './chunkWorkbook';
import { mapSpreadsheetChunksToImportRoot } from './openaiMapToImportDto';
import { mergeDraftsToCampaignItems } from './mergeImportDrafts';
import {
  validateImportedCampaigns,
  applyPrototypeTargetingDefaults,
  type ImportIssue,
} from './validateImport';

const WIZARD_Z = 195_000;

type Step = 'scope' | 'ai' | 'review' | 'confirm';

export interface ImportCampaignWizardProps {
  file: File;
  open: boolean;
  onClose: () => void;
  /** Appended in order after successful import */
  onImported: (campaigns: CampaignItem[]) => void;
  genId: () => string;
  /** Starting index into CAMPAIGN_COLORS for first imported campaign */
  colorStartIndex: number;
}

export function ImportCampaignWizard({
  file,
  open,
  onClose,
  onImported,
  genId,
  colorStartIndex,
}: ImportCampaignWizardProps) {
  const [step, setStep] = useState<Step>('scope');
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedWorkbook | null>(null);
  const [selectedSheets, setSelectedSheets] = useState<Set<string>>(new Set());
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiProgress, setAiProgress] = useState('');
  const [loadingParse, setLoadingParse] = useState(false);
  const [loadingAi, setLoadingAi] = useState(false);
  const [merged, setMerged] = useState<CampaignItem[] | null>(null);
  const [issues, setIssues] = useState<ImportIssue[]>([]);

  const apiKey = import.meta.env.VITE_OPENAI_API_KEY ?? '';

  const reset = useCallback(() => {
    setStep('scope');
    setParseError(null);
    setParsed(null);
    setSelectedSheets(new Set());
    setAiError(null);
    setAiProgress('');
    setLoadingParse(false);
    setLoadingAi(false);
    setMerged(null);
    setIssues([]);
  }, []);

  useEffect(() => {
    if (!open) {
      reset();
      return;
    }
    let cancelled = false;
    setLoadingParse(true);
    setParseError(null);
    void parseWorkbookFile(file)
      .then(wb => {
        if (cancelled) return;
        setParsed(wb);
        setSelectedSheets(new Set(wb.sheets.map(s => s.name)));
        setStep('scope');
      })
      .catch(e => {
        if (cancelled) return;
        setParseError(e instanceof Error ? e.message : 'Failed to read spreadsheet');
      })
      .finally(() => {
        if (!cancelled) setLoadingParse(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, file, reset]);

  const toggleSheet = (name: string) => {
    setSelectedSheets(prev => {
      const n = new Set(prev);
      if (n.has(name)) n.delete(name);
      else n.add(name);
      return n;
    });
  };

  const runAi = useCallback(async () => {
    if (!parsed) return;
    if (!apiKey) {
      setAiError('Missing VITE_OPENAI_API_KEY in .env.local');
      setStep('ai');
      return;
    }
    setAiError(null);
    setLoadingAi(true);
    setStep('ai');
    setAiProgress('Preparing…');
    try {
      const chunks = buildSheetChunks(parsed.sheets, selectedSheets);
      if (chunks.length === 0) {
        throw new Error('No sheets selected or all sheets are empty.');
      }
      const root = await mapSpreadsheetChunksToImportRoot(apiKey, chunks, {
        onProgress: (label, i, tot) => {
          setAiProgress(tot ? `Sheet ${i + 1}/${tot}: ${label}` : label);
        },
      });
      if (root.campaigns.length === 0) {
        throw new Error('The model returned no campaigns. Try different sheet selection or edit the file.');
      }
      const items = mergeDraftsToCampaignItems(root.campaigns, genId, colorStartIndex);
      const { issues: iss, patched } = validateImportedCampaigns(items);
      setMerged(patched);
      setIssues(iss);
      setStep('review');
    } catch (e) {
      setAiError(e instanceof Error ? e.message : 'Import failed');
      setStep('ai');
    } finally {
      setLoadingAi(false);
      setAiProgress('');
    }
  }, [parsed, selectedSheets, apiKey, genId, colorStartIndex]);

  const applyTargetingDefaults = () => {
    if (!merged) return;
    const next = merged.map(c => applyPrototypeTargetingDefaults(c, genId));
    const { issues: iss, patched } = validateImportedCampaigns(next);
    setMerged(patched);
    setIssues(iss);
  };

  const blockingIssues = useMemo(() => issues.filter(i => i.severity === 'blocking'), [issues]);
  const canImport = merged && merged.length > 0 && blockingIssues.length === 0;

  const handleConfirmImport = () => {
    if (!merged?.length) return;
    onImported(merged);
    onClose();
  };

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Import campaigns from spreadsheet"
      onMouseDown={e => e.target === e.currentTarget && !loadingAi && onClose()}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: WIZARD_Z,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        onMouseDown={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 560,
          maxHeight: '92vh',
          overflow: 'auto',
          backgroundColor: 'var(--card)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
          padding: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-family-display)', fontSize: 17, fontWeight: 'var(--font-weight-semibold)', color: 'var(--foreground)' }}>
              Import from spreadsheet
            </div>
            <div style={{ fontFamily: 'var(--font-family-text)', fontSize: 12, color: 'var(--muted-foreground)', marginTop: 4, wordBreak: 'break-all' }}>
              {file.name}
            </div>
          </div>
          <button
            type="button"
            disabled={loadingAi}
            onClick={onClose}
            style={{
              border: 'none',
              background: 'var(--secondary)',
              borderRadius: 'var(--radius-md)',
              padding: 6,
              cursor: loadingAi ? 'not-allowed' : 'pointer',
              color: 'var(--foreground)',
            }}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

            {loadingParse && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '20px 0', color: 'var(--muted-foreground)', fontSize: 13 }}>
            <Loader2 size={18} style={{ animation: 'spin 0.9s linear infinite' }} />
            Reading workbook…
          </div>
        )}

        {parseError && (
          <div style={{ padding: 12, backgroundColor: 'var(--destructive)', opacity: 0.12, borderRadius: 'var(--radius-md)', color: 'var(--destructive)', fontSize: 13, marginBottom: 12 }}>
            {parseError}
          </div>
        )}

        {parsed && !loadingParse && step === 'scope' && (
          <>
            <p style={{ fontSize: 13, color: 'var(--muted-foreground)', marginBottom: 12 }}>
              Choose which sheets to send to the model (one request per sheet).
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16, maxHeight: 220, overflowY: 'auto' }}>
              {parsed.sheets.map(sh => (
                <label
                  key={sh.name}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    cursor: 'pointer',
                    fontSize: 13,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedSheets.has(sh.name)}
                    onChange={() => toggleSheet(sh.name)}
                  />
                  <span style={{ fontWeight: 'var(--font-weight-semibold)' }}>{sh.name}</span>
                  <span style={{ color: 'var(--muted-foreground)', fontSize: 11 }}>{sh.rowCount}×{sh.colCount}</span>
                </label>
              ))}
            </div>
            <button
              type="button"
              onClick={() => void runAi()}
              disabled={selectedSheets.size === 0 || loadingAi}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                border: 'none',
                backgroundColor: 'var(--primary)',
                color: 'var(--primary-foreground)',
                fontWeight: 'var(--font-weight-semibold)',
                cursor: selectedSheets.size === 0 ? 'not-allowed' : 'pointer',
                fontSize: 13,
              }}
            >
              Run AI import
            </button>
          </>
        )}

        {step === 'ai' && (
          <div style={{ padding: '24px 0', textAlign: 'center' }}>
            {loadingAi && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                <Loader2 size={28} style={{ color: 'var(--primary)', animation: 'spin 0.9s linear infinite' }} />
                <div style={{ fontSize: 13, color: 'var(--foreground)' }}>{aiProgress || 'Calling OpenAI…'}</div>
              </div>
            )}
            {aiError && !loadingAi && (
              <div style={{ color: 'var(--destructive)', fontSize: 13, marginBottom: 12 }}>{aiError}</div>
            )}
            {!loadingAi && (
              <button type="button" onClick={() => setStep('scope')} style={{ marginTop: 8, fontSize: 12, textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)' }}>
                Back to sheet selection
              </button>
            )}
          </div>
        )}

        {step === 'review' && merged && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 'var(--font-weight-semibold)' }}>Preview & issues</span>
              <button
                type="button"
                onClick={applyTargetingDefaults}
                style={{
                  fontSize: 11,
                  padding: '6px 10px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                  background: 'var(--secondary)',
                  cursor: 'pointer',
                }}
              >
                Apply default targeting (All / All / All) to missing order lines
              </button>
            </div>

            {issues.length > 0 && (
              <div style={{ marginBottom: 12, maxHeight: 140, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 8 }}>
                {issues.map((it, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: 6, alignItems: 'flex-start', fontSize: 11, marginBottom: 6, color: 'var(--foreground)' }}>
                    {it.severity === 'blocking' ? <AlertTriangle size={14} style={{ color: 'var(--destructive)', flexShrink: 0 }} /> : <AlertTriangle size={14} style={{ color: '#ca8a04', flexShrink: 0 }} />}
                    <span>
                      <strong>C{it.campaignIndex + 1}</strong>
                      {it.orderLineIndex != null && ` · OL${it.orderLineIndex + 1}`}
                      {it.flightIndex != null && ` · F${it.flightIndex + 1}`}: {it.message}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ maxHeight: 220, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 10, marginBottom: 14 }}>
              {merged.map((camp, ci) => (
                <div key={camp.id} style={{ marginBottom: 12, fontSize: 12 }}>
                  <div style={{ fontWeight: 'var(--font-weight-semibold)', color: 'var(--foreground)' }}>{camp.name}</div>
                  <div style={{ color: 'var(--muted-foreground)', fontSize: 11 }}>{camp.advertiser} · {camp.startDate} – {camp.endDate}</div>
                  {camp.orderLines.map((ol, oi) => {
                    const missTgt = !ol.targeting;
                    return (
                      <div key={ol.id} style={{ marginLeft: 10, marginTop: 6, borderLeft: '2px solid var(--border)', paddingLeft: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <span>{ol.name}</span>
                          {missTgt ? (
                            <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 99, background: '#fef3c7', color: '#92400e', fontWeight: 'var(--font-weight-semibold)' }}>Targeting missing</span>
                          ) : (
                            <span style={{ fontSize: 10, color: 'var(--muted-foreground)' }}>
                              {targetingRegionsLabel(ol.targeting!.counties ?? [])} · {targetingGenderLabel(ol.targeting!.gender)} · {targetingContextLabel(ol.targeting!.context)}
                            </span>
                          )}
                        </div>
                        {ol.flights.map(fl => (
                          <div key={fl.id} style={{ marginLeft: 8, fontSize: 11, color: 'var(--muted-foreground)' }}>— {fl.name} ({fl.channel})</div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={() => setStep('scope')} style={{ flex: 1, padding: 9, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--secondary)', cursor: 'pointer', fontSize: 13 }}>
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep('confirm')}
                disabled={!canImport}
                style={{
                  flex: 1,
                  padding: 9,
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  background: canImport ? 'var(--primary)' : 'var(--muted-foreground)',
                  color: 'var(--primary-foreground)',
                  cursor: canImport ? 'pointer' : 'not-allowed',
                  fontSize: 13,
                  fontWeight: 'var(--font-weight-semibold)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                Continue <ChevronRight size={16} />
              </button>
            </div>
          </>
        )}

        {step === 'confirm' && merged && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, color: 'var(--foreground)', fontSize: 14 }}>
              <CheckCircle2 size={20} style={{ color: 'var(--status-success)' }} />
              Ready to add {merged.length} campaign{merged.length !== 1 ? 's' : ''} to the planner
            </div>
            <p style={{ fontSize: 12, color: 'var(--muted-foreground)', marginBottom: 16 }}>
              You can still edit campaigns, order lines, and targeting in the timeline and detail panel after import.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={() => setStep('review')} style={{ flex: 1, padding: 9, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--secondary)', cursor: 'pointer' }}>
                Back
              </button>
              <button
                type="button"
                onClick={handleConfirmImport}
                style={{
                  flex: 1,
                  padding: 9,
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  background: 'var(--primary)',
                  color: 'var(--primary-foreground)',
                  fontWeight: 'var(--font-weight-semibold)',
                  cursor: 'pointer',
                }}
              >
                Import
              </button>
            </div>
          </>
        )}

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>,
    document.body,
  );
}
