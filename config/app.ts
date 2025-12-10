export const APP_CONFIG = {
  PROGRAM_ID: process.env.NODE_ENV_VAR == "development" ? process.env.PROGRAM_ID_DEVNET! : process.env.PROGRAM_ID_MAINET!,
  USDC_MINT: process.env.NODE_ENV_VAR == "development" ? process.env.USDC_MINT_DEVNET! : process.env.USDC_MINT_MAINNET!,
  RPC_URL: process.env.NODE_ENV_VAR == "development" ? process.env.RPC_URL_DEVNET! : process.env.RPC_URL_MAINNET!,
  APP_URL: process.env.APP_URL || 'https://api.eventop.xyz',
};