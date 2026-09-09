# API Contracts

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

## GET /api/transactions
Risposta:
- `transactions: Transaction[]`

## GET /api/stats
Risposta:
- `overview.totalTransactions`
- `overview.currentMonthSpend`
- `overview.ruleCount`
- `overview.referenceMonth`
- `monthlySpend[]`
- `categorySpend[]`

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

## DELETE /api/transactions
Risposta:
- `deletedCount`

## POST /api/rules
Body:
- `pattern: string`
- `patternType?: contains | regex`
- `normalizedName: string`
- `category: string`

Header richiesto:
- `Authorization: Bearer <token>`

## DELETE /api/rules/:id
Risposta:
- `204 No Content`
