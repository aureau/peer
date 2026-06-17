# 09 — WebRTC P2P (Documented Upgrade Path)

> NOT the MVP. Recorded here so future-me can decide deliberately instead of rediscovering the tradeoffs.

## 1. Why it's tempting
- **No size cap:** bytes go browser-to-browser, never through the Worker/R2 → a 100MB+ repo doesn't touch (or bill) my storage and isn't bounded by the 100MB request-body limit.
- **Privacy:** with DTLS, the transfer is encrypted peer-to-peer; the server never sees payloads even pre-app-encryption.
- **No storage to manage:** nothing to TTL-sweep.

## 2. Why it's NOT the MVP
- **Corporate NAT/firewall:** the direct peer path (UDP, often) is frequently blocked on corporate networks. When direct fails, WebRTC needs a **TURN relay** to bounce traffic — and free, reliable TURN is hard to get tonight. copypaste.me works on hostile networks *because it runs its own TURN*; I won't have one.
- **Silent failure mode:** signaling succeeds, the data channel just never opens. Hard to debug, exactly the failure corporate NAT causes.
- **More code:** UI + verbose WebRTC peer setup (offer/answer, ICE candidates, DataChannel, chunking, reassembly) + a signaling channel. Materially more than the relay's `fetch` POST/GET.
- **Both tabs must be open simultaneously:** no store-and-forward; if the receiver isn't live, the transfer can't happen. The relay model tolerates the receiver showing up later (within TTL).

## 3. What it still needs from a server
- **Signaling:** a tiny channel to exchange SDP offers/answers + ICE candidates. Can be a small Cloudflare Worker (with a Durable Object or even KV-polling) — I already have the Worker, so signaling is cheap to add.
- **TURN (the real blocker):** for restrictive networks. Options:
  - Public free TURN (unreliable, rate-limited, may be down).
  - Self-hosted `coturn` (needs a server — not free/effortless).
  - Cloudflare's TURN service (check current pricing/free allowance at the time).

## 4. Recommended shape *if* I ever add it
- Keep the relay as the **default/fallback**. Use WebRTC as an **opportunistic fast path**:
  1. Pair via the existing token (Worker as signaling).
  2. Attempt WebRTC data channel.
  3. If it connects within a few seconds → transfer P2P (great for big repos).
  4. If it fails/times out → **fall back to the relay** automatically.
- This gives the best of both: reliability guaranteed by the relay, efficiency/privacy when P2P happens to work.

## 5. Decision trigger
Add WebRTC only when **both** are true:
- I'm regularly moving payloads big enough that R2/relay bandwidth or the 100MB ceiling actually hurts, **and**
- I've confirmed (or arranged TURN such) that P2P connects on the work network.

Until then, the relay is simpler, more reliable, and sufficient.
