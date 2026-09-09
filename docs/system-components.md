# Componenti di Sistema

## Dashboard Web
Responsabilità:
- caricare file CSV
- mostrare KPI e insight
- consentire correzione manuale dei movimenti

Interfacce:
- chiama le API REST sotto `/api`

## API Service
Responsabilità:
- validare input HTTP
- importare e trasformare CSV
- gestire regole e statistiche
- orchestrare accesso a Prisma

Interfacce:
- REST JSON + multipart form data

## Motore di Classificazione
Responsabilità:
- rimuovere rumore dalle descrizioni bancarie
- applicare priorità di matching
- costruire fingerprint transazione

## Persistence Layer
Responsabilità:
- salvare transazioni e regole
- prevenire duplicati logici tramite fingerprint unico
