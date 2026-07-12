# MAINTAINR — Apple App Store submission kit

Everything needed to fill out the App Store Connect listing for MAINTAINR on iOS.
Work through the numbered files. (Apple Developer enrollment is already done — the
same account that submitted ShiftLog, LandlordR, TenantLinkr, and EXTRACTR.)

## Contents
- **00-README.md** — this file / submission checklist
- **01-app-store-metadata.md** — name, subtitle, promo text, description, keywords, URLs, category
- **02-app-privacy.md** — App Privacy "nutrition label" answers (App Store Connect → App Privacy)
- **03-review-and-release.md** — App Review sign-in info, age rating, export compliance, release notes
- **screenshots/** — iPhone 6.5" (1284×2778) + iPad 13" (2064×2752); see note below

The public privacy policy lives at `src/app/privacy/page.tsx` in the web app and
is served at `https://maintainr.plainspokenfoundrynine.com/privacy` (login-free,
whitelisted in `src/lib/auth.config.ts`).

## The build you actually upload
Capacitor iOS shell (remote WebView → https://maintainr.plainspokenfoundrynine.com).
Export compliance is pre-set in `Info.plist` (`ITSAppUsesNonExemptEncryption=false`).

Xcode project:
```
../../ios/App/App.xcodeproj   (scheme: App)
```

## Reviewer-access note — READ THIS
MAINTAINR is **auth-gated** (org email + password). Apple's reviewers cannot
self-register, so use the seeded demo account on the LIVE site:
- Username `mark@acme-mfg.com` / password `password123`
- Or open `/demo` for a one-click auto-login (requires `ENABLE_DEMO=true` on prod).

See 03-review-and-release.md.

## Submission checklist
1. [ ] In **App Store Connect → Apps → +**, create the app:
       - Platform: iOS
       - Name: **Maintainr: Predictive CMMS** (see 01)
       - Primary language: English (U.S.)
       - Bundle ID: **com.plainspokenfoundrynine.maintainr** (register under
         Certificates, IDs & Profiles → Identifiers first if not listed)
       - SKU: `maintainr-ios`
2. [ ] Paste name/subtitle/description/keywords/URLs from **01**.
3. [ ] Upload screenshots. Because the Capacitor binary is **universal**
       (iPhone + iPad), Apple requires BOTH a 6.5" iPhone set AND a 13" iPad set.
4. [ ] **PREREQUISITE:** the public `/privacy` page (01) resolves on PROD with no
       login wall. Verify HTTP 200 + no auth redirect, then paste the URL into
       App Privacy.
5. [ ] Fill **App Privacy** data-collection answers (**02**). Note MAINTAINR does
       NOT use the camera — no "Photos or Videos" type.
6. [ ] **App Review Information** — provide the seeded reviewer sign-in (03).
7. [ ] **Age rating** questionnaire (03) → expected **17+ / Unrestricted Web Access**.
8. [ ] **Export compliance** (03): standard HTTPS/TLS → exempt (already pre-set).
9. [ ] Signing: Distribution cert + App Store provisioning profile → Xcode set
        team + release signing → Archive → upload via Organizer (or Transporter).
10. [ ] Attach the uploaded build to the version → **Submit for Review** (USER-gated).

## Screenshots — IMPORTANT
The app is auth-gated. Interior screens (dashboard, assets, a work order, a
maintenance schedule, predictive alerts) convert far better than a bare sign-in
wall, so capture them on the seeded demo login. MAINTAINR has a **light** theme,
so the iPad set is padded with white (`#ffffff`), not a dark color.

**iPhone 6.5":** 1284×2778.
**iPad 13" (required — universal binary):** generate 2064×2752 from the iPhone
captures without a rebuild:
```
sips --resampleHeight 2752 iphone.png --out /tmp/t.png
sips --padToHeightWidth 2752 2064 --padColor ffffff /tmp/t.png --out ipad13/out.png
```

## Reviewer login reminder
Apple App Review WILL reject an auth-gated app if it can't get in. The seeded
`mark@acme-mfg.com` login (or one-click `/demo`) is the reviewer path — confirm it
works on PROD before submitting.
