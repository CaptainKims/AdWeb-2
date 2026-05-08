/**
 * exportToSheets.ts
 * Generates a multi-sheet .xlsx file (Google Sheets–compatible) that mirrors
 * the AdWeb database schema with sample data and a Legend tab.
 */
import * as XLSX from 'xlsx';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Build a worksheet from a 2-D array of values. Row 0 = headers. */
function makeSheet(rows: (string | number | null)[][]): XLSX.WorkSheet {
  return XLSX.utils.aoa_to_sheet(rows);
}

/** Set column widths (chars) on a sheet. */
function setCols(ws: XLSX.WorkSheet, widths: number[]) {
  ws['!cols'] = widths.map(w => ({ wch: w }));
}

// ─── Sheet data ───────────────────────────────────────────────────────────────

function buildCampaigns(): XLSX.WorkSheet {
  const rows: (string | number | null)[][] = [
    // Headers
    ['campaign_id', 'name', 'advertiser', 'start_date', 'end_date', 'status', 'color', 'budget_id', 'notes'],
    // Sample rows
    ['c_001', 'Summer Car Launch',       'Bilmerke AS',     '2025-06-01', '2025-08-31', 'active',    '#827CC8', 'b_001', 'Brand awareness push Q2/Q3'],
    ['c_002', 'Back to School',          'Læringshuset AS', '2025-07-15', '2025-09-15', 'draft',     '#5BAACC', 'b_002', 'Targeting parents 30–45'],
    ['c_003', 'Winter Holiday Retail',   'Storekjeden AS',  '2025-11-01', '2025-12-31', 'draft',     '#78BEA0', 'b_003', 'Cross-channel Christmas push'],
  ];
  const ws = makeSheet(rows);
  setCols(ws, [12, 24, 20, 12, 12, 12, 10, 10, 36]);
  return ws;
}

function buildBudgets(): XLSX.WorkSheet {
  const rows: (string | number | null)[][] = [
    ['budget_id', 'campaign_id', 'total', 'currency', 'type'],
    ['b_001', 'c_001', 2500000, 'NOK', 'gross'],
    ['b_002', 'c_002',  850000, 'NOK', 'gross'],
    ['b_003', 'c_003', 4200000, 'NOK', 'net'],
  ];
  const ws = makeSheet(rows);
  setCols(ws, [10, 12, 12, 10, 8]);
  return ws;
}

function buildOrderLines(): XLSX.WorkSheet {
  const rows: (string | number | null)[][] = [
    ['orderline_id', 'campaign_id', 'name', 'start_date', 'end_date', 'status', 'color', 'budget_weight', 'targeting_id', 'notes'],
    // c_001
    ['ol_001', 'c_001', 'TV Primetime',      '2025-06-01', '2025-08-31', 'active', '#5BAACC', 60, 't_001', 'Main TV burst'],
    ['ol_002', 'c_001', 'Digital Display',   '2025-06-15', '2025-07-31', 'active', '#78BEA0', 25, null,    'Retargeting support'],
    ['ol_003', 'c_001', 'Radio Sponsorship', '2025-07-01', '2025-08-15', 'active', '#E8A030', 15, null,    'Drive + commute slots'],
    // c_002
    ['ol_004', 'c_002', 'Digital Video',     '2025-07-15', '2025-09-15', 'draft',  '#827CC8', 70, 't_002', 'YouTube & social pre-roll'],
    ['ol_005', 'c_002', 'Outdoor',           '2025-08-01', '2025-09-01', 'draft',  '#B48CD2', 30, null,    'School-zone posters'],
    // c_003
    ['ol_006', 'c_003', 'TV Drive',          '2025-11-01', '2025-12-31', 'draft',  '#5BAACC', 55, 't_003', 'Peak primetime'],
    ['ol_007', 'c_003', 'Digital Search',    '2025-11-15', '2025-12-31', 'draft',  '#78BEA0', 30, null,    'Brand + product terms'],
    ['ol_008', 'c_003', 'Radio',             '2025-12-01', '2025-12-24', 'draft',  '#E8A030', 15, null,    'Christmas gift messaging'],
  ];
  const ws = makeSheet(rows);
  setCols(ws, [12, 12, 22, 12, 12, 10, 10, 14, 12, 32]);
  return ws;
}

function buildFlights(): XLSX.WorkSheet {
  const rows: (string | number | null)[][] = [
    ['flight_id', 'orderline_id', 'campaign_id', 'name', 'channel', 'start_date', 'end_date', 'budget_weight', 'target_audience', 'creative_id'],
    // ol_001 (TV Primetime, c_001)
    ['fl_001', 'ol_001', 'c_001', 'Week 1–3 Launch Burst',  'tv', '2025-06-01', '2025-06-21', 40, 'Adults 25–54',       'cr_001'],
    ['fl_002', 'ol_001', 'c_001', 'Week 4–8 Steady State',  'tv', '2025-06-22', '2025-07-31', 35, 'Adults 25–54',       'cr_001'],
    ['fl_003', 'ol_001', 'c_001', 'August Reminder',        'tv', '2025-08-01', '2025-08-31', 25, 'Adults 35–54',       'cr_002'],
    // ol_002 (Digital Display, c_001)
    ['fl_004', 'ol_002', 'c_001', 'Prospecting Phase',      'digital', '2025-06-15', '2025-07-15', 50, 'Adults 25–44',  'cr_003'],
    ['fl_005', 'ol_002', 'c_001', 'Retargeting Phase',      'digital', '2025-07-16', '2025-07-31', 50, 'Site visitors', 'cr_004'],
    // ol_003 (Radio, c_001)
    ['fl_006', 'ol_003', 'c_001', 'Drive Time Spots',       'radio', '2025-07-01', '2025-08-15', 100, 'Commuters 25–54', 'cr_005'],
    // ol_004 (Digital Video, c_002)
    ['fl_007', 'ol_004', 'c_002', 'Pre-roll Awareness',     'digital', '2025-07-15', '2025-08-15', 60, 'Parents 30–45', 'cr_006'],
    ['fl_008', 'ol_004', 'c_002', 'Social Conversion',      'digital', '2025-08-16', '2025-09-15', 40, 'Parents 30–45', 'cr_007'],
    // ol_005 (Outdoor, c_002)
    ['fl_009', 'ol_005', 'c_002', 'School Zone Posters',    'outdoor', '2025-08-01', '2025-09-01', 100, 'Local families', null],
    // ol_006 (TV, c_003)
    ['fl_010', 'ol_006', 'c_003', 'Nov Awareness',          'tv', '2025-11-01', '2025-11-30', 45, 'Shoppers 25–54',     'cr_008'],
    ['fl_011', 'ol_006', 'c_003', 'Dec Peak',               'tv', '2025-12-01', '2025-12-31', 55, 'Shoppers 25–54',     'cr_009'],
    // ol_007 (Digital Search, c_003)
    ['fl_012', 'ol_007', 'c_003', 'Brand Terms',            'digital', '2025-11-15', '2025-12-31', 50, 'Broad audience', null],
    ['fl_013', 'ol_007', 'c_003', 'Product Terms',          'digital', '2025-11-15', '2025-12-31', 50, 'In-market',      null],
    // ol_008 (Radio, c_003)
    ['fl_014', 'ol_008', 'c_003', 'Christmas Spots',        'radio', '2025-12-01', '2025-12-24', 100, 'All adults',     'cr_010'],
  ];
  const ws = makeSheet(rows);
  setCols(ws, [10, 12, 12, 24, 10, 12, 12, 14, 20, 12]);
  return ws;
}

function buildTargeting(): XLSX.WorkSheet {
  const rows: (string | number | null)[][] = [
    ['targeting_id', 'county', 'gender', 'context'],
    ['t_001', 'Oslo',      'other',    'news'],
    ['t_002', 'Viken',     'female',   'family'],
    ['t_003', 'Vestland',  'male',     'entertainment'],
    ['t_004', 'Rogaland',  'other',    'sport'],
  ];
  const ws = makeSheet(rows);
  setCols(ws, [14, 18, 10, 14]);
  return ws;
}

function buildCreatives(): XLSX.WorkSheet {
  const rows: (string | number | null)[][] = [
    ['creative_id', 'name', 'format', 'duration_sec', 'status', 'nielsen_code'],
    ['cr_001', 'Sommerfilm 30s – Bil',         '30s',     30, 'active',   'NL-2025-4421'],
    ['cr_002', 'Sommerfilm 15s – Bil',         '15s',     15, 'active',   'NL-2025-4422'],
    ['cr_003', 'Banner 970×250 – Bil',         'display',  0, 'active',   ''],
    ['cr_004', 'Banner 300×600 Retarget',      'display',  0, 'active',   ''],
    ['cr_005', 'Radio 30s – Bil',              '30s',     30, 'active',   ''],
    ['cr_006', 'Skolefilm 30s – Pre-roll',     '30s',     30, 'draft',    ''],
    ['cr_007', 'Skolefilm 15s – Social',       '15s',     15, 'draft',    ''],
    ['cr_008', 'Julefilm 30s – Awareness',     '30s',     30, 'draft',    ''],
    ['cr_009', 'Julefilm 60s – Prime',         '60s',     60, 'draft',    ''],
    ['cr_010', 'Juleradio 30s',                '30s',     30, 'draft',    ''],
  ];
  const ws = makeSheet(rows);
  setCols(ws, [12, 30, 10, 14, 10, 16]);
  return ws;
}

function buildWeightCurvePoints(): XLSX.WorkSheet {
  const rows: (string | number | null)[][] = [
    ['point_id', 'flight_id', 't', 'v', 'note'],
    // fl_001 – flat (constant full weight)
    ['wcp_001', 'fl_001', 0.00, 1.00, 'Flat curve'],
    ['wcp_002', 'fl_001', 1.00, 1.00, ''],
    // fl_002 – slight ramp down
    ['wcp_003', 'fl_002', 0.00, 1.00, 'Ramp down'],
    ['wcp_004', 'fl_002', 0.50, 0.80, ''],
    ['wcp_005', 'fl_002', 1.00, 0.50, ''],
    // fl_003 – bell curve (ramp up then down)
    ['wcp_006', 'fl_003', 0.00, 0.40, 'Bell curve'],
    ['wcp_007', 'fl_003', 0.25, 0.75, ''],
    ['wcp_008', 'fl_003', 0.50, 1.00, ''],
    ['wcp_009', 'fl_003', 0.75, 0.75, ''],
    ['wcp_010', 'fl_003', 1.00, 0.30, ''],
    // fl_004 – flat
    ['wcp_011', 'fl_004', 0.00, 1.00, 'Flat curve'],
    ['wcp_012', 'fl_004', 1.00, 1.00, ''],
    // fl_007 – ramp up (awareness building)
    ['wcp_013', 'fl_007', 0.00, 0.20, 'Ramp up'],
    ['wcp_014', 'fl_007', 0.50, 0.60, ''],
    ['wcp_015', 'fl_007', 1.00, 1.00, ''],
    // fl_010 – flat
    ['wcp_016', 'fl_010', 0.00, 1.00, 'Flat curve'],
    ['wcp_017', 'fl_010', 1.00, 1.00, ''],
    // fl_011 – peak in middle (Christmas peak)
    ['wcp_018', 'fl_011', 0.00, 0.60, 'Peak mid-Dec'],
    ['wcp_019', 'fl_011', 0.40, 1.00, ''],
    ['wcp_020', 'fl_011', 0.70, 1.00, ''],
    ['wcp_021', 'fl_011', 1.00, 0.70, ''],
    // All others default (flat) – add as needed
  ];
  const ws = makeSheet(rows);
  setCols(ws, [12, 12, 8, 8, 24]);
  return ws;
}

function buildStickyNotes(): XLSX.WorkSheet {
  const rows: (string | number | null)[][] = [
    ['note_id', 'text', 'color', 'pos_x', 'pos_y', 'z_index'],
    ['sn_001', 'Check Nielsen codes before go-live!',    '#FFF9C4', 82, 64, 3],
    ['sn_002', 'OL budget weights need rebalancing',     '#FCDDE2', 45, 30, 4],
    ['sn_003', 'Confirm radio slots w/ media agency',    '#C8E6FA', 20, 70, 2],
  ];
  const ws = makeSheet(rows);
  setCols(ws, [10, 44, 10, 8, 8, 8]);
  return ws;
}

function buildLegend(): XLSX.WorkSheet {
  const rows: (string | number | null)[][] = [
    ['AdWeb – Database Schema Legend', '', '', ''],
    ['', '', '', ''],
    ['TAB', 'PURPOSE', 'PRIMARY KEY', 'FOREIGN KEYS'],

    // Campaigns
    ['Campaigns',           'Top-level planning unit. One row per campaign.',
     'campaign_id',         '→ Budgets.budget_id'],
    ['Budgets',             'Budget details for each campaign (1:1 with Campaigns).',
     'budget_id',           '→ Campaigns.campaign_id'],
    ['OrderLines',          'Buying units within a campaign (e.g. TV Primetime, Digital Display).',
     'orderline_id',        '→ Campaigns.campaign_id, Targeting.targeting_id (nullable)'],
    ['Flights',             'Individual flight periods within an order line.',
     'flight_id',           '→ OrderLines.orderline_id, Campaigns.campaign_id, Creatives.creative_id'],
    ['Targeting',           'Order-line targeting: Norwegian county (fylke), gender, editorial context.',
     'targeting_id',        '(referenced by OrderLines only)'],
    ['Creatives',           'Creative assets attached to a flight.',
     'creative_id',         '(referenced by Flights)'],
    ['WeightCurvePoints',   "Keyframes for a flight's frequency/weight curve. Sort by flight_id then t ASC.",
     'point_id',            '→ Flights.flight_id'],
    ['StickyNotes',         'Freeform canvas annotations. Not linked to hierarchy.',
     'note_id',             '—'],

    ['', '', '', ''],
    ['FIELD ALLOWED VALUES', '', '', ''],
    ['status (Campaigns / OrderLines)',  'draft · active · paused · completed',   '', ''],
    ['channel (Flights)',                'tv · digital · radio · outdoor',         '', ''],
    ['currency (Budgets)',               'NOK · EUR · USD',                        '', ''],
    ['type (Budgets)',                   'gross · net',                            '', ''],
    ['format (Creatives)',               '15s · 30s · 60s · display · video',      '', ''],
    ['status (Creatives)',               'draft · active · archived',              '', ''],
    ['county (Targeting)',               'All (all regions) or Norwegian fylke: Agder · Innlandet · Møre og Romsdal · Nordland · Oslo · Rogaland · Troms og Finnmark · Trøndelag · Vestfold og Telemark · Vestland · Viken', '', ''],
    ['gender (Targeting)',               'all · male · female · other',                  '', ''],
    ['context (Targeting)',              'all · sport · news · entertainment · reality · living · family', '', ''],

    ['', '', '', ''],
    ['BUDGET VALIDATION RULES', '', '', ''],
    ['OrderLines.budget_weight',    'All rows with the same campaign_id must SUM to 100', '', ''],
    ['Flights.budget_weight',       'All rows with the same orderline_id must SUM to 100', '', ''],
    ['WeightCurvePoints.t',         'Values between 0.00 and 1.00, ordered ascending per flight', '', ''],
    ['WeightCurvePoints.v',         'Values between 0.00 and 1.00', '', ''],
  ];
  const ws = makeSheet(rows);
  setCols(ws, [28, 66, 18, 58]);
  return ws;
}

// ─── Main export function ─────────────────────────────────────────────────────

export function downloadSheetsTemplate(): void {
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(wb, buildLegend(),            '0_Legend');
  XLSX.utils.book_append_sheet(wb, buildCampaigns(),         '1_Campaigns');
  XLSX.utils.book_append_sheet(wb, buildBudgets(),           '2_Budgets');
  XLSX.utils.book_append_sheet(wb, buildOrderLines(),        '3_OrderLines');
  XLSX.utils.book_append_sheet(wb, buildFlights(),           '4_Flights');
  XLSX.utils.book_append_sheet(wb, buildTargeting(),         '5_Targeting');
  XLSX.utils.book_append_sheet(wb, buildCreatives(),         '6_Creatives');
  XLSX.utils.book_append_sheet(wb, buildWeightCurvePoints(), '7_WeightCurvePoints');
  XLSX.utils.book_append_sheet(wb, buildStickyNotes(),       '8_StickyNotes');

  XLSX.writeFile(wb, 'AdWeb_Database_Template.xlsx');
}
