# 01 — Goals & Scope

## 1. Primary goal

Replace `copypaste.me` in my personal workflow with something I own, that is tuned to moving **text, files, and repos** between a locked-down work PC and a personal PC, and that eventually solves the "keep repo context fresh in a chat" problem via Prompt Mode.

## 2. Success criteria

**MVP is a success if, tonight or close to it:**

- [ ] I can open the deployed URL on both PCs.
- [ ] Work PC generates a token; personal PC enters it; they pair within a few seconds.
- [ ] I can send a multi-paragraph block of text and paste it cleanly on the other side.
- [ ] I can drag-drop one or several files (<10MB total typical) and download them on the other side intact (byte-identical).
- [ ] Reverse direction (personal → work) works via **send from here** on the receive side (`13`); default is work sends, personal receives.
- [ ] It works on the **work network** end to end (the real test — a localhost demo proves nothing).

**Phase 2 is a success if:**

- [ ] I can drop a repo folder and receive it as a usable archive on the other side.
- [ ] Images transfer and preview.
- [ ] Recent transfers show in a history list and auto-expire.
- [ ] Payloads are encrypted such that the server only ever sees ciphertext.

**Phase 3 (Prompt Mode) is a success if:**

- [ ] I can build up a context buffer of files/folders in the app.
- [ ] Re-dropping a same-named file offers to replace it in place.
- [ ] One button gives me a formatted text blob (paths + fenced contents) ready to paste as chat context, with a size estimate.

## 3. Non-goals (now and possibly ever)

- Not a general-purpose Dropbox/Drive replacement.
- Not multi-user / team sharing. **Two devices, one person.** (Pairing model can stay simple because of this.)
- Not a public service for others. Personal use; abuse surface stays small.
- Not automatic background folder sync (see `00 §6`).
- Not mobile-first. Desktop browser is the target; mobile is a bonus if it falls out for free.
- No real user accounts/login in MVP. The token *is* the auth.

## 4. Persona (just me, but worth stating)

**The work-PC me:** Chromium browser, can browse/paste/download, cannot install software, cannot use personal accounts, behind corporate NAT/proxy/firewall of unknown strictness. Wants to fire off text or a file in seconds without friction.

**The personal-PC me:** Full control, can install things later (relevant only for the rejected agent idea / optional WebRTC). Wants to receive and either use immediately or stash.

## 5. Guiding principles

1. **Reliability over elegance.** If P2P *might* not connect on the work network, don't depend on it for the MVP.
2. **Client-side over server-side.** The Worker's 10ms CPU budget and the privacy goal both push heavy work (zip, encrypt, format) into the browser. The Worker is a dumb pipe + short-lived locker.
3. **Transient by default.** Nothing persists unless I explicitly turn on history; even then it expires.
4. **One origin, one deploy.** Fewer things to break on the network and fewer things to wire up tonight.
5. **Don't build the rejected feature.** Prompt Mode is the answer to the sync itch.
