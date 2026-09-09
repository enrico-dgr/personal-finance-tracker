# MVP Plan

## Level 1 - Base operativa locale
Obiettivo:
- import CSV
- normalizzazione base
- dashboard iniziale
- correzione manuale con salvataggio regole

Nota operativa:
- i movimenti restano in sessione
- le regole possono essere locali browser o sincronizzate con login opzionale

Stato:
- completato tecnicamente e validato su un CSV reale Mediolanum; da estendere ad altri mesi o varianti export

Exit criteria:
- utente importa un CSV reale
- il sistema salva movimenti e mostra insight base
- almeno una correzione manuale genera una regola persistente

## Level 2 - Accuratezza e usabilità
Obiettivo:
- filtri e ricerca movimenti
- libreria regole gestibile da UI
- migliore riconoscimento merchant italiani
- gestione duplicati più esplicita

Estensione attuale:
- login e sign-up opzionali per sincronizzare solo le regole
- reset storico senza impatto sulle regole
- dashboard con spesa per merchant e grafico full-width filtrabile che confronta spesa selezionata e risparmio netto mensile
- libreria regole effettiva con default rules visibili, editabili e disattivabili
- correzione manuale in modale multi-riga con preview del match residuo e priorità di regola

Stato:
- avviato

## Level 3 - Insight evoluti
Obiettivo:
- budget per categoria
- spese ricorrenti
- tagging avanzato
- connettori bancari o import multipli
