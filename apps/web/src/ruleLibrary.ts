import type { MerchantRule, RulePatternType, Transaction } from './api';

export type EffectiveMerchantRule = MerchantRule & {
	rawRuleId: string | null;
	source: 'default' | 'custom';
};

const DEFAULT_RULE_TIMESTAMP = '2000-01-01T00:00:00.000Z';
const DEFAULT_CUSTOM_PRIORITY = 1000;
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
	/\bNOTE\b/g,
];

function normalizeRule(rule: MerchantRule): MerchantRule {
	return {
		...rule,
		defaultRuleId: rule.defaultRuleId ?? null,
		priority: rule.priority ?? DEFAULT_CUSTOM_PRIORITY,
		isDisabled: Boolean(rule.isDisabled),
		source: rule.source ?? (rule.defaultRuleId ? 'default' : 'custom'),
	};
}

function compareRules(left: MerchantRule, right: MerchantRule) {
	return (
		(right.priority ?? 0) - (left.priority ?? 0) ||
		right.pattern.length - left.pattern.length ||
		left.normalizedName.localeCompare(right.normalizedName)
	);
}

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

function cleanBankDescription(value: string) {
	let result = sanitizeText(value);

	for (const pattern of noisePatterns) {
		result = result.replace(pattern, ' ');
	}

	result = result.replace(/\b\d+[A-Z]?\b/g, ' ');
	return result.replace(/\s+/g, ' ').trim();
}

export function buildEffectiveRuleLibrary(
	defaultRules: MerchantRule[],
	storedRules: MerchantRule[]
) {
	const defaultRuleMap = new Map<string, EffectiveMerchantRule>(
		defaultRules.map((rule) => {
			const normalizedRule = normalizeRule(rule);

			return [
				normalizedRule.id,
				{
					...normalizedRule,
					rawRuleId: null,
					source: 'default',
				},
			] as const;
		})
	);
	const customRules: EffectiveMerchantRule[] = [];

	for (const rawRule of storedRules.map(normalizeRule)) {
		if (rawRule.defaultRuleId) {
			if (rawRule.isDisabled) {
				defaultRuleMap.delete(rawRule.defaultRuleId);
				continue;
			}

			const defaultRule = defaultRuleMap.get(rawRule.defaultRuleId);
			defaultRuleMap.set(rawRule.defaultRuleId, {
				...(defaultRule ?? {
					id: rawRule.defaultRuleId,
					defaultRuleId: rawRule.defaultRuleId,
					pattern: rawRule.pattern,
					patternType: rawRule.patternType,
					normalizedName: rawRule.normalizedName,
					category: rawRule.category,
					priority: rawRule.priority,
					isDisabled: false,
					createdAt: DEFAULT_RULE_TIMESTAMP,
					updatedAt: DEFAULT_RULE_TIMESTAMP,
					rawRuleId: rawRule.id,
					source: 'default' as const,
				}),
				...rawRule,
				id: rawRule.defaultRuleId,
				defaultRuleId: rawRule.defaultRuleId,
				rawRuleId: rawRule.id,
				source: 'default',
				isDisabled: false,
			});
			continue;
		}

		if (rawRule.isDisabled) {
			continue;
		}

		customRules.push({
			...rawRule,
			rawRuleId: rawRule.id,
			source: 'custom',
		});
	}

	return [...customRules, ...defaultRuleMap.values()].sort(compareRules);
}

export function buildRulePayloadFromEffectiveRule(
	rule: EffectiveMerchantRule,
	overrides: Partial<MerchantRule> = {}
) {
	return {
		id: rule.rawRuleId ?? (rule.source === 'custom' ? rule.id : undefined),
		defaultRuleId:
			rule.source === 'default'
				? rule.defaultRuleId ?? rule.id
				: null,
		pattern: overrides.pattern ?? rule.pattern,
		patternType: (overrides.patternType ?? rule.patternType) as RulePatternType,
		normalizedName: overrides.normalizedName ?? rule.normalizedName,
		category: overrides.category ?? rule.category,
		priority: overrides.priority ?? rule.priority,
		isDisabled: overrides.isDisabled ?? rule.isDisabled,
	};
}

export function doesRuleMatchTransaction(
	rule: Pick<MerchantRule, 'pattern' | 'patternType'>,
	transaction: Pick<Transaction, 'originalDescription'>
) {
	const rawDescription = sanitizeText(transaction.originalDescription);
	const cleanedDescription = cleanBankDescription(transaction.originalDescription);

	if (rule.patternType === 'regex') {
		try {
			const regex = new RegExp(rule.pattern, 'i');
			return regex.test(rawDescription) || regex.test(cleanedDescription);
		} catch {
			return false;
		}
	}

	const sanitizedPattern = sanitizePattern(rule.pattern);
	if (!sanitizedPattern) {
		return false;
	}

	return (
		cleanedDescription.includes(sanitizedPattern) ||
		rawDescription.includes(sanitizedPattern)
	);
}

export function countMatchingTransactions(
	rule: Pick<MerchantRule, 'pattern' | 'patternType'>,
	transactions: Transaction[]
) {
	return transactions.filter((transaction) =>
		doesRuleMatchTransaction(rule, transaction)
	).length;
}