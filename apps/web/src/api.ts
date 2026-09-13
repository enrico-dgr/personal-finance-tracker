export type Transaction = {
  id: string;
  date: string;
  originalDescription: string;
  normalizedDescription: string;
  amount: number;
  category: string;
  createdAt: string;
  updatedAt: string;
};

export type RulePatternType = 'contains' | 'regex';
export type RuleSource = 'default' | 'custom';

export type MerchantRule = {
  id: string;
  defaultRuleId: string | null;
  pattern: string;
  patternType: RulePatternType;
  normalizedName: string;
  category: string;
  priority: number;
  isDisabled: boolean;
  source?: RuleSource;
  createdAt: string;
  updatedAt: string;
};

export type StatsResponse = {
  overview: {
    totalTransactions: number;
    currentMonthSpend: number;
    ruleCount: number;
    referenceMonth: string;
  };
  monthlySpend: Array<{
    month: string;
    total: number;
  }>;
  categorySpend: Array<{
    category: string;
    total: number;
  }>;
  merchantSpend: Array<{
    merchant: string;
    total: number;
    count: number;
  }>;
  savingsPlan: {
    discretionaryTotal: number;
    shareOfMonth: number;
    scenario15: number;
    scenario30: number;
    categories: Array<{
      category: string;
      total: number;
    }>;
  };
};

export type AppData = {
  categories: string[];
};

export type AuthUser = {
  id: string;
  email: string;
  createdAt: string;
};

export type AuthPayload = {
  email: string;
  password: string;
  syncLocalRules: MerchantRule[];
};

export type RulePayload = {
  id?: string;
  defaultRuleId?: string | null;
  pattern: string;
  patternType: RulePatternType;
  normalizedName: string;
  category: string;
  priority: number;
  isDisabled?: boolean;
};

type UploadResponse = {
  importedRows: number;
  createdCount: number;
  updatedCount: number;
  transactions: Transaction[];
};

type AuthResponse = {
  user: AuthUser;
  token: string;
  rules: MerchantRule[];
};

const buildUrl = (path: string) => {
  const baseUrl = import.meta.env.VITE_API_URL ?? '';
  return `${baseUrl}${path}`;
};

async function fetchJson<T>(input: string, init?: RequestInit, authToken?: string): Promise<T> {
  const headers = new Headers(init?.headers);

  if (authToken) {
    headers.set('Authorization', `Bearer ${authToken}`);
  }

  const response = await fetch((buildUrl(input)), {
    ...init,
    headers
  });
  const payload = (await response.json().catch(() => null)) as { message?: string } | null;

  if (!response.ok) {
    throw new Error(payload?.message ?? 'Richiesta non riuscita.');
  }

  return payload as T;
}

async function fetchVoid(input: string, init?: RequestInit, authToken?: string) {
  const headers = new Headers(init?.headers);

  if (authToken) {
    headers.set('Authorization', `Bearer ${authToken}`);
  }

  const response = await fetch(buildUrl(input), {
    ...init,
    headers
  });
  const payload = (await response.json().catch(() => null)) as { message?: string } | null;

  if (!response.ok) {
    throw new Error(payload?.message ?? 'Richiesta non riuscita.');
  }
}

export function loadCategories() {
  return fetchJson<AppData>('/api/categories');
}

export function uploadCsv(file: File, rules: MerchantRule[]) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('rules', JSON.stringify(rules));

  return fetchJson<UploadResponse>('/api/upload', {
    method: 'POST',
    body: formData
  });
}

export function signUp(payload: AuthPayload) {
  return fetchJson<AuthResponse>('/api/auth/signup', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
}

export function login(payload: AuthPayload) {
  return fetchJson<AuthResponse>('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
}

export function loadCurrentUser(authToken: string) {
  return fetchJson<{ user: AuthUser }>('/api/auth/me', undefined, authToken);
}

export function loadRules(authToken: string, search = '') {
  const query = search.trim();
  const querySuffix = query ? `?q=${encodeURIComponent(query)}` : '';

  return fetchJson<{ rules: MerchantRule[] }>(`/api/rules${querySuffix}`, undefined, authToken);
}

export function loadDefaultRules() {
  return fetchJson<{ rules: MerchantRule[] }>('/api/rules/defaults');
}

export function saveRule(authToken: string, payload: RulePayload) {
  return fetchJson<{ rule: MerchantRule }>('/api/rules', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  }, authToken);
}

export function removeRule(authToken: string, id: string) {
  return fetchVoid(`/api/rules/${id}`, {
    method: 'DELETE'
  }, authToken);
}
