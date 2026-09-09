# Flussi

## Import CSV
1. Utente seleziona un file CSV dalla dashboard.
2. Frontend invia il file a `POST /api/upload` insieme alle regole attive.
3. Backend rileva delimitatore e colonne.
4. Ogni riga viene convertita in data, descrizione e importo.
5. La descrizione viene pulita e classificata.
6. I movimenti classificati tornano al frontend e restano solo nella sessione corrente.
7. Frontend aggiorna dashboard e tabella senza persistere lo storico.

## Correzione Manuale
1. Utente seleziona una o più righe dalla tabella tramite checkbox oppure clicca il merchant letto per aprire la modale.
2. La modale propone merchant normalizzato, categoria, pattern, tipo pattern e priorità della regola.
3. Il frontend mostra quante delle righe selezionate continuano a matchare la regola configurata.
4. Alla conferma, merchant e categoria vengono aggiornati su tutte le righe selezionate nel dataset di sessione.
5. Se richiesto, la regola viene salvata o aggiornata su account oppure nel browser locale.
6. Le future importazioni riusano la regola con la priorità definita.

## Login Opzionale
1. Utente apre il menu account nell'header oppure usa le CTA dalla dashboard.
2. Se anonimo viene portato alla pagina account dedicata con tab `Login` e `Sign up`.
3. Al primo accesso riuscito, le regole locali vengono sincronizzate verso l'account.
4. Le regole vengono poi lette dal backend su ogni dispositivo autenticato.
5. Lo storico movimenti resta comunque non persistente.

## Menu Utente
1. L'icona account nell'header apre un menu a tendina contestuale.
2. Se utente non è autenticato, il menu mostra `Sign in`, `Sign up` e continuazione anonima.
3. Se utente è autenticato, il menu mostra link a profilo, dashboard, libreria regole e logout.
4. Il profilo utente vive in una pagina separata dalla dashboard operativa.

## Reset Storico
1. Utente preme il tasto di azzeramento storico.
2. Frontend svuota il dataset di sessione e resetta selezioni, filtri tabella e filtri analytics del grafico grande.
3. Backend ripulisce anche eventuale storico legacy rimasto nel database locale.

## Filtri Movimenti
1. Utente filtra per ricerca testuale, mese, categoria o tipo movimento.
2. Frontend restringe la tabella senza ricaricare l'intera pagina.
3. La lista movimenti resta a altezza fissa e viene spezzata in pagine per evitare scroll verticale interno.
4. La selezione manuale può attraversare più pagine della tabella e resta indipendente dal focus sulla singola riga.

## Insight di Contenimento Spesa
1. Frontend calcola insight locali su categoria, merchant, andamento mensile e spesa discrezionale comprimibile.
2. Il blocco insight viene distribuito automaticamente su due colonne desktop e una colonna mobile.
3. L'obiettivo è mostrare dove il budget esce più spesso e quale quota può tornare rapidamente a liquidità disponibile.

## Grafico Analitico Spesa vs Risparmio
1. Frontend costruisce una serie mensile locale con spesa filtrata e risparmio netto del mese.
2. Utente può filtrare il grafico per uno o più merchant, una o più categorie e intervallo mesi tramite select ricercabili con debounce.
3. Il pannello mostra anche confronto mese corrente vs precedente per spesa selezionata e risparmio netto.
4. Il pannello evidenzia i merchant ricorrenti comprimibili presenti in almeno due mesi nel range selezionato.
5. La linea del risparmio netto viene sempre disegnata anche quando i filtri riducono le barre di spesa.
6. Il pannello si resetta automaticamente quando cambia il dataset importato o viene azzerato lo storico.

## Libreria Regole
1. Utente apre la schermata dedicata delle regole.
2. Può cercare l'insieme effettivo di regole, che include default rules e custom rules.
3. Può aprire una regola e modificarne pattern, tipo pattern, merchant, categoria e priorità.
4. Può creare una nuova regola da zero o partendo da un movimento selezionato.
5. Può eliminare una regola custom oppure disattivare una regola default con override utente.

## Generazione Statistiche
1. Frontend calcola KPI e trend direttamente sul dataset di sessione appena importato o corretto.
2. Nessun endpoint dedicato alle statistiche viene usato nel normale flusso operativo.
3. Spesa mensile, spesa per categoria, spesa per merchant, risparmio netto e conteggi si aggiornano localmente a ogni variazione del dataset.
