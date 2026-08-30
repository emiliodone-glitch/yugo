/**
 * Reference prices (RF-PLU-10). Administrable from the admin panel; these are
 * the seed defaults. Independent prices in DOP and USD per tier and plan.
 */
export type SubscriptionTierKey = 'PLUS' | 'ORO';
export type SubscriptionPlanKey = 'MONTHLY' | 'QUARTERLY' | 'ANNUAL';

export interface PriceTable {
  [tier: string]: {
    [plan in SubscriptionPlanKey]: { DOP: number; USD: number };
  };
}

export const DEFAULT_PRICES: PriceTable = {
  PLUS: {
    MONTHLY: { DOP: 399, USD: 6.99 },
    QUARTERLY: { DOP: 999, USD: 17.99 },
    ANNUAL: { DOP: 2990, USD: 49.99 },
  },
  ORO: {
    MONTHLY: { DOP: 899, USD: 14.99 },
    QUARTERLY: { DOP: 2290, USD: 39.99 },
    ANNUAL: { DOP: 6990, USD: 119.99 },
  },
};
