import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { config } from 'dotenv';

const MAX_LOOKUP_DEPTH = 6;

/**
 * npm workspace scripts run with the cwd set to `apps/api`, so `dotenv/config`
 * alone never finds the repository-root `.env`. Walk up from this module until
 * an `.env` shows up and load that one explicitly.
 */
function findEnvFile() {
  let currentDirectory = dirname(fileURLToPath(import.meta.url));

  for (let depth = 0; depth < MAX_LOOKUP_DEPTH; depth += 1) {
    const candidate = join(currentDirectory, '.env');

    if (existsSync(candidate)) {
      return candidate;
    }

    const parentDirectory = dirname(currentDirectory);

    if (parentDirectory === currentDirectory) {
      break;
    }

    currentDirectory = parentDirectory;
  }

  return undefined;
}

const envFilePath = findEnvFile();

config(envFilePath ? { path: envFilePath } : undefined);
