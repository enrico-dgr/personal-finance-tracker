import 'dotenv/config';
import postgres, { PostgresClient } from '@prisma/orm-postgres/runtime';
import type { Contract } from './contract.js';
import contractJson from './contract.json' with { type: 'json' };

export const db: PostgresClient<Contract> = postgres<Contract>({
  contractJson,
  url: process.env['DATABASE_URL']!,
});
