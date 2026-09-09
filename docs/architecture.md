# Architettura

## Stack
- Frontend: React + TypeScript + Vite
- Backend: Node.js + Express + TypeScript
- Database: SQLite via Prisma

## Struttura repository
- `apps/web`: dashboard web
- `apps/api`: API backend
- `prisma`: schema database e seed iniziale
- `examples`: file CSV di esempio per prove
- `docs`: documentazione prodotto e tecnica

## Flusso dati
1. Il frontend invia il CSV a `POST /api/upload` insieme alle regole attive.
2. Il backend usa parser CSV e motore di classificazione in modo stateless.
3. Il frontend conserva i movimenti solo nella sessione corrente e calcola localmente insight e filtri.
4. Le regole vengono salvate sul backend solo se l'utente è autenticato.
5. In modalità anonima le regole vengono salvate nel browser.

## Decisioni architetturali chiave
- Monorepo npm workspaces per frontend e backend.
- Regole deterministiche e keyword curate prima di qualsiasi ML o fuzzy matching.
- SQLite locale per massimizzare semplicità e velocità di avvio.
- Fingerprint applicativo per evitare duplicati logici sugli import ripetuti.
- Login opzionale con sincronizzazione limitata alle regole, senza rendere obbligatorio l'accesso all'app.
- Storico movimenti non persistente per default, così il confronto tra dataset resta leggero e non sporca il database.
