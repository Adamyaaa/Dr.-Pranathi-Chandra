# Dr. K. Pranathi Chandra — Preview Build
Phase 1 (Presence + Request & Confirm booking). Static site, no backend, no database.

---

## Deploy in 30 seconds

**Option A — Vercel (drag & drop)**
1. Go to vercel.com → Add New → Project → **Deploy without Git**
2. Drag the whole `drpc` folder in.
3. Done. You get a `*.vercel.app` URL.

**Option B — Netlify Drop**
1. Go to app.netlify.com/drop
2. Drag the `drpc` folder in.

*(The Vercel MCP deploy failed with a 403 — the connected Vercel account doesn't have permission to create projects. Either upgrade that account's role, or use drag-and-drop.)*

**Option C — local preview:** `cd drpc && python3 -m http.server 8000` → open `localhost:8000`

---

## Before you send the link — read this

The site carries Dr. Chandra's **real name, photo, and council registration number**. She has not consented to publication yet. Two protections are already in place:

- `<meta name="robots" content="noindex,nofollow">` on every page
- `robots.txt` with `Disallow: /`

**Do not remove either until she has signed off.** The link is shareable but unlisted; it will not appear in Google.

---

## The 8 things she needs to confirm

Everything below appears on the site in **amber**, so she can spot them herself while scrolling. There is also a preview banner at the top explaining the convention.

| # | Field | Where | Why it matters |
|---|---|---|---|
| 1 | Clinic name | Visit details | Must match Google Business Profile exactly, character for character |
| 2 | Full address + pin code | Visit details | Same — NAP consistency drives local ranking |
| 3 | Consulting days | Visit details | — |
| 4 | Morning / evening timings | Visit details | — |
| 5 | Consultation fee (₹) | Visit details | Stating it upfront filters out price-shoppers and raises show-up rate |
| 6 | Languages spoken | Visit details | Telugu/Hindi/English assumed — needs confirming |
| 7 | Senior Resident dates + current status | Training section | Is she still at Gandhi, or is this past? Changes the tense |
| 8 | Privacy contact + retention period | privacy.html | DPDP requirement |

**Also confirm:** is `94920 34424` the number that should receive WhatsApp appointment requests, or does she want a separate clinic number? Every request routes there.

---

## What's built

**7 pages**
- `index.html` — hero, credentials, emergency notice, 5 conditions, symptom note builder, booking, visit details, training, FAQ
- `asthma.html`, `copd.html`, `tuberculosis.html`, `allergy.html`, `sleep-apnoea.html` — one per condition, ~600 words each, written to be read *before* the visit
- `privacy.html` — DPDP-shaped privacy note

**Request & Confirm booking (Phase 1 spec)**
Patient fills name, mobile, visit type, preferred day + session, note → submit composes a structured WhatsApp message to 91 94920 34424 → patient presses send → clinic confirms manually. **Nothing auto-confirms**, so the site can never sell a slot she isn't at.

**The symptom note builder** — the differentiator
Patient ticks what applies; it composes a note they send with the request. It also escalates:
- Ticking "blood in the phlegm" → tells them to call rather than wait for a reply
- Duration over 3 weeks → tells them it warrants assessment rather than more antibiotics

It never diagnoses. It's an intake helper, which keeps it clear of clinical-decision-tool territory.

**Pitch line for her:** *"Your consultations start with the full history already written down."* That's a benefit to her workflow, not just to the patient.

---

## Compliance decisions baked in

| Requirement | How it's handled |
|---|---|
| MCI 2002 Code, Clause 6.1 (no soliciting) | No testimonials, no patient reviews, no "best pulmonologist", no before/after. Factual credentials only. **No automated Google review request** — deliberately omitted |
| Drugs & Magic Remedies Act 1954 | No cure claims anywhere. Asthma is "managed rather than cured"; TB is "treatable" with emphasis on completing the course |
| Registration display | TSMC FMR 17083 in the header stamp, About section, and every page footer |
| Telemedicine (TPG 2020) | Teleconsult explicitly **not** offered through the site — FAQ says in-person only |
| DPDP consent | Tick-box consent before submission, stating purpose and channel. Linked privacy note |
| Emergency safety | Dark strip below the hero: breathlessness, blue lips, chest pain, large haemoptysis → emergency department, don't book |
| ABDM / ABHA | Out of scope, as agreed |

**Still required before launch:** a healthcare lawyer reads the copy. Budget one week. This is not optional given her registration is on the page.

---

## Performance

- Total page weight ~90KB including the photo
- Zero framework, zero build step, one 14KB stylesheet, one 6.5KB script
- WebP photo at 560px, `fetchpriority="high"` on the LCP element
- Should land well under the 1.8s LCP budget on 4G

Verified: all 7 pages return 200, zero console errors, note builder and form flow tested end-to-end, keyboard focus visible on all controls, `prefers-reduced-motion` respected.

---

## Design notes (in case she asks)

Palette comes from gas exchange — deep venous navy against the arterial red already on her visiting card. The photo sits inside a slow radial glow on a **10-second cycle: 4 seconds expanding, 6 contracting** — the timing of a resting breath, about 12 per minute. Nobody will consciously notice it. That's the point.

Type: Newsreader (display) for authority, Public Sans (body) for screen legibility, IBM Plex Mono for anything that behaves like clinical data — the registration number, section labels, the composed note. Data reads as data.

---

## What comes next, and what gates it

**Phase 1 production build** (only after she signs):
- Write `appointment_requests` rows to Postgres so requests are logged, not just messaged
- Clinic `/today` view: one-tap Confirm / Suggest another time / Decline
- One-tap `wa.me` reminder for tomorrow's list — no Meta API, no template approval, no per-message cost
- `patients`, `consents`, `audit_log` tables (DPDP)
- GBP claim + appointment URL with UTM tags

**Phase 2 (instant-confirm engine)** stays gated on: ≥20 booking requests/month **and** median request→confirmation latency over 4 hours. If the receptionist is turning requests around in 15 minutes, the engine is pure cost — don't build it.

---

## Two things to prepare before the meeting

1. **Ask what she currently pays Practo or JustDial per month.** The whole pitch is aggregator independence. If the number is under ₹5,000, reposition around new-patient acquisition instead.
2. **Ask who answers the clinic phone.** If there's a receptionist, she is the real daily user and the real veto. Onboard her first.
