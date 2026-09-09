# Live Roadmap

## NOW
- Valutare le 13 vulnerabilità riportate da `npm audit` (1 critical) e decidere quali aggiornamenti sono sicuri.
- Validare parser e mapping su altri export reali Mediolanum o su mesi diversi dello stesso conto.
- Raffinare categorie e dizionario merchant italiani per supermercati, telco, utenze, carburante, fee, prelievi ed entrate.
- Rendere visibili in UI gli esiti dell'import con maggior dettaglio: nuovi, aggiornati, eventuali righe problematiche.
- Migliorare il fallback di normalizzazione per bonifici, addebiti diretti e descrizioni non riconosciute.
- Arricchire la nuova area account con metadati profilo, ultimo sync regole e azioni self-service essenziali.
- Misurare l'efficacia della nuova correzione multi-riga con preview match per capire dove servono ulteriori scorciatoie operative.
- Valutare un toggle chiaro tra barre mensili e linea cumulativa per la spesa selezionata, se serve una lettura più finanziaria del trend.

## NEXT
- Droppare la tabella `Transaction` alla prossima migrazione Prisma pianificata, se resta inutilizzata (ADR-0003).
- Rientrare sui 7 warning ESLint residui su effetti React, valutando caso per caso il rischio di regressione.
- Aggiungere metriche di match per regola e storico degli override default più usati.
- Introdurre preview dell'import prima del salvataggio definitivo.
- Gestire duplicati in modo esplicito con vista differenze e motivazione del merge.
- Separare insight per entrate, uscite e cashflow netto.
- Aggiungere tag manuali e note ai movimenti per analisi personali più fini.
- Valutare export/import delle sole regole per backup personale.

## LATER
- Budget per categoria.
- Spese ricorrenti.
- Multi-account.
- Integrazione con API bancarie o PSD2.
- Export dei dati puliti per analisi esterne.
- Snapshot mensili e trend rispetto al mese precedente.
- Possibile app mobile o PWA leggera.

## Switch Options
- Se SQLite diventa limitante per multiutente o sincronizzazione, passare a Postgres.
- Se le keyword non bastano per accuratezza, introdurre fuzzy matching controllato.
- Se la libreria regole cresce molto, introdurre versionamento e metriche di match per regola a livello storage.
