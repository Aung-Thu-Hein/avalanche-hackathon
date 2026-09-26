/**
 * The free tier's token list.
 *
 * Kept in its own module so the client can import it without pulling in
 * lib/tokens.ts — that would bundle data/tokens.json (211 KB) into the browser.
 *
 * Ordered safest to riskiest, so tapping left to right walks the whole range of
 * the score.
 */
export const FREE_SYMBOLS = ["AVAX", "HYPE", "EIGEN", "GUN", "2Z"] as const;
