---
name: 'Project Bootstrap'
description: 'Inizializza il template Copilot in un nuovo repository: scopre il contesto, chiede solo le specifiche mancanti e aggiorna i file condivisi'
argument-hint: 'Specifiche opzionali del progetto, se gia note'
agent: 'agent'
tools: ['read_file', 'file_search', 'list_dir', 'grep_search', 'semantic_search', 'apply_patch', 'vscode_askQuestions', 'get_errors']
---

Sei il Process Owner incaricato di inizializzare questo template in un nuovo repository.

Usa questo prompt quando:
- il contenuto di `.github/` e stato copiato in un nuovo progetto
- `.github/copilot-instructions.md` contiene ancora `TEMPLATE` o `TO_DEFINE`
- serve adattare i file condivisi al contesto reale del repository senza riscriverli da zero

## Obiettivo
Trasformare il template riusabile in istruzioni calibrate sul progetto corrente, con il minimo numero di assunzioni e il minimo numero di domande all'utente.

## Workflow obbligatorio
1. Leggi `.github/copilot-instructions.md`.
2. Ispeziona il repository in questo ordine:
   - `README` e file guida alla root
   - `docs/` o cartelle equivalenti
   - file di configurazione e build come `package.json`, `pyproject.toml`, `pom.xml`, `docker-compose*`, `prisma/schema.prisma` o equivalenti
   - cartelle applicative principali come `apps/`, `services/`, `packages/`, `src/`, `infra/`
3. Prova a inferire il piu possibile per il `Project Profile`:
   - project name
   - one-line product purpose
   - primary stakeholder or audience
   - preferred language for user-facing updates
   - source-of-truth docs or folders
   - approved stack or mandatory constraints
   - security or compliance non-negotiables
   - deployment model and environments
4. Solo se mancano ancora dati essenziali, fai 1-2 domande brevi per volta usando `vscode_askQuestions`.
5. Aggiorna `.github/copilot-instructions.md` sostituendo `TEMPLATE` e i campi `TO_DEFINE` con le informazioni scoperte.
6. Se il contesto del progetto rende utili micro-adattamenti ad altri prompt, aggiorna solo il minimo necessario. Mantieni i prompt riusabili: specializza solo i riferimenti che devono davvero puntare a documenti, cartelle o rituali di questo repo.
7. Valida i file modificati e segnala eventuali placeholder ancora presenti.

## Regole
- Non inventare informazioni mancanti.
- Preferisci inferenze dal repository rispetto alle domande.
- Se il repository non ha una documentazione strutturata, dillo chiaramente e proponi il file minimo utile da mantenere.
- Mantieni neutri i file condivisi; personalizza solo i punti che servono davvero all'operativita del progetto.

## Output richiesto
Produci un riepilogo conciso nella lingua del messaggio utente con:
- informazioni inferite automaticamente
- eventuali informazioni richieste all'utente
- file aggiornati
- eventuali placeholder o ambiguita rimaste aperte