# SafeHold — Saturday Runbook

**Team1 Codebase Hackathon: Chula Edition — Sat 26 Sep 2026**
Chaloem Rajakumari 60 (Chamchuri 10), 19th floor.

| | |
|---|---|
| **Team** | Kuro — contracts/backend · [Frontend dev] — frontend/data · Justin Htet — BD, presenter, design |
| **Product** | SafeHold — unlock-risk score for token holders |
| **Tracks** | Data · Consumer App |
| **Repo** | `github.com/Aung-Thu-Hein/avalanche-hackathon` |
| **Chain** | Avalanche Fuji C-Chain (43113) |

---

## 0. Status going in — already done

Do not redo any of this.

- [x] Foundry 1.8.3, forge-std v1.16.2 pinned
- [x] Contract compiles, 10/10 tests pass
- [x] Frontend builds and runs (`npm run dev`)
- [x] Deployer wallet funded — **0.45 AVAX**
- [x] Core wallet installed, testnet mode on
- [x] TipJar deployed end-to-end as a rehearsal
- [x] Repo pushed, teammate-cloneable
- [x] WalletConnect projectId working

**Key facts you will need:**

```
Deployer wallet   0x11B74F87693444017C92a013E142AD268051f831   (0.45 AVAX)
TipJar (rehearsal) 0xaDAfE109d73CD2e4FCBe27e167D5a27990a706da  ← gets replaced today
Explorer          https://testnet.snowtrace.io
```

---

## 1. Pre-flight — 08:30 to 09:30, before you leave

**The one genuinely blocking item:**

- [ ] **Get a free Tokenomist API key** at `tokenomist.ai` — the Free plan has **1,000 calls/month, same as Pro**. Without a key there is no data layer.
- [ ] Put it in `web/.env.local` as `TOKENOMIST_API_KEY=...` — **no `NEXT_PUBLIC_` prefix**, or it ships to every browser.
- [ ] Run the snapshot (see §5) so the demo never depends on live API or wifi.

Also:

- [ ] Laptop **and charger**
- [ ] Phone hotspot ready — never trust conference wifi for a demo
- [ ] `forge --version` and `npm run dev` both work
- [ ] `cast balance 0x11B74F87693444017C92a013E142AD268051f831 --rpc-url fuji --ether`

---

## 2. Timeline

| Time | Event | You | Frontend | Justin |
|---|---|---|---|---|
| 09:30 | Registration & setup check | verify env | verify env | — |
| 10:10 | Opening + Avalanche briefing | — | — | note anything for the pitch |
| 10:30 | **Tokenomist partner session** | **ask the licence question (§7)** | — | — |
| 10:50 | **Hacking starts** | contract | UI shell | deck |
| 12:30 | Lunch | — | — | — |
| 13:30 | Mentor checkpoint | show working contract | show working UI | practise on a mentor |
| 15:00 | **Integration freeze** | stop building, wire together | | rehearse on real app |
| 16:00 | **Code freeze & submission** | | | |
| 16:20 | Pitches — 3 min + 3 min Q&A | | | **Justin presents** |
| 18:00 | Awards | | | |

**15:00 is the real deadline.** Anything not integrated by then gets cut. The last hour is rehearsal, not building.

---

## 3. Scope — decided

### Building

**Contract: on-chain Pro subscription** (~60 lines, same shape as TipJar)

```solidity
subscribe()            payable  → grants 30 days Pro, extends if active
isPro(address)         view     → what the frontend gates on
event Subscribed(user, until)   → how the backend knows who to alert
withdraw()             onlyOwner
setPrice(uint256)      onlyOwner
```

Demo price: **0.05 AVAX**. If asked about USD volatility: *"fixed AVAX today, price oracle later."* Do not build the oracle.

**Frontend:** search a token → show score + one sentence → "Go Pro" → wallet → Pro unlocked.

**Backend:** Next.js route handler that reads the cached snapshot and computes the score. Server-side only — it holds the API key.

### Cut — confirm at 10:50 before anyone starts

- [ ] **Telegram bot** — off-chain, an extra integration, depends on wifi during the 3-minute slot. Replace the demo beat with the on-chain subscription confirming. A screenshot on a slide is enough for the story.
- [ ] **AI scoring layer** — you're in Data and Consumer App, not AI Agent. A deterministic formula is instant, free, needs no API, and is *more* defensible: "here's our formula, audit it."

Cutting both buys back ~2 hours and removes the two most likely live-demo failures.

### Not building

Portfolio scoring, wallet import, on-chain hedging, multi-chain. All "Next 90 days" on slide 14 — keep them there.

---

## 4. The score

Unlock dates are near-static — vesting schedules are published months ahead. **Compute the countdown locally from cached data.** Never re-fetch to update "days until unlock."

```
score = 100
      − (unlock within 14 days       ? 40 : 0)
      − (unlock size vs circulating  ? up to 30 : 0)
      − (locked share of max supply  ? up to 20 : 0)
```

Tune the numbers so AVAX lands near 82 and a risky token near 41 — those are the values in the deck.

One sentence, templated:

- `≥70` → "Safe to hold this week — no unlock scheduled in the next 14 days"
- `40–69` → "Watch closely — {pct}% of supply unlocks in {n} days"
- `<40` → "High risk — unlock in {n} days, {pct}% of circulating supply"

---

## 5. Tokenomist API

```
GET https://api.tokenomist.ai/v5/token/list          header: x-api-key
GET https://api.tokenomist.ai/v5/unlock/events/{id}  header: x-api-key
```

| Endpoint | Batches? | Cost for 30 tokens |
|---|---|---|
| `token/list` | **yes** — comma-separated, or omit for all | **1 call** |
| `unlock/events/{id}` | **no** — one token per call | **30 calls** |

**Budget: 1,000 calls/month = ~33/day.** A full 30-token refresh costs 31 calls. Daily refresh = 930/month, leaving almost nothing for development.

**So: snapshot once, work from the file.**

```
scripts/fetch-snapshot.ts  →  data/tokens.json   (~31 calls, run once)
```

Every developer reads `data/tokens.json`. Zero API calls during the build day, zero wifi dependency on stage. Wire live fetching only if you are ahead at 15:00.

Pick ~20–30 tokens that include **AVAX** (the safe example, score ~82) and one close to an unlock (the risky example, ~41). The demo needs both.

---

## 6. Commands

```bash
# contracts
forge build
forge test -vv
source .env && forge script script/Deploy.s.sol --rpc-url fuji --broadcast

# after deploying, paste the printed address into web/.env.local, then RESTART dev server
cd web && npm run dev

# verify on-chain
cast balance 0x11B74F87693444017C92a013E142AD268051f831 --rpc-url fuji --ether
cast nonce   0x11B74F87693444017C92a013E142AD268051f831 --rpc-url fuji
cast call $ADDR "isPro(address)(bool)" 0x11B7... --rpc-url fuji
cast code    $ADDR --rpc-url fuji        # 0x = nothing deployed there
```

`web/.env.local`:

```
NEXT_PUBLIC_WC_PROJECT_ID=<already set>
NEXT_PUBLIC_CONTRACT_ADDRESS=<new address after deploy>
TOKENOMIST_API_KEY=<no NEXT_PUBLIC_ prefix>
```

---

## 7. Ask at the 10:30 Tokenomist session

> "Our model caches your data and serves a derived score to subscribers. Does the Pro commercial licence cover that, or do we need Standard?"

Their Terms §5.3 restricts storing raw data, creating "Resultant Data" (derived calculations), and distributing it — **unless authorised by a Subscription Plan**. The pricing page says Pro ($69) includes a Commercial License; the API docs page says all plans are non-commercial. They contradict each other.

Fine for a demo either way. It matters for slide 12: if you need Standard ($249.95) rather than Pro ($69), breakeven moves from ~15 subscribers to ~50. **Justin: hold that number loosely until this is answered.**

Answering this well in Q&A is a differentiator — most teams will not have read the terms.

---

## 8. Gotchas — all of these have already bitten us

| Symptom | Cause |
|---|---|
| Deploy "succeeds" but nothing happened | missing `--broadcast`. Check `cast nonce` moved. |
| Env change has no effect | `NEXT_PUBLIC_*` is baked in at build time — **restart the dev server** |
| Fresh clone won't compile | `lib/` is gitignored — run `forge install foundry-rs/forge-std` |
| `forge install` dirties the tree | it recreates `.gitmodules`; `git restore --staged .gitmodules lib/forge-std && rm -f .gitmodules` |
| Frontend build fails on `@x402/*` | already fixed in `web/next.config.mjs` — do not delete that webpack block |
| Contract behaves oddly on Fuji | never remove `evm_version = "cancun"` from `foundry.toml` |
| Wrong wallet funded | the faucet pays Core's **active** account, not necessarily `.env`'s |

**Redeploying gives a new address with empty storage.** Contracts are immutable. Every redeploy means updating `NEXT_PUBLIC_CONTRACT_ADDRESS` and restarting.

---

## 9. Demo script — 3 minutes

1. **Problem** (20s) — holders get blindsided by unlocks
2. **Search AVAX** (30s) — score **82**, "safe to hold this week". No wallet needed; it just works
3. **Search the risky token** (30s) — score **41**, "unlock in 4 days, 12% of circulating supply"
4. **Go Pro** (45s) — connect Core → pay 0.05 AVAX → *Confirm in wallet…* → *Mining…* → Pro unlocked
5. **Why Avalanche** (20s) — sub-second finality, fees small enough that a $5 subscription makes sense on-chain
6. **Business model** (35s) — free tier, $4.99 Pro, data cost fixed per token not per user

Step 4 is the moment that lands. **The pending → mining → confirmed transition is already wired** in `TipJarCard.tsx` — reuse that component's structure.

### Contingencies

| If | Then |
|---|---|
| Wifi dies | phone hotspot; snapshot means only the wallet needs network |
| Wallet popup won't open | have a **pre-recorded 20s screen recording** ready by 15:30 |
| Contract misbehaves | fall back to Snowtrace's read interface — a verified contract gives a clickable UI |
| No API key all day | demo entirely from the committed snapshot; be honest that it's cached |

**Record the backup video at 15:30.** Not optional. A demo that fails live with no fallback is the single most common way to lose.

---

## 10. Open decisions for 10:50

- [ ] Confirm Telegram and AI layer are cut (§3)
- [ ] Which ~25 tokens go in the snapshot, including the two demo tokens
- [ ] Contract price in AVAX (suggest 0.05)
- [ ] Fill `[Dev name]` placeholders on the team slide
- [ ] Who runs the laptop during the pitch — Justin speaks, someone else drives

---

## 11. Priorities if you fall behind

Cut in this order:

1. Live API — use the snapshot
2. Multiple tokens — two are enough for the demo
3. Score formula nuance — a crude score that displays beats a perfect one that doesn't
4. Styling polish

**Never cut:** the on-chain subscription. It is why this is an Avalanche project and not a web app. If the contract is not working by 13:30, stop everything else and fix it.

---

*Budget: ~90 min on-chain, the rest on product and polish. A 50-line contract that works beats an elegant one that isn't finished.*
