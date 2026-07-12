# MAINTAINR — App Review, Age Rating, Export Compliance & Release

Everything below is filled in **App Store Connect → your app → [version]**, plus
the one-time **App Information** settings. The final **Add for Review / Submit**
is done by the USER.

---

## App Review Information  (Version → App Review Information)

Reviewers must be able to sign in without creating an account. MAINTAINR is
auth-gated; use the seeded demo account below (these are non-secret demo
credentials that already ship in the public client bundle).

- **Sign-in required:** Yes
- **Demo account username:** `mark@acme-mfg.com`
- **Demo account password:** `password123`
  > ⚠️ The USER types this into the ASC password field. Do not enter it elsewhere.
- **One-click alternative:** the reviewer can open
  `https://maintainr.plainspokenfoundrynine.com/demo`, which auto-signs into the
  seeded demo org and lands on the dashboard (requires `ENABLE_DEMO=true` on prod
  — verify before submitting).
- **Notes for the reviewer:**
  ```
  MAINTAINR is a maintenance-management (CMMS) tool. Sign in with the demo
  account above, or open /demo for a one-click demo session.

  To exercise the core flow: open the dashboard to see assets and open work
  orders, then open a work order and a maintenance schedule. This is a WebView
  client for our hosted service at https://maintainr.plainspokenfoundrynine.com
  — a live internet connection is required.
  ```
- **Contact:** first/last name, phone, and `support@plainspokenfoundrynine.com`.

---

## Age Rating  (App Information → Age Rating)

MAINTAINR is a WebView client that can load web content, so Apple's questionnaire
pushes this to 17+.

- **Unrestricted Web Access:** **Yes** → results in **17+**.
- All other content-description questions: **None / No**.
- Not "Made for Kids".

---

## Export Compliance  (Version → Build → Export Compliance)

- **Does your app use encryption?** Only standard HTTPS/TLS.
- **Exempt?** **Yes** — qualifies for the exemption (standard encryption only).
- Already declared in `Info.plist`:
  ```xml
  <key>ITSAppUsesNonExemptEncryption</key>
  <false/>
  ```
  This makes ASC skip the per-build encryption prompt.

---

## Pricing and Availability

- **Price:** **Free** (Tier 0).
- **In-app purchases:** None.
- **Availability:** All territories (175).
- **Pre-orders:** No.

### ⚠️ EU Digital Services Act — Trader Status
ASC will require a **trader / non-trader** declaration for EU distribution. This
is a business/legal decision. **PAUSE and confirm with the USER before setting
it.** (If declared a trader, the DSA requires a public trader address + contact
to be shown in the EU.)

---

## Version Information / Release

- **Version:** `1.0`
- **Copyright:** `2026 Plainspoken Foundry Nine`
- **What's New (release notes) for 1.0:**
  ```
  Initial release. Track assets, schedule preventive maintenance, run work
  orders, and get ahead of failures with predictive alerts — from anywhere.
  ```
- **Release option:** Manually release this version (recommended for a first
  launch so you control go-live after approval).

---

## Final submission checklist (USER-gated)
- [ ] Build attached (Xcode Archive → upload → appears under TestFlight/Builds).
- [ ] Screenshots uploaded (iPhone 6.5" + iPad 13").
- [ ] Metadata, keywords, URLs filled (doc 01).
- [ ] App Privacy label completed (doc 02).
- [ ] Age Rating = 17+, Export Compliance exempt, Free / all territories.
- [ ] Reviewer demo credentials + notes entered (USER types the password).
- [ ] EU trader-status decision confirmed with USER.
- [ ] **Add for Review / Submit** — performed by USER.
