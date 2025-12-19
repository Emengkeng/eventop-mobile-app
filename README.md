# Even - Crypto Subscriptions That Just Work

A mobile-first subscription management app built on Solana that lets users pay for services in crypto while maintaining full custody and earning yield on idle funds.

[Download Testnet APK](https://expo.dev/artifacts/eas/wnBeLvhhs4fYWyper1TR7T.apk)

## What It Does

**For Users:**
- Subscribe to services using USDC on Solana
- Keep full custody of your funds (no intermediaries)
- Earn yield on idle balance through DeFi integration
- Manage all subscriptions from one mobile app
- Automatic payments handled by smart contracts

**For Merchants:**
- Accept recurring crypto payments via simple checkout API
- Receive payments directly to your wallet on-chain
- No custody risk, no payment processor fees
- Easy integration with existing systems

## How It Works

1. **Create Subscription Wallet** - Users connect with Privy embedded wallet and create a subscription wallet (PDA)
2. **Deposit & Earn** - Add USDC and optionally enable yield earning on idle balances
3. **Subscribe** - One-click subscribe to merchant plans with automatic payment scheduling
4. **Auto-Pay** - Smart contracts handle recurring payments while users keep custody

## Tech Stack

- **Mobile**: React Native + Expo
- **Blockchain**: Solana (Anchor framework)
- **Wallet**: Privy embedded wallets
- **Backend**: NestJS + Prisma + PostgreSQL
- **DeFi**: Integrated with Marginfi, Kamino, Solend for yield

## Getting Started

```bash
# Install dependencies
npm install

# Configure app.json with your Privy credentials
# Start development server
npm start

eas build --platform android --profile preview
```
```

**Links:**
- [Dashboard](https://eventop.xyz)
- [Documentation](https://docs.eventop.xyz)

---

*Bringing crypto's original promise of self-custody and freedom to recurring payments.*