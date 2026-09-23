# Project context for Claude Code

Hackathon starter for Avalanche Fuji. Kuro is a web developer (~3 yrs, Laravel
+ React/Next.js) whose gap is Solidity and on-chain tooling, not frontend.
Explain on-chain concepts by analogy to Laravel/React where it helps; do not
explain React or TypeScript basics.

## Stack

- **Contracts**: Solidity ^0.8.20, Foundry (forge/cast). Tests in Solidity.
- **Frontend**: Next.js 15 app router, wagmi v2, viem, RainbowKit, TypeScript.
- **Chain**: Avalanche Fuji C-Chain, chainId 43113.

## Hard rules

1. **Never remove `evm_version = "cancun"` from foundry.toml.** Solidity
   0.8.30+ defaults to Pectra opcodes that Avalanche does not support. Removing
   it causes deploys to fail or contracts to misbehave.
2. **`forge create` and `forge script` need `--broadcast`** or nothing is sent.
3. **Keep `as const` on the ABI in `web/lib/contract.ts`** — it is what gives
   wagmi its type inference.
4. **Never commit `.env`** or print a private key into the terminal.
5. **Never suggest mainnet.** Testnet only for this project.
6. Regenerate `web/lib/contract.ts` from `out/TipJar.sol/TipJar.json` after
   changing the contract's interface — do not hand-edit the ABI.

## Commands

```bash
forge build
forge test -vv
source .env && forge script script/Deploy.s.sol --rpc-url fuji --broadcast
cd web && npm run dev
```

## Constraints that shape decisions

This is for a **one-day hackathon with ~5 hours of build time** (10:50 code
start, 16:00 hard freeze, then a 3-minute pitch). When asked for help:

- Prefer the smallest thing that demos. A 50-line contract that works beats an
  elegant one that isn't finished.
- Do not propose upgradeable proxies, subnets/L1s, Interchain Messaging, or gas
  optimization unless explicitly asked.
- Never write an unbounded loop over an array in a contract.
- Follow checks-effects-interactions; use `.call` for transfers, not
  `.transfer`/`.send`.
- Prefer custom errors over `require` with strings.
- Always wire the pending/confirming state in the UI — an unresponsive-looking
  button reads as a broken demo on stage.

## On Saturday

`TipJar.sol` is a teaching example and is meant to be deleted. The frontend
harness (`web/`), `foundry.toml`, and the deploy script are the parts to keep.
