/**
 * Prototype inventory policy (non–rate-card; illustrative only).
 *
 * - **Weekly pool:** Shared cap on implied views per calendar week (Monday–Sunday, local).
 * - **List pricing:** 1 NOK ⇒ 1 view before discount (`LIST_NOK_PER_VIEW = 1`).
 * - **Campaign discount:** Reduces effective price per view; higher discount ⇒ more implied views
 *   per krone ⇒ higher load on shared inventory.
 * - **Sharing:** Each campaign spreads implied total views evenly over its running days; for each
 *   week, contributions from overlapping campaigns are summed; if the sum exceeds the weekly pool,
 *   a **uniform scale** is applied to every campaign’s *user-intent* budget so the tightest week fits.
 *
 * Do not expose raw pool numbers as product truth—UI copy can stay high-level (“ukentlig kapasitet”).
 */

/** Maximum implied views per calendar week across all campaigns (prototype). */
export const PROTOTYPE_WEEKLY_VIEW_INVENTORY = 500_000;

/**
 * List price: NOK per view before campaign discount (prototype).
 * Combined with {@link inventoryBudget.effectiveNokPerViewAfterDiscount}, budget maps to implied views.
 */
export const LIST_NOK_PER_VIEW = 1;
