# Fuji Hackathon Starter

A verified, minimal Avalanche starter for the **Team1 Codebase Hackathon: Chula Edition**
(Sat 26 Sep 2026, Chamchuri 10, 19th floor).

Two halves:

```
src/ test/ script/   Solidity contract + Foundry tests + deploy script
web/                 Next.js 15 + wagmi v2 + RainbowKit frontend
```

Everything here has been compiled, tested (10/10 passing, incl. 256 fuzz runs)
and deployed to a local chain end-to-end. The `cast` commands below were run,
not guessed.

---

## Why this exists

The hack runs **10:50 → 16:00**. That is ~5 hours with lunch in the middle.
Anyone who spends the first hour on `npm install` and wallet config has lost
20% of their build time. Clone this, deploy it, confirm it works — then on
Saturday you delete `TipJar.sol`, write your real contract, and keep the
entire frontend harness.

---

## Setup (do this before Saturday)

### 1. Install Foundry

```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

Gives you `forge` (build/test/deploy) and `cast` (CLI chain interaction).

### 2. Install dependencies

```bash
forge install foundry-rs/forge-std
cd web && npm install && cd ..
```

### 3. Make a throwaway wallet

```bash
cast wallet new
```

Copy `.env.example` → `.env` and paste the private key in.

> **This wallet is disposable.** Never put real funds in it. Never reuse a key
> you have used anywhere else. `.env` is gitignored — keep it that way.

### 4. Get test AVAX

- `https://faucet.avax.network` — use coupon code `avalanche-academy25` if it
  asks for a mainnet balance you don't have
- Fallback: `https://faucet.quicknode.com/avalanche` (no account, no mainnet balance)

Faucets rate-limit to roughly once per 12–24h, so **do this before Saturday**,
not at 10:45 on the day.

---

## The loop

```bash
forge build                 # compile
forge test -vv              # run tests (milliseconds)
forge fmt                   # format

# deploy to Fuji
source .env
forge script script/Deploy.s.sol --rpc-url fuji --broadcast

# or a one-off deploy without a script
forge create src/TipJar.sol:TipJar \
  --rpc-url fuji --private-key $PRIVATE_KEY \
  --constructor-args "My Jar" --broadcast
```

> `--broadcast` is **required** in current Foundry. Without it nothing is
> actually sent and you will stare at a "successful" run that did nothing.

### Talking to a deployed contract

```bash
export ADDR=0xYourDeployedAddress

cast call $ADDR "name()(string)"       --rpc-url fuji
cast call $ADDR "totalTips()(uint256)" --rpc-url fuji

cast send $ADDR "tip(string)" "gg" \
  --value 0.01ether --rpc-url fuji --private-key $PRIVATE_KEY
```

### Frontend

```bash
cp web/.env.local.example web/.env.local
# paste the deployed address into NEXT_PUBLIC_CONTRACT_ADDRESS
# get a free projectId at https://cloud.reown.com
cd web && npm run dev
```

---

## The one line you must not delete

```toml
# foundry.toml
evm_version = "cancun"
```

Solidity 0.8.30+ defaults to the Pectra EVM, which uses opcodes Avalanche does
**not** support yet. Without this line your contract may fail to deploy or
behave strangely — and you will lose an hour on Saturday debugging code that
is fine.

---

## Mental model, coming from Laravel

| You know | On-chain |
|---|---|
| `Auth::user()` | `msg.sender` — the calling address. That's the whole auth system. |
| Free `UPDATE` | Every state write costs the caller gas. |
| `SELECT * FROM x` | Does not exist. Mappings are not iterable. |
| Broadcasting | `event` — your log *and* your read layer. |
| Migrations | Contracts are immutable once deployed. Redeploy = new address. |
| `null` | No such thing. Unset mapping values return `0` / `""` / `address(0)`. |

**The trap:** never loop over an unbounded array. It works with 5 items in
testing and runs out of gas during the demo. Use mappings; emit events and
read the history off-chain.

---

## Where your edge is on Saturday

You are a working web developer in a room that skews student. Most teams will
have a contract that works and a UI that looks unfinished. The judges see a
**3-minute demo + 2 min Q&A** — they are reacting to whether it works and
whether the idea lands, not to contract elegance.

Budget roughly: **90 min on-chain, the rest on product and polish.**

Your winning contract is probably 50 lines. This one is 110 with comments.

**Backup plan:** verify your contract on Snowtrace
(`forge verify-contract`). A verified contract gives you a clickable write
interface — so if your frontend breaks on stage, you still have a live demo.

---

## Tracks

`AI Agent · DeFi · Consumer App · RWA · Gaming · Data`

You may enter more than one, and overall winners still qualify for a track
prize. With ~55 attendees across six tracks, a **track prize ($50) is a far
more realistic target than 1st place**. The "best content post" prize
($25 × 2) is close to free money — post a build thread on X during the day.

---

## Files

```
foundry.toml              evm_version=cancun + the fuji RPC alias
.env.example              copy to .env, never commit
src/TipJar.sol            example contract: payable, mapping, events, access control
test/TipJar.t.sol         10 tests incl. a fuzz test - read this to learn the cheatcodes
script/Deploy.s.sol       reproducible deploy
web/lib/wagmi.ts          chain config (avalancheFuji is built into wagmi)
web/lib/contract.ts       ABI generated from the build artifact - keep `as const`
web/components/TipJarCard.tsx   the four hooks that cover 90% of a dApp
```

## Deliberately skipped

Avalanche L1s/subnets, Interchain Messaging, upgradeable proxies, gas golfing,
Hardhat. None of it earns points in a 5-hour build. If the morning briefing
mentions subnets, you are still fine building on the C-Chain.

## Network reference

| | |
|---|---|
| Chain | Avalanche Fuji C-Chain |
| Chain ID | 43113 |
| RPC | `https://api.avax-test.network/ext/bc/C/rpc` |
| Explorer | `https://testnet.snowtrace.io` |
| Currency | AVAX (test) |


## How to check it yourself (notes from AI just for note)

  The CLI way — run from the project directory:

  cast balance 0x11B74F87693444017C92a013E142AD268051f831 --rpc-url fuji --ether

  Two things worth knowing:

  - --rpc-url fuji works because foundry.toml defines that alias under [rpc_endpoints]. It
    only resolves when you run from inside the project — elsewhere you'd pass the full
    RPC URL.
  - Without --ether you get wei, an 18-digit number. --ether divides by 1e18 into human
    units.

  Since you'll run this constantly, put it in your ~/.bashrc alongside the PATH line:

  export PATH="$PATH:/home/ath/.foundry/bin"
  alias bal='cast balance 0x11B74F87693444017C92a013E142AD268051f831 --rpc-url fuji 
  --ether'