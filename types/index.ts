/**
 * Account discriminators are the first 8 bytes of each account type
 * Computed as: sha256("account:<AccountName>")[0..8]
 *
 */
export const ACCOUNT_DISCRIMINATORS = {
  MerchantPlan: Buffer.from([186, 54, 183, 129, 39, 81, 74, 89]),
  SubscriptionState: Buffer.from([35, 41, 45, 165, 253, 34, 95, 225]),
  SubscriptionWallet: Buffer.from([255, 81, 65, 25, 250, 57, 38, 118]),
};