# Decisions

## ADR-0001 - Baseline MVP locale e deterministica
Data: 2026-04-28

Decisione:
- partire con monorepo npm workspaces
- usare React/Vite per UI
- usare Express/TypeScript per API
- usare SQLite con Prisma per persistenza locale
- implementare classificazione con priorità `merchant rule > keyword > fallback`

Motivazione:
- massimizzare velocità di avvio e facilità d'uso personale
- ridurre complessità iniziale
- rendere il sistema trasparente e correggibile

Trigger di revisione:
- crescita del volume dati
- bisogno di gestione regole più complessa
- accuratezza insufficiente su descrizioni reali

## ADR-0002 - Sync solo regole, storico movimenti effimero
Data: 2026-04-29

Decisione:
- mantenere lo storico movimenti solo nella sessione corrente del browser
- non persistere automaticamente i movimenti nel backend durante l'uso normale
- introdurre login opzionale soltanto per sincronizzare le regole tra dispositivi
- in modalità anonima salvare le regole nel browser locale

Motivazione:
- evitare accumulo involontario di dataset diversi nel database locale
- permettere confronto rapido tra storici diversi senza operazioni di pulizia manuale
- separare chiaramente la persistenza utile (regole) da quella non richiesta (storico)

Trigger di revisione:
- necessità futura di sincronizzare anche lo storico tra dispositivi
- richiesta di analisi longitudinali persistenti mese su mese
- esigenza di multiutente o accesso condiviso più robusto
