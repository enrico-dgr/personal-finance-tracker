# API Contracts

Note trasversali:
- CORS: solo le origin elencate in `CORS_ORIGINS` ricevono gli header CORS (default `http://localhost:5173`).
- Rate limiting: signup e login accettano al massimo 20 richieste ogni 15 minuti per IP, poi rispondono `429`.
- I movimenti non sono persistiti: vivono nella sessione del browser. Non esiste alcun endpoint di lettura, modifica o cancellazione dello storico (ADR-0002, ADR-0003).

## GET /api/health
Risposta:
- `status`
- `timestamp`

## GET /api/categories
Risposta:
- `categories: string[]`

## GET /api/auth/me
Header richiesto:
- `Authorization: Bearer <token>`

Risposta:
- `user`

## POST /api/auth/signup
Body:
- `email`
- `password`
- `syncLocalRules[]`

Risposta:
- `user`
- `token`
- `rules[]`

## POST /api/auth/login
Body:
- `email`
- `password`
- `syncLocalRules[]`

Risposta:
- `user`
- `token`
- `rules[]`

## GET /api/rules
Query opzionale:
- `q`

Header opzionale:
- `Authorization: Bearer <token>`

Risposta:
- `rules: MerchantRule[]`

## GET /api/rules/defaults
Risposta:
- `rules: MerchantRule[]` con le regole di default esposte dal backend

## POST /api/upload
Content-Type:
- `multipart/form-data`

Campi:
- `file`
- `rules` JSON opzionale

Risposta:
- `importedRows`
- `createdCount`
- `updatedCount`
- `transactions[]`

Nota: l'upload e stateless. I movimenti classificati tornano nella risposta e non vengono salvati.

## POST /api/rules
Body:
- `pattern: string`
- `patternType?: contains | regex`
- `normalizedName: string`
- `category: string`
- `priority?: number`
- `isDisabled?: boolean`
- `id?` oppure `defaultRuleId?` per aggiornare una regola esistente

Header richiesto:
- `Authorization: Bearer <token>`

## DELETE /api/rules/:id
Risposta:
- `204 No Content`
