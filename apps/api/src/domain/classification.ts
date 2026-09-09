const DEFAULT_CATEGORY = 'Other';

export const DEFAULT_CATEGORIES = [
  'Food',
  'Dining',
  'Transport',
  'Travel',
  'Shopping',
  'Bills',
  'Insurance',
  'Home',
  'Health',
  'Entertainment',
  'Cash',
  'Fees',
  'Taxes',
  'Income',
  'Other'
] as const;

export type Category = (typeof DEFAULT_CATEGORIES)[number];
export type RulePatternType = 'contains' | 'regex';
export type RuleSource = 'default' | 'custom';

export type MerchantRuleMatcher = {
  id?: string;
  pattern: string;
  patternType: RulePatternType | string;
  normalizedName: string;
  category: string;
  priority?: number;
  defaultRuleId?: string | null;
  isDisabled?: boolean;
  source?: RuleSource | string;
  createdAt?: string;
  updatedAt?: string;
};

export type ClassificationResult = {
  cleanedDescription: string;
  normalizedDescription: string;
  category: string;
  matchSource: 'rule' | 'keyword' | 'fallback';
};

type KeywordRule = {
  keywords: string[];
  normalizedName: string;
  category: Category;
};

type MccRule = {
  code: string;
  normalizedName: string;
  category: Category;
};

const DEFAULT_RULE_PRIORITY_BASE = 100;
const CUSTOM_RULE_PRIORITY_DEFAULT = 1000;
const DEFAULT_RULE_TIMESTAMP = '2000-01-01T00:00:00.000Z';

const noisePatterns = [
  /\bPAGAMENTO POS\b/g,
  /\bPAGAMENTI\b/g,
  /\bPAGAMENTO\b/g,
  /\bPRELIEVI\b/g,
  /\bBANCOMAT\b/g,
  /\bPOS\b/g,
  /\bCONTACTLESS\b/g,
  /\bACQUISTO\b/g,
  /\bOPERAZIONE\b/g,
  /\bVISA\b/g,
  /\bMASTERCARD\b/g,
  /\bDEBITO\b/g,
  /\bCARTA\b/g,
  /\bESERCENTE\b/g,
  /\bTRANSACTION\b/g,
  /\bTRN\b/g,
  /\bSEPA\b/g,
  /\bEUROPEO\b/g,
  /\bCBILL\b/g,
  /\bPAGOPA\b/g,
  /\bPAESI UE\b/g,
  /\bVALUTA EUR\b/g,
  /\bPAESE ITALIA\b/g,
  /\bADDEBITO DIRETTO CORE RCUR PRG CAR\b/g,
  /\bDATA REGOLAMENTO\b/g,
  /\bVALUTA FISSA\b/g,
  /\bBANCA ORDINANTE\b/g,
  /\bBANCA DESTINATARIA\b/g,
  /\bDATA ORDINE\b/g,
  /\bCOOR BENEF\b/g,
  /\bVOSTRA DISPOSIZIONE A FAV\b/g,
  /\bA VS FAVORE\b/g,
  /\bBONIFICO DISPOSTO IN INTERNET\b/g,
  /\bCOD ID ORD\b/g,
  /\bID OPERAZIONE\b/g,
  /\bID ORDINANTE\b/g,
  /\bCRO\b/g,
  /\bNOTE\b/g
];

const stopwords = new Set([
  'SRL',
  'SPA',
  'SNC',
  'ITALIA',
  'ONLINE',
  'ROMA',
  'MILANO',
  'CATANIA',
  'NAPOLI',
  'TORINO',
  'FIRENZE',
  'PALERMO',
  'EU',
  'ACIREALE',
  'ROCCALUMERA',
  'TREMESTIERI',
  'GRAVINA',
  'GREGORIO',
  'SANTAGATA',
  'AUGUSTA',
  'LI',
  'CA'
]);

const trailingLocationTokens = new Set([
  'CATANIA',
  'ACIREALE',
  'PALERMO',
  'ROCCALUMERA',
  'TREMESTIERI',
  'GRAVINA',
  'SANTAGATA',
  'LI',
  'AUGUSTA',
  'CA',
  'SAN',
  'GREGORIO',
  'DI',
  'E'
]);

const keywordRules: KeywordRule[] = [
  { keywords: ['LIDL'], normalizedName: 'LIDL', category: 'Food' },
  { keywords: ['CONAD'], normalizedName: 'CONAD', category: 'Food' },
  { keywords: ['COOP'], normalizedName: 'COOP', category: 'Food' },
  { keywords: ['ESSELUNGA'], normalizedName: 'ESSELUNGA', category: 'Food' },
  { keywords: ['CARREFOUR'], normalizedName: 'CARREFOUR', category: 'Food' },
  { keywords: ['PENNY'], normalizedName: 'PENNY', category: 'Food' },
  { keywords: ['MD SPA', 'MD'], normalizedName: 'MD', category: 'Food' },
  { keywords: ['EUROSPIN'], normalizedName: 'EUROSPIN', category: 'Food' },
  { keywords: ['DESPAR', 'SUPERMERCATO DESPAR'], normalizedName: 'DESPAR', category: 'Food' },
  { keywords: ['SOCIETA AGRICOLA IL SO'], normalizedName: 'SOCIETA AGRICOLA IL SOLE', category: 'Food' },
  { keywords: ['TESTAI FRANCESCO'], normalizedName: 'TESTAI FRANCESCO', category: 'Food' },
  { keywords: ['MCDONALD'], normalizedName: 'MCDONALD', category: 'Dining' },
  { keywords: ['BURGER KING'], normalizedName: 'BURGER KING', category: 'Dining' },
  { keywords: ['JUST EAT'], normalizedName: 'JUST EAT', category: 'Dining' },
  { keywords: ['DELIVEROO'], normalizedName: 'DELIVEROO', category: 'Dining' },
  { keywords: ['GLOVO'], normalizedName: 'GLOVO', category: 'Dining' },
  { keywords: ['BAR '], normalizedName: 'BAR', category: 'Dining' },
  { keywords: ['BAR KENNEDY'], normalizedName: 'BAR KENNEDY', category: 'Dining' },
  { keywords: ['CAFFETTERIA QUARANTA'], normalizedName: 'CAFFETTERIA QUARANTA', category: 'Dining' },
  { keywords: ['SMUGGLER'], normalizedName: 'SMUGGLER', category: 'Dining' },
  { keywords: ['L ETOILE FOCACCERIA'], normalizedName: "L'ETOILE FOCACCERIA", category: 'Dining' },
  { keywords: ['A PUTIA DELL OSTELLO'], normalizedName: "A PUTIA DELL'OSTELLO", category: 'Dining' },
  { keywords: ['COFFEESTORE'], normalizedName: 'COFFEESTORE', category: 'Dining' },
  { keywords: ['AL PANE CONDITO'], normalizedName: 'AL PANE CONDITO', category: 'Dining' },
  { keywords: ['ZANGA'], normalizedName: 'ZANGA', category: 'Dining' },
  { keywords: ['EASY BISTROT'], normalizedName: 'EASY BISTROT', category: 'Dining' },
  { keywords: ['QUATTRO'], normalizedName: 'QUATTRO', category: 'Dining' },
  { keywords: ['RARO'], normalizedName: 'RARO', category: 'Dining' },
  { keywords: ['TRENITALIA'], normalizedName: 'TRENITALIA', category: 'Transport' },
  { keywords: ['ITALO'], normalizedName: 'ITALO', category: 'Transport' },
  { keywords: ['ATM MILANO', 'ATM'], normalizedName: 'ATM', category: 'Transport' },
  { keywords: ['TELEPASS'], normalizedName: 'TELEPASS', category: 'Transport' },
  { keywords: ['AUTOSTRADE'], normalizedName: 'AUTOSTRADE', category: 'Transport' },
  { keywords: ['ESSO'], normalizedName: 'ESSO', category: 'Transport' },
  { keywords: ['Q8'], normalizedName: 'Q8', category: 'Transport' },
  { keywords: ['ENI STATION', 'IPERAL', 'IP '], normalizedName: 'IP', category: 'Transport' },
  { keywords: ['UBER'], normalizedName: 'UBER', category: 'Transport' },
  { keywords: ['PETROL COMPANY'], normalizedName: 'PETROL COMPANY', category: 'Transport' },
  { keywords: ['AMTS CATANIA'], normalizedName: 'AMTS CATANIA', category: 'Transport' },
  { keywords: ['RYANAIR'], normalizedName: 'RYANAIR', category: 'Travel' },
  { keywords: ['EASYJET'], normalizedName: 'EASYJET', category: 'Travel' },
  { keywords: ['BOOKING'], normalizedName: 'BOOKING', category: 'Travel' },
  { keywords: ['AIRBNB'], normalizedName: 'AIRBNB', category: 'Travel' },
  { keywords: ['AMAZON'], normalizedName: 'AMAZON', category: 'Shopping' },
  { keywords: ['AMAZON PAYMENTS', 'AMZN MKTP IT'], normalizedName: 'AMAZON', category: 'Shopping' },
  { keywords: ['IKEA'], normalizedName: 'IKEA', category: 'Shopping' },
  { keywords: ['ZALANDO'], normalizedName: 'ZALANDO', category: 'Shopping' },
  { keywords: ['DECATHLON'], normalizedName: 'DECATHLON', category: 'Shopping' },
  { keywords: ['H&M', 'HM'], normalizedName: 'H&M', category: 'Shopping' },
  { keywords: ['NAIMA GRIFFE'], normalizedName: 'NAIMA GRIFFE', category: 'Shopping' },
  { keywords: ['ZHOU XIAO GAO'], normalizedName: 'ZHOU XIAO GAO', category: 'Shopping' },
  { keywords: ['LEROY MERLIN'], normalizedName: 'LEROY MERLIN', category: 'Home' },
  { keywords: ['BRICOMAN'], normalizedName: 'BRICOMAN', category: 'Home' },
  { keywords: ['MONDO CONVENIENZA'], normalizedName: 'MONDO CONVENIENZA', category: 'Home' },
  { keywords: ['ENEL'], normalizedName: 'ENEL', category: 'Bills' },
  { keywords: ['ENI PLENITUDE', 'PLENITUDE'], normalizedName: 'PLENITUDE', category: 'Bills' },
  { keywords: ['TIM'], normalizedName: 'TIM', category: 'Bills' },
  { keywords: ['VODAFONE'], normalizedName: 'VODAFONE', category: 'Bills' },
  { keywords: ['ILIAD'], normalizedName: 'ILIAD', category: 'Bills' },
  { keywords: ['WINDTRE'], normalizedName: 'WINDTRE', category: 'Bills' },
  { keywords: ['FASTWEB'], normalizedName: 'FASTWEB', category: 'Bills' },
  { keywords: ['ACQUEDOTTO', 'IDRICO'], normalizedName: 'SERVIZIO IDRICO', category: 'Bills' },
  { keywords: ['GAS'], normalizedName: 'FORNITURA GAS', category: 'Bills' },
  { keywords: ['FREELUCEGAS'], normalizedName: 'FREELUCEGAS', category: 'Bills' },
  { keywords: ['MEDIOBANCA PREMIER'], normalizedName: 'MEDIOBANCA PREMIER', category: 'Bills' },
  { keywords: ['PAYPAL EUROPE'], normalizedName: 'PAYPAL', category: 'Other' },
  { keywords: ['MEDIOLANUM VITA'], normalizedName: 'MEDIOLANUM VITA', category: 'Insurance' },
  { keywords: ['FARMACIA'], normalizedName: 'FARMACIA', category: 'Health' },
  { keywords: ['PARAFARMACIA'], normalizedName: 'PARAFARMACIA', category: 'Health' },
  { keywords: ['DOCTOR', 'MEDICAL', 'OSPEDALE'], normalizedName: 'SPESA MEDICA', category: 'Health' },
  { keywords: ['NETFLIX'], normalizedName: 'NETFLIX', category: 'Entertainment' },
  { keywords: ['SPOTIFY'], normalizedName: 'SPOTIFY', category: 'Entertainment' },
  { keywords: ['CINEMA'], normalizedName: 'CINEMA', category: 'Entertainment' },
  { keywords: ['CLOSEDFEST'], normalizedName: 'CLOSEDFEST', category: 'Entertainment' },
  { keywords: ['PAYPAL'], normalizedName: 'PAYPAL', category: 'Other' },
  { keywords: ['SATISPAY'], normalizedName: 'SATISPAY', category: 'Other' },
  { keywords: ['PRELIEVO', 'ATM PRELIEVO'], normalizedName: 'PRELIEVO CONTANTE', category: 'Cash' },
  { keywords: ['COMMISSIONE', 'CANONE', 'BOLLO'], normalizedName: 'ONERI BANCARI', category: 'Fees' },
  { keywords: ['F24', 'AGENZIA ENTRATE'], normalizedName: 'TRIBUTO', category: 'Taxes' },
  { keywords: ['STIPENDIO', 'BONIFICO STIPENDIO'], normalizedName: 'STIPENDIO', category: 'Income' },
  { keywords: ['RIMBORSO'], normalizedName: 'RIMBORSO', category: 'Income' }
];

const mccRules: MccRule[] = [
  { code: '6011', normalizedName: 'PRELIEVO CONTANTE', category: 'Cash' },
  { code: '5541', normalizedName: 'CARBURANTE', category: 'Transport' },
  { code: '5812', normalizedName: 'RISTORAZIONE', category: 'Dining' },
  { code: '5814', normalizedName: 'RISTORAZIONE', category: 'Dining' },
  { code: '4789', normalizedName: 'TRASPORTO LOCALE', category: 'Transport' },
  { code: '5310', normalizedName: 'SUPERMERCATO', category: 'Food' },
  { code: '5499', normalizedName: 'ALIMENTARI', category: 'Food' },
  { code: '5691', normalizedName: 'ABBIGLIAMENTO', category: 'Shopping' },
  { code: '5977', normalizedName: 'CURA PERSONALE', category: 'Shopping' },
  { code: '5943', normalizedName: 'TABACCHI', category: 'Other' },
  { code: '7929', normalizedName: 'EVENTI', category: 'Entertainment' }
];

function sanitizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function sanitizePattern(pattern: string) {
  return sanitizeText(pattern);
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildKeywordRegexPattern(keywords: string[]) {
  const sanitizedKeywords = keywords
    .map((keyword) => sanitizePattern(keyword))
    .filter(Boolean)
    .sort((left, right) => right.length - left.length)
    .map((keyword) => escapeRegex(keyword));

  return `\\b(?:${sanitizedKeywords.join('|')})\\b`;
}

function getDefaultRulePriority(keywords: string[]) {
  const longestKeyword = Math.max(
    ...keywords.map((keyword) => sanitizePattern(keyword).length),
    1
  );

  return DEFAULT_RULE_PRIORITY_BASE + longestKeyword;
}

function toDefaultRule(rule: KeywordRule, index: number): MerchantRuleMatcher {
  return {
    id: `default-rule-${index + 1}`,
    pattern: buildKeywordRegexPattern(rule.keywords),
    patternType: 'regex',
    normalizedName: rule.normalizedName,
    category: rule.category,
    priority: getDefaultRulePriority(rule.keywords),
    defaultRuleId: null,
    isDisabled: false,
    source: 'default',
    createdAt: DEFAULT_RULE_TIMESTAMP,
    updatedAt: DEFAULT_RULE_TIMESTAMP
  };
}

const defaultMerchantRules = keywordRules.map(toDefaultRule);

function normalizeRuleMatcher(rule: MerchantRuleMatcher): MerchantRuleMatcher {
  return {
    ...rule,
    priority:
      typeof rule.priority === 'number' && Number.isFinite(rule.priority)
        ? rule.priority
        : CUSTOM_RULE_PRIORITY_DEFAULT,
    defaultRuleId: rule.defaultRuleId ?? null,
    isDisabled: Boolean(rule.isDisabled),
    source:
      rule.source === 'default' || rule.defaultRuleId
        ? 'default'
        : 'custom'
  };
}

export function listDefaultMerchantRules() {
  return defaultMerchantRules.map((rule) => ({ ...rule }));
}

export function buildEffectiveRules(rules: MerchantRuleMatcher[] = []) {
  const defaultRulesById = new Map(
    listDefaultMerchantRules().map((rule) => [rule.id as string, rule])
  );
  const customRules: MerchantRuleMatcher[] = [];

  for (const rawRule of rules) {
    const rule = normalizeRuleMatcher(rawRule);

    if (rule.defaultRuleId) {
      const defaultRule = defaultRulesById.get(rule.defaultRuleId);

      if (rule.isDisabled) {
        defaultRulesById.delete(rule.defaultRuleId);
        continue;
      }

      defaultRulesById.set(rule.defaultRuleId, {
        ...(defaultRule ?? {
          id: rule.defaultRuleId,
          createdAt: DEFAULT_RULE_TIMESTAMP,
          updatedAt: DEFAULT_RULE_TIMESTAMP,
          source: 'default'
        }),
        ...rule,
        id: rule.defaultRuleId,
        defaultRuleId: rule.defaultRuleId,
        source: 'default',
        isDisabled: false
      });
      continue;
    }

    if (rule.isDisabled) {
      continue;
    }

    customRules.push({
      ...rule,
      source: 'custom'
    });
  }

  return [...customRules, ...defaultRulesById.values()].sort(
    (left, right) =>
      (right.priority ?? 0) - (left.priority ?? 0) ||
      right.pattern.length - left.pattern.length ||
      left.normalizedName.localeCompare(right.normalizedName)
  );
}

function extractMerchantCandidate(originalDescription: string) {
  const normalizedOriginal = originalDescription.replace(/\s+/g, ' ').trim().toUpperCase();
  const cardMerchantMatch = normalizedOriginal.match(
    /\bC\/O\s+(.+?)(?:\s+CARTA\b|\s+-\s+CIRCUITO\b|\s+COD\.?\s*MCC\b|$)/i
  );

  if (cardMerchantMatch) {
    const tokens = sanitizeText(cardMerchantMatch[1])
      .replace(/\bSUMUP\b/g, ' ')
      .split(' ')
      .filter(Boolean);

    while (tokens.length > 1 && trailingLocationTokens.has(tokens[tokens.length - 1])) {
      tokens.pop();
    }

    return tokens.join(' ').trim() || null;
  }

  const beneficiaryMatch = normalizedOriginal.match(
    /\b(?:A\s+VS\.?\s+FAVORE|A\s+FAV\.?|A\s+VS\.?\s+FAV\.?)(.+?)(?:\s+NOTE\b|\s+DATA\b|\s+COD\b|\s+BANCA\b|\s+CRO\b|\s+ID\b|\s+BONIFICO\b|$)/i
  );

  if (beneficiaryMatch) {
    return sanitizeText(beneficiaryMatch[1]).trim() || null;
  }

  return null;
}

export function cleanBankDescription(value: string) {
  let result = sanitizeText(value);

  for (const pattern of noisePatterns) {
    result = result.replace(pattern, ' ');
  }

  result = result.replace(/\b\d+[A-Z]?\b/g, ' ');

  return result.replace(/\s+/g, ' ').trim();
}

function findRuleMatch(
  cleanedDescription: string,
  rawDescription: string,
  rules: MerchantRuleMatcher[]
) {
  const sortedRules = [...rules].sort(
    (left, right) =>
      (right.priority ?? 0) - (left.priority ?? 0) ||
      right.pattern.length - left.pattern.length
  );

  for (const rule of sortedRules) {
    if (!rule.pattern.trim()) {
      continue;
    }

    if (rule.patternType === 'regex') {
      try {
        const regex = new RegExp(rule.pattern, 'i');
        if (regex.test(rawDescription) || regex.test(cleanedDescription)) {
          return rule;
        }
      } catch {
        continue;
      }
    }

    const sanitizedPattern = sanitizePattern(rule.pattern);
    if (!sanitizedPattern) {
      continue;
    }

    if (cleanedDescription.includes(sanitizedPattern) || rawDescription.includes(sanitizedPattern)) {
      return rule;
    }
  }

  return null;
}

function findMccMatch(rawDescription: string) {
  return mccRules.find((rule) => rawDescription.includes(`MCC ${rule.code}`));
}

function fallbackMerchant(cleanedDescription: string, merchantCandidate?: string | null) {
  if (merchantCandidate) {
    return merchantCandidate;
  }

  const tokens = cleanedDescription
    .split(' ')
    .filter(Boolean)
    .filter((token) => !stopwords.has(token));

  return tokens.slice(0, 2).join(' ') || 'UNCATEGORIZED';
}

export function classifyDescription(
  originalDescription: string,
  rules: MerchantRuleMatcher[] = []
): ClassificationResult {
  const rawDescription = sanitizeText(originalDescription);
  const cleanedDescription = cleanBankDescription(originalDescription);
  const merchantCandidate = extractMerchantCandidate(originalDescription);
  const effectiveRules = buildEffectiveRules(rules);

  const matchedRule = findRuleMatch(cleanedDescription, rawDescription, effectiveRules);
  if (matchedRule) {
    return {
      cleanedDescription,
      normalizedDescription: matchedRule.normalizedName,
      category: matchedRule.category,
      matchSource: matchedRule.source === 'default' ? 'keyword' : 'rule'
    };
  }

  const mccRule = findMccMatch(rawDescription);
  if (mccRule) {
    return {
      cleanedDescription,
      normalizedDescription: merchantCandidate ?? mccRule.normalizedName,
      category: mccRule.category,
      matchSource: 'keyword'
    };
  }

  return {
    cleanedDescription,
    normalizedDescription: fallbackMerchant(cleanedDescription, merchantCandidate),
    category: DEFAULT_CATEGORY,
    matchSource: 'fallback'
  };
}

export function buildFingerprint(input: {
  date: Date;
  originalDescription: string;
  amount: number;
}) {
  return [
    input.date.toISOString().slice(0, 10),
    input.amount.toFixed(2),
    sanitizeText(input.originalDescription)
  ].join('|');
}
