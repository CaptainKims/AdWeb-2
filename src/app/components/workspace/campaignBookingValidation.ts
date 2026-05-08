import type { CampaignItem } from './types';

export interface BookingIssue {
  id: string;
  messageNb: string;
}

const YMD = /^\d{4}-\d{2}-\d{2}$/;

function parseYmdMs(s: string): number | null {
  if (!YMD.test(s)) return null;
  const t = new Date(s + 'T12:00:00').getTime();
  return Number.isNaN(t) ? null : t;
}

/**
 * Requirements for setting a campaign to `booked`.
 * Used by the formal booking flow and status-dropdown guard.
 */
export function validateCampaignForBooking(c: CampaignItem): { ok: boolean; issues: BookingIssue[] } {
  const issues: BookingIssue[] = [];

  if (!c.name.trim()) issues.push({ id: 'campaign-name', messageNb: 'Kampanjenavn må fylles ut.' });
  if (!c.advertiser.trim()) issues.push({ id: 'advertiser', messageNb: 'Annonsør må fylles ut.' });

  const cs = parseYmdMs(c.startDate);
  const ce = parseYmdMs(c.endDate);
  if (cs === null || ce === null) {
    issues.push({ id: 'campaign-dates', messageNb: 'Gyldig kampanjeperiode (start og slutt) kreves.' });
  } else if (cs > ce) {
    issues.push({ id: 'campaign-dates-order', messageNb: 'Kampanje slutt må være på eller etter start.' });
  }

  if (c.budget.total <= 0) issues.push({ id: 'budget', messageNb: 'Budsjett må være større enn null.' });

  if (c.orderLines.length === 0) {
    issues.push({ id: 'order-lines', messageNb: 'Minst én ordrelinje kreves.' });
  }

  const sumW = Math.round(c.orderLines.reduce((s, ol) => s + ol.budgetWeight, 0));
  if (c.orderLines.length > 0 && sumW !== 100) {
    issues.push({
      id: 'weights',
      messageNb: `Ordrelinjer må summere til 100 % av budsjett (nå ${sumW} %).`,
    });
  }

  c.orderLines.forEach((ol, i) => {
    const olTitle = ol.name.trim() || `Ordrelinje ${i + 1}`;
    if (!ol.name.trim()) issues.push({ id: `ol-name-${ol.id}`, messageNb: `Ordrelinje ${i + 1}: navn mangler.` });

    const os = parseYmdMs(ol.startDate);
    const oe = parseYmdMs(ol.endDate);
    if (os === null || oe === null) {
      issues.push({ id: `ol-dates-${ol.id}`, messageNb: `${olTitle}: gyldig periode kreves.` });
    } else if (os > oe) {
      issues.push({ id: `ol-dates-order-${ol.id}`, messageNb: `${olTitle}: slutt må være på eller etter start.` });
    } else if (cs !== null && ce !== null && (os < cs || oe > ce)) {
      issues.push({
        id: `ol-in-campaign-${ol.id}`,
        messageNb: `${olTitle}: perioden må ligge innenfor kampanjens datoer.`,
      });
    }

    if (!ol.targeting) {
      issues.push({
        id: `ol-targeting-${ol.id}`,
        messageNb: `${olTitle}: målretting må settes (eller bekreftes).`,
      });
    }

    if (ol.flights.length === 0) {
      issues.push({ id: `ol-flights-${ol.id}`, messageNb: `${olTitle}: minst én Flight kreves.` });
    }

    ol.flights.forEach((fl, fi) => {
      const flTitle = fl.name.trim() || `Flight ${fi + 1}`;
      if (!fl.name.trim()) {
        issues.push({
          id: `fl-name-${fl.id}`,
          messageNb: `${olTitle} → Flight ${fi + 1}: navn mangler.`,
        });
      }

      const fs = parseYmdMs(fl.startDate);
      const fe = parseYmdMs(fl.endDate);
      if (fs === null || fe === null) {
        issues.push({ id: `fl-dates-${fl.id}`, messageNb: `${flTitle}: gyldig periode kreves.` });
      } else if (fs > fe) {
        issues.push({
          id: `fl-dates-order-${fl.id}`,
          messageNb: `${flTitle}: slutt må være på eller etter start.`,
        });
      } else if (os !== null && oe !== null && (fs < os || fe > oe)) {
        issues.push({
          id: `fl-in-ol-${fl.id}`,
          messageNb: `${flTitle}: perioden må ligge innenfor ordrelinjens datoer.`,
        });
      }
    });
  });

  return { ok: issues.length === 0, issues };
}
