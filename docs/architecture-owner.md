# Architettura per Product Owner

## Come funziona
1. Carichi il CSV della banca dal browser.
2. Il backend legge ogni riga e pulisce la descrizione.
3. Il sistema prova a riconoscere merchant e categoria usando le regole attive.
4. Lo storico resta nella sessione corrente e non viene archiviato automaticamente.
5. La dashboard mostra spesa, categorie, merchant, risparmio mensile e storico del dataset corrente.
6. Se correggi un movimento, puoi salvare anche una regola per il futuro.
7. Se fai login, le regole si sincronizzano sul tuo account; se resti anonimo, restano nel browser.

## Componenti principali
- Web dashboard React: upload, tabella movimenti, editing manuale e grafici di analisi spesa/risparmio.
- API Node/Express: import stateless, autenticazione opzionale e sync regole.
- SQLite + Prisma: utenti e regole sincronizzate.

## Stato attuale
È disponibile una vertical slice funzionante per import CSV, dashboard con analytics di spesa/risparmio, filtri, libreria regole, reset storico e login opzionale per sincronizzare le regole.
