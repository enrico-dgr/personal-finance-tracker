# Architettura di Implementazione

## Backend
- `apps/api/src/index.ts`: entrypoint Express, auth opzionale, route regole sincronizzate, upload stateless e reset storico legacy.
- `apps/api/src/domain/csv.ts`: parsing CSV, riconoscimento colonne, conversione date/importi, gestione preambolo Mediolanum e colonne separate `Uscite` / `Entrate`.
- `apps/api/src/domain/classification.ts`: pulizia descrizioni, merge tra regole default e override utente, match per priorità esplicita e pattern più specifico, fallback finale.
- `apps/api/src/lib/prisma.ts`: client Prisma singleton.
- `apps/api/src/lib/auth.ts`: parsing bearer token e firma token per sessioni utente.

## Frontend
- `apps/web/src/App.tsx`: header globale sticky con menu utente, navigazione hash-based leggera tra dashboard, regole e pagina account dedicata, auth opzionale, bootstrap da localStorage per evitare flicker anonimi al refresh, storico di sessione, reset storico, import, insight orientati al risparmio liquido, grafico full-width spesa/risparmio filtrabile con select ricercabili debounced, confronto mese-su-mese, libreria regole effettiva e modale di correzione manuale multi-riga.
- `apps/web/src/api.ts`: client HTTP tipizzato verso API auth, upload stateless, reset storico, regole sincronizzate e default rules esposte dal backend.
- `apps/web/src/browserStorage.ts`: persistenza locale browser per regole anonime e token auth.
- `apps/web/src/ruleLibrary.ts`: composizione locale tra default rules e override utente, preview match su selezione e helper per payload edit/disattivazione.
- `apps/web/src/sessionStats.ts`: calcolo locale delle statistiche di sessione, top merchant e stima di spesa discrezionale comprimibile.
- `apps/web/src/dashboardAnalytics.ts`: helper per scala, coordinate e serie del grafico full-width con barre di spesa filtrata, linea del risparmio netto e merchant ricorrenti comprimibili.
- `apps/web/src/styles.css`: stile responsive per dashboard, pagina account separata, header applicativo sticky, menu utente, insight grid, grafico analytics full-width, tabella paginata e modale di correzione.

## Database
- `User`: account opzionale per sincronizzare regole tra dispositivi.
- `MerchantRule`: regole persistenti per normalizzare merchant e categoria, associate a un utente, con `defaultRuleId`, `priority` e `isDisabled` per override/disattivazione delle regole di default.
- `Transaction`: tabella legacy ripulibile, non più usata per il normale flusso movimenti.

## Validazioni implementate
- Test unitari sul motore di classificazione.
- Build separata di backend e frontend.
- Smoke test reale su upload CSV con SQLite locale.
- Verifica build dopo introduzione filtri e libreria regole.
- Smoke test browser su header utente, dropdown account e pagina auth dedicata.
- Smoke test browser su dashboard ridisegnata, header sticky, insight panel e paginazione movimenti.
- Smoke test browser su grafico analytics full-width con filtri merchant/categoria e reset coerente del pannello.
- Smoke test browser su select analytics con debounce reale della ricerca e riepilogo filtri coerente.
- Build frontend validata dopo introduzione di default rules gestibili, priorità di match e modale multi-riga.
