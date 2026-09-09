# Architettura di Implementazione

## Backend
- `apps/api/src/index.ts`: entrypoint Express, auth opzionale con rate limiting su signup/login, CORS ristretto alle origin configurate, route regole sincronizzate e upload stateless.
- `apps/api/src/domain/csv.ts`: parsing CSV, riconoscimento colonne, conversione date/importi, gestione preambolo Mediolanum e colonne separate `Uscite` / `Entrate`.
- `apps/api/src/domain/classification.ts`: pulizia descrizioni, merge tra regole default e override utente, match per priorità esplicita e pattern più specifico, fallback finale.
- `apps/api/src/lib/prisma.ts`: client Prisma singleton.
- `apps/api/src/lib/env.ts`: caricamento del `.env` di root risalendo dalle cartelle, necessario perché gli script npm workspace girano con cwd `apps/api`.
- `apps/api/src/lib/auth.ts`: parsing bearer token e firma token per sessioni utente; `AUTH_SECRET` è obbligatorio e il processo non parte senza.

## Frontend
- `apps/web/src/App.tsx`: pagina applicativa con header globale sticky e menu utente, auth opzionale, bootstrap da localStorage per evitare flicker anonimi al refresh, storico di sessione, reset storico client-side, import, insight orientati al risparmio liquido, grafico full-width spesa/risparmio filtrabile, confronto mese-su-mese, libreria regole effettiva e modale di correzione manuale multi-riga.
- `apps/web/src/routing.ts`: navigazione hash-based tra dashboard, regole e pagina account.
- `apps/web/src/formatters.ts`: formattazione di importi, date, mesi, riepiloghi di selezione e confronti mese-su-mese.
- `apps/web/src/uiHelpers.ts`: layout della paginazione e toggle delle selezioni multiple.
- `apps/web/src/ruleState.ts`: merge non duplicante delle regole in stato e costruzione delle regole locali.
- `apps/web/src/useDebouncedValue.ts`: hook di debounce usato dalle select ricercabili.
- `apps/web/src/components/SearchableMultiSelect.tsx`: select multipla con ricerca debounced, chiusura su click esterno ed Escape.
- `apps/web/src/api.ts`: client HTTP tipizzato verso API auth, upload stateless, regole sincronizzate e default rules esposte dal backend.
- `apps/web/src/browserStorage.ts`: persistenza locale browser per regole anonime e token auth.
- `apps/web/src/ruleLibrary.ts`: composizione locale tra default rules e override utente, preview match su selezione e helper per payload edit/disattivazione.
- `apps/web/src/sessionStats.ts`: calcolo locale delle statistiche di sessione, top merchant e stima di spesa discrezionale comprimibile.
- `apps/web/src/dashboardAnalytics.ts`: helper per scala, coordinate e serie del grafico full-width con barre di spesa filtrata, linea del risparmio netto e merchant ricorrenti comprimibili.
- `apps/web/src/styles.css`: stile responsive per dashboard, pagina account separata, header applicativo sticky, menu utente, insight grid, grafico analytics full-width, tabella paginata e modale di correzione.

## Database
- `User`: account opzionale per sincronizzare regole tra dispositivi.
- `MerchantRule`: regole persistenti per normalizzare merchant e categoria, associate a un utente, con `defaultRuleId`, `priority` e `isDisabled` per override/disattivazione delle regole di default.
- `Transaction`: tabella deprecata e mai scritta, conservata solo per compatibilità con `dev.db` esistenti (ADR-0003).

## Validazioni implementate
- Test unitari sul motore di classificazione e sul parsing CSV (`apps/api`).
- Test unitari su statistiche di sessione, libreria regole, analytics dashboard, routing, formatter e helper UI (`apps/web`).
- ESLint su tutto il monorepo e workflow CI che esegue lint, build e test.
- Build separata di backend e frontend.
- Smoke test reale su upload CSV con SQLite locale.
- Smoke test su avvio API, health, categorie, upload via proxy Vite, signup/login, creazione e lettura regole.
- Verifica che gli endpoint legacy sui movimenti rispondano 404 e che il rate limiting auth risponda 429 oltre soglia.
- Verifica che gli header CORS vengano emessi solo per le origin consentite.
- Smoke test browser su header utente, dropdown account e pagina auth dedicata.
- Smoke test browser su dashboard ridisegnata, header sticky, insight panel e paginazione movimenti.
- Smoke test browser su grafico analytics full-width con filtri merchant/categoria e reset coerente del pannello.
- Smoke test browser su select analytics con debounce reale della ricerca e riepilogo filtri coerente.
- Build frontend validata dopo introduzione di default rules gestibili, priorità di match e modale multi-riga.
