# Requisiti

## Funzionali MVP
- Importare file CSV con almeno data, descrizione e importo.
- Gestire delimitatori `,` e `;`.
- Normalizzare descrizioni rumorose tipo `PAGAMENTO POS 1234 LIDL CATANIA`.
- Assegnare merchant e categoria con priorità: regola salvata, keyword note, fallback.
- Riconoscere anche casi comuni italiani come stipendio, utenze telco, fee bancarie, prelievi e alcuni merchant retail/trasporto.
- Mantenere i movimenti solo nella sessione corrente del browser, senza persistenza automatica dello storico.
- Mostrare dashboard con:
  - totale movimenti
  - spesa del mese di riferimento
  - ripartizione per categoria
  - andamento mensile
  - spesa per merchant
  - confronto mensile full-width tra spesa filtrata e risparmio netto
  - confronto esplicito mese corrente vs mese precedente nel pannello analytics
  - evidenza dei merchant ricorrenti comprimibili nel range selezionato
  - lista movimenti
- Permettere filtri per mese, categoria, tipo movimento e ricerca testuale.
- Permettere filtri analytics dedicati per merchant, categoria e intervallo mesi nel grafico di confronto.
- Permettere selezione multi-filtro nel grafico tramite select ricercabili con debounce.
- Permettere correzione manuale di merchant e categoria tramite modale dedicata.
- Permettere selezione multi-riga nella tabella movimenti e applicazione della stessa correzione a più righe.
- Permettere il salvataggio di una regola riutilizzabile durante la correzione con preview del match residuo sulle righe selezionate.
- Offrire una vista dedicata alla libreria regole per creare, aggiornare, modificare pattern/tipo/priorità e cancellare o disattivare regole.
- Rendere visibili anche le regole di default, con possibilità di override e disattivazione per utente.
- Offrire login e sign-up opzionali per sincronizzare solo le regole tra dispositivi.
- In assenza di login, salvare le regole nel browser locale.
- Offrire un tasto di azzeramento dello storico che non tocchi le regole.

## Non funzionali MVP
- Setup locale semplice.
- Nessuna dipendenza cloud obbligatoria.
- Modello dati estendibile a regole più sofisticate.
- Motore regole con priorità esplicita quando più pattern matchano la stessa riga.
- UI leggibile da desktop e mobile.
