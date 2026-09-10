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

## ADR-0003 - Chiusura degli endpoint legacy sui movimenti
Data: 2026-09-09

Contesto:
- dopo ADR-0002 il backend continuava a esporre `GET /api/transactions`, `GET /api/stats` e `PATCH /api/transactions/:id` come stub vuoti mai chiamati dal frontend
- `DELETE /api/transactions` eseguiva un `deleteMany()` globale senza autenticazione, pur agendo su una tabella che non viene mai popolata
- il "reset storico" percepito dall'utente avviene già interamente nello stato del browser

Decisione:
- rimuovere i quattro endpoint dal backend e la chiamata di reset dal client HTTP
- mantenere per ora il modello Prisma `Transaction` nello schema, marcato come deprecato, per non forzare una migrazione distruttiva su un `dev.db` locale esistente

Motivazione:
- eliminare una superficie di scrittura distruttiva e non autenticata
- evitare che i contratti API descrivano funzionalità che non esistono più
- separare la pulizia del codice, reversibile, dalla rimozione dei dati, che non lo è

Trigger di revisione:
- alla prossima migrazione Prisma pianificata, droppare la tabella `Transaction` se nel frattempo non è servita
- se torna il bisogno di uno storico persistente, la tabella va ridisegnata insieme all'utente proprietario invece di riusare quella attuale

## ADR-0004 - Riclassificazione immediata dei movimenti dopo mutazione delle regole
Data: 2026-09-15

Contesto:
- creare, modificare o disattivare/cancellare una regola aggiornava solo lo stato locale delle regole, mai i movimenti già importati nella sessione
- per vedere il merchant/categoria corretti sui movimenti esistenti era necessario ri-importare il CSV

Decisione:
- introdurre `reclassifyTransactions(transactions, effectiveRules)` in `ruleLibrary.ts`: applica a ogni movimento la regola con priorità più alta che matcha, riusando la stessa logica di match (`doesRuleMatchTransaction`) usata per la preview
- richiamare questa funzione dopo ogni salvataggio di transazione con nuova regola, salvataggio regola e disattivazione/cancellazione regola in `App.tsx`, aggiornando lo stato `transactions` solo se `changedCount > 0`

Limite noto e accettato:
- disabilitare o cancellare una regola non fa tornare un movimento al suo fallback originale (nome pulito/categoria generica), perché quella logica di estrazione candidato vive solo lato API in fase di import. Il movimento mantiene l'ultima etichetta nota finché un'altra regola non lo matcha o l'utente non ri-importa il CSV

Motivazione:
- il comportamento atteso dall'utente è che una regola valga subito per tutta la sessione corrente, non solo per i nuovi import
- riusare la stessa funzione di match evita di duplicare la logica di priorità tra preview e riclassificazione effettiva

Trigger di revisione:
- se il limite noto (regola disattivata non torna al fallback) risulta fastidioso nell'uso reale, valutare di esporre lato API un endpoint di "ri-classificazione pura" richiamabile anche dal frontend senza un nuovo upload

## ADR-0005 - Spese fisse mensili con inclusione/esclusione manuale
Data: 2026-09-15

Contesto:
- serviva un modo per stimare le spese fisse mensili medie (incluse quelle bimestrali/trimestrali) senza dover leggere l'elenco completo dei movimenti, ma con controllo su quali voci compongono il totale

Decisione:
- rilevare automaticamente i merchant "spesa fissa" (`fixedExpenses.ts`) quando: almeno 2 occorrenze nella sessione, importo stabile (coefficiente di variazione ≤20%) e cadenza regolare (mensile, bimestrale o trimestrale, dedotta dai gap tra i mesi in cui compare il merchant)
- calcolare un `monthlyEquivalent` per normalizzare cadenze diverse da quella mensile (es. spesa bimestrale da 100€ → 50€/mese)
- mostrare solo le voci auto-rilevate o toccate da un override manuale, mai l'elenco completo dei movimenti; permettere di escludere una voce auto-rilevata o includerne una non rilevata tramite override persistiti in `localStorage`
- il totale mostrato è sempre accompagnato dall'elenco delle voci che lo compongono, mai un numero isolato

Motivazione:
- evitare falsi positivi (es. supermercato ricorrente ma con importo variabile) mantenendo comunque il controllo finale all'utente
- dare fiducia nel numero finale mostrando sempre da cosa è composto, coerente con la richiesta esplicita di non fidarsi di un totale opaco

Trigger di revisione:
- se la soglia di stabilità (20%) o di regolarità della cadenza si rivela troppo stretta/larga sui dati reali, va ricalibrata insieme all'utente

