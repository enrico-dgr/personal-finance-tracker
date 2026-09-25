# 💰 Personal Finance Tracker (Italy-friendly, Mediolanum compatible)

## ✅ Current Status

First working MVP slice is now in the repository:

* React dashboard connected to the backend
* Express API with stateless CSV upload, optional auth and synced rules
* SQLite database via Prisma
* Deterministic normalization engine with broader Italy-friendly merchant coverage
* Supporto verificato per export Mediolanum con preambolo iniziale e colonne separate `Uscite` / `Entrate`
* Merchant rule persistence plus dedicated rule library screen
* Login/sign-up opzionali per sincronizzare le regole tra dispositivi
* Filtri per month, category, text search e income/expense split
* Storico movimenti solo nella sessione corrente, con tasto di reset dedicato
* Example CSV available in `examples/sample-mediolanum.csv`
* Consolidamento: repository versionato, `AUTH_SECRET` obbligatorio, CORS ristretto, rate limiting su signup/login, ESLint + CI, test unitari su API e frontend

## ▶️ Local Run

```bash
npm install
cp .env.example .env
```

Genera poi un `AUTH_SECRET` reale e scrivilo nel `.env` (l'API non parte senza):

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Il `.env` deve restare nella root del repository: viene caricato risalendo le cartelle, anche quando gli script girano dentro `apps/api`.

```bash
npm run db:push
npm run db:seed
npm run dev
```

Useful commands:

```bash
npm run build       # build api + web
npm run lint        # ESLint sull'intero monorepo
npm test            # test api + web
npm run test:api
npm run test:web
```

Le stesse verifiche girano in CI (`.github/workflows/ci.yml`) su push e pull request.

## Sito pubblico e indicizzazione

La pagina pubblica e disponibile su `/`; l'applicazione e su `/app/` e non viene indicizzata. I vecchi link `/#/dashboard`, `/#/rules` e `/#/auth/...` vengono reindirizzati alla nuova posizione dell'app.

Nel deploy Netlify di produzione la build usa la variabile `URL` del sito per generare canonical, immagine Open Graph, `robots.txt` e una sitemap con la sola homepage. Se usi un dominio personalizzato diverso dall'URL principale di Netlify, imposta `SITE_URL` con l'origine pubblica desiderata (per esempio `https://tuodominio.it`). Le deploy preview ricevono `noindex`; la sitemap viene generata solo in produzione.

Dopo il deploy, verifica il dominio in Google Search Console e invia `/sitemap.xml`. Le pagine dell'app, incluse quelle di login, non vanno aggiunte alla sitemap.

Project docs live under `docs/`. I contratti API effettivi sono in `docs/api-contracts.md`; le sezioni di specifica più sotto descrivono la visione iniziale del prodotto e non l'implementazione corrente.

## 🎯 Goal

Build a personal finance tracking web application that:

* Imports transaction data (CSV export from Mediolanum or similar banks)
* Cleans and normalizes messy transaction descriptions (e.g. POS payments)
* Automatically categorizes expenses
* Allows manual overrides that improve future classification
* Provides a simple dashboard with spending insights

---

## 🧱 Tech Stack

* Frontend: React + TypeScript (Vite)
* Backend: Node.js + Express
* Database: SQLite (via Prisma ORM)
* Optional: Python microservice for advanced data processing (pandas)

---

## 📦 Core Features

### 1. Transaction Import

* Upload CSV file (Mediolanum format)
* Parse fields:

  * date
  * description
  * amount
* Store raw transaction data in DB

---

### 2. Transaction Normalization

Create a normalization pipeline:

* Remove noise patterns:

  * "PAGAMENTO POS"
  * numeric codes
* Extract merchant name using:

  * regex rules
  * keyword matching

Example:
"PAGAMENTO POS 1234 LIDL 0456" → "LIDL"

---

### 3. Merchant Mapping System

* Table: `merchant_rules`

  * id
  * pattern (string or regex)
  * normalized_name
  * category

* When a transaction matches a rule:
  → apply normalized name + category

* Allow user to:

  * edit merchant name
  * assign category
  * save as new rule

---

### 4. Categorization Engine

Default categories:

* Food
* Transport
* Shopping
* Bills
* Entertainment
* Other

Logic:

1. Try rule-based match
2. Fallback to keyword detection
3. Default to "Other"

---

### 5. Dashboard

* Monthly spending overview
* Spending by category (pie chart)
* Transaction list with:

  * original description
  * cleaned name
  * category
  * amount

---

### 6. Manual Overrides (Key Feature)

* User edits a transaction:

  * rename merchant
  * change category

* System:
  → saves rule for future matches

---

## 🗄️ Database Schema (Prisma)

### Transaction

* id
* date
* originalDescription
* normalizedDescription
* amount
* category
* createdAt

### MerchantRule

* id
* pattern
* normalizedName
* category
* createdAt

---

## ⚙️ API Endpoints

Specifica originale (non allineata all'implementazione, vedi `docs/api-contracts.md`):

* POST /upload
* GET /transactions
* PATCH /transactions/:id
* GET /stats
* POST /rules

---

## 🧠 Smart Enhancements (Optional)

* Fuzzy matching (Levenshtein distance)
* Merchant clustering
* Recurring expense detection
* Budget limits per category

---

## 🧪 Example Input

CSV row:
Date,Description,Amount
2026-04-20,"PAGAMENTO POS 1234 LIDL CATANIA",-45.20

Output:

* merchant: LIDL
* category: Food

---

## 🚀 MVP Scope

Focus on:

* CSV import
* basic normalization
* rule system
* simple dashboard

---

## 🧩 Future Ideas

* Bank API integration (PSD2)
* Mobile app version
* AI-based categorization
* Multi-account support

---

## 🧠 Design Principles

* Keep logic deterministic first (rules > AI)
* Make system learn from user edits
* Optimize for messy real-world bank data (Italy-specific)

---
