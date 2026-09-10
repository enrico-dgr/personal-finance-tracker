import {
	type FormEvent,
	useEffect,
	useRef,
	useState,
	useTransition,
} from 'react';

import {
	loadCategories,
	loadCurrentUser,
	loadDefaultRules,
	loadRules,
	login,
	removeRule,
	saveRule,
	signUp,
	uploadCsv,
	type AppData,
	type AuthPayload,
	type AuthUser,
	type MerchantRule,
	type RulePatternType,
	type RulePayload,
	type Transaction,
} from './api';
import {
	clearStoredAuthToken,
	loadFixedExpenseOverrides,
	loadLocalRules,
	loadStoredAuthToken,
	saveFixedExpenseOverrides,
	saveLocalRules,
	saveStoredAuthToken,
} from './browserStorage';
import {
	buildChartScale,
	buildLiquidityChartSeries,
	buildMerchantFilterOptions,
	buildRecurringMerchantInsights,
	buildPolylineCoordinates,
	getChartPadding,
	getChartX,
	getChartY,
} from './dashboardAnalytics';
import {
	buildFixedExpenseCandidates,
	summarizeFixedExpenses,
	type FixedExpenseOverrideState,
} from './fixedExpenses';
import {
	buildEffectiveRuleLibrary,
	buildRulePayloadFromEffectiveRule,
	countMatchingTransactions,
	reclassifyTransactions,
	type EffectiveMerchantRule,
} from './ruleLibrary';
import { buildSessionStats } from './sessionStats';

import { SearchableMultiSelect } from './components/SearchableMultiSelect';
import {
	describeFixedExpenseCadence,
	describeMonthComparison,
	formatAmount,
	formatDate,
	formatFilterSummary,
	formatMonth,
	formatSelectSummary,
} from './formatters';
import {
	buildHashRoute,
	readHashRoute,
	type AuthMode,
	type PageMode,
} from './routing';
import { buildLocalRule, mergeRuleCollection } from './ruleState';
import { buildPaginationItems, toggleSelection } from './uiHelpers';

type AmountFilter = 'all' | 'expenses' | 'income';

const ALL_FILTER_VALUE = '__all__';
const TRANSACTIONS_PER_PAGE = 12;
const TREND_CHART_WIDTH = 420;
const TREND_CHART_HEIGHT = 170;
const LIQUIDITY_CHART_WIDTH = 1040;
const LIQUIDITY_CHART_HEIGHT = 320;

export default function App() {
	const initialRoute = readHashRoute();
	const [categories, setCategories] = useState<AppData['categories']>([
		'Other',
	]);
	const [defaultRules, setDefaultRules] = useState<MerchantRule[]>([]);
	const [transactions, setTransactions] = useState<Transaction[]>([]);
	const [rules, setRules] = useState<MerchantRule[]>(() => loadLocalRules());
	const [authUser, setAuthUser] = useState<AuthUser | null>(null);
	const [authToken, setAuthToken] = useState<string | null>(() =>
		loadStoredAuthToken()
	);
	const [isBootstrapping, setIsBootstrapping] = useState(true);
	const [authMode, setAuthMode] = useState<AuthMode>(initialRoute.authMode);
	const [authEmail, setAuthEmail] = useState('');
	const [authPassword, setAuthPassword] = useState('');
	const [activePage, setActivePage] = useState<PageMode>(initialRoute.page);
	const [selectedTransactionId, setSelectedTransactionId] = useState<
		string | null
	>(null);
	const [normalizedDescription, setNormalizedDescription] = useState('');
	const [category, setCategory] = useState('Other');
	const [rulePattern, setRulePattern] = useState('');
	const [rulePatternType, setRulePatternType] =
		useState<RulePatternType>('contains');
	const [rulePriority, setRulePriority] = useState(1000);
	const [saveAsRule, setSaveAsRule] = useState(true);
	const [transactionSearch, setTransactionSearch] = useState('');
	const [transactionMonthFilter, setTransactionMonthFilter] =
		useState(ALL_FILTER_VALUE);
	const [transactionCategoryFilter, setTransactionCategoryFilter] =
		useState(ALL_FILTER_VALUE);
	const [amountFilter, setAmountFilter] = useState<AmountFilter>('all');
	const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);
	const [ruleSearch, setRuleSearch] = useState('');
	const [ruleEditorPattern, setRuleEditorPattern] = useState('');
	const [ruleEditorPatternType, setRuleEditorPatternType] =
		useState<RulePatternType>('contains');
	const [ruleEditorName, setRuleEditorName] = useState('');
	const [ruleEditorCategory, setRuleEditorCategory] = useState('Other');
	const [ruleEditorPriority, setRuleEditorPriority] = useState(1000);
	const [uploadFile, setUploadFile] = useState<File | null>(null);
	const [fileInputKey, setFileInputKey] = useState(0);
	const [statusMessage, setStatusMessage] = useState('');
	const [errorMessage, setErrorMessage] = useState('');
	const [isUploading, setIsUploading] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [isRuleSaving, setIsRuleSaving] = useState(false);
	const [isRuleDeleting, setIsRuleDeleting] = useState(false);
	const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);
	const [isResettingHistory, setIsResettingHistory] = useState(false);
	const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
	const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
	const [currentTransactionPage, setCurrentTransactionPage] = useState(1);
	const [selectedTransactionIds, setSelectedTransactionIds] = useState<
		string[]
	>([]);
	const [selectedAnalyticsMerchants, setSelectedAnalyticsMerchants] = useState<
		string[]
	>([]);
	const [selectedAnalyticsCategories, setSelectedAnalyticsCategories] =
		useState<string[]>([]);
	const [analyticsStartMonth, setAnalyticsStartMonth] = useState('');
	const [analyticsEndMonth, setAnalyticsEndMonth] = useState('');
	const [analyticsFilterResetVersion, setAnalyticsFilterResetVersion] =
		useState(0);
	const [fixedExpenseOverrides, setFixedExpenseOverrides] = useState<
		Record<string, FixedExpenseOverrideState>
	>(() => loadFixedExpenseOverrides());
	const [fixedExpenseAddSelection, setFixedExpenseAddSelection] = useState('');
	const [isPending, startTransition] = useTransition();
	const userMenuRef = useRef<HTMLDivElement | null>(null);

	const isAuthenticated = Boolean(authUser && authToken);
	const isRestoringSession = isBootstrapping && Boolean(authToken);
	const isAuthPage = activePage === 'auth';
	const effectiveRules = buildEffectiveRuleLibrary(defaultRules, rules);
	const stats = buildSessionStats(transactions, effectiveRules.length);
	const fixedExpenseCandidates = buildFixedExpenseCandidates(transactions);
	const fixedExpensesSummary = summarizeFixedExpenses(
		fixedExpenseCandidates,
		fixedExpenseOverrides
	);
	const chartPadding = getChartPadding();
	const monthOptions = [
		...new Set(transactions.map((transaction) => transaction.date.slice(0, 7))),
	].sort((leftMonth, rightMonth) => rightMonth.localeCompare(leftMonth));
	const analyticsMonthOptions = [...monthOptions].reverse();
	const merchantFilterOptions = buildMerchantFilterOptions(transactions);
	const merchantSelectOptions = merchantFilterOptions.map((option) => ({
		value: option.merchant,
		label: option.merchant,
		helperText: `${formatAmount(option.total)} • ${option.count} mov.`,
		searchText: option.merchant,
	}));
	const categorySelectOptions = categories.map((categoryOption) => ({
		value: categoryOption,
		label: categoryOption,
	}));
	const filteredTransactions = transactions.filter((transaction) => {
		const search = transactionSearch.trim().toLowerCase();
		const matchesSearch =
			search.length === 0 ||
			[
				transaction.originalDescription,
				transaction.normalizedDescription,
				transaction.category,
			]
				.join(' ')
				.toLowerCase()
				.includes(search);
		const matchesMonth =
			transactionMonthFilter === ALL_FILTER_VALUE ||
			transaction.date.slice(0, 7) === transactionMonthFilter;
		const matchesCategory =
			transactionCategoryFilter === ALL_FILTER_VALUE ||
			transaction.category === transactionCategoryFilter;
		const matchesAmount =
			amountFilter === 'all' ||
			(amountFilter === 'expenses'
				? transaction.amount < 0
				: transaction.amount > 0);

		return matchesSearch && matchesMonth && matchesCategory && matchesAmount;
	});
	const filteredRules = effectiveRules.filter((rule) => {
		const search = ruleSearch.trim().toLowerCase();

		return (
			search.length === 0 ||
			[rule.pattern, rule.normalizedName, rule.category, rule.patternType]
				.join(' ')
				.toLowerCase()
				.includes(search)
		);
	});
	const selectedRule =
		effectiveRules.find((rule) => rule.id === selectedRuleId) ?? null;
	const totalTransactionPages = Math.max(
		1,
		Math.ceil(filteredTransactions.length / TRANSACTIONS_PER_PAGE)
	);
	const paginatedTransactions = filteredTransactions.slice(
		(currentTransactionPage - 1) * TRANSACTIONS_PER_PAGE,
		currentTransactionPage * TRANSACTIONS_PER_PAGE
	);
	const selectedTransaction =
		paginatedTransactions.find(
			(transaction) => transaction.id === selectedTransactionId
		) ?? null;
	const selectedTransactions = transactions.filter((transaction) =>
		selectedTransactionIds.includes(transaction.id)
	);
	const allVisibleTransactionsSelected =
		paginatedTransactions.length > 0 &&
		paginatedTransactions.every((transaction) =>
			selectedTransactionIds.includes(transaction.id)
		);
	const manualRulePreviewCount = saveAsRule
		? countMatchingTransactions(
				{
					pattern: rulePattern.trim() || normalizedDescription.trim(),
					patternType: rulePatternType,
				},
				selectedTransactions
		  )
		: 0;
	const monthlySpend = stats.monthlySpend;
	const monthlySpendValues = monthlySpend.map((item) => item.total);
	const monthlyTrendScale = buildChartScale(
		monthlySpendValues.length ? monthlySpendValues : [0],
		4
	);
	const monthlyTrendChartPoints = buildPolylineCoordinates(
		monthlySpendValues,
		monthlyTrendScale,
		TREND_CHART_WIDTH,
		TREND_CHART_HEIGHT
	);
	const analyticsRangeStart =
		analyticsStartMonth || analyticsMonthOptions[0] || '';
	const analyticsRangeEnd =
		analyticsEndMonth || analyticsMonthOptions.at(-1) || '';
	const liquidityChartSeries = buildLiquidityChartSeries({
		transactions,
		startMonth: analyticsRangeStart,
		endMonth: analyticsRangeEnd,
		selectedMerchants: selectedAnalyticsMerchants,
		selectedCategories: selectedAnalyticsCategories,
	});
	const liquidityChartValues = liquidityChartSeries.flatMap((point) => [
		point.savings,
		point.filteredSpend,
	]);
	const liquidityChartScale = buildChartScale(
		liquidityChartValues.length ? liquidityChartValues : [0],
		5
	);
	const liquiditySavingsPoints = buildPolylineCoordinates(
		liquidityChartSeries.map((point) => point.savings),
		liquidityChartScale,
		LIQUIDITY_CHART_WIDTH,
		LIQUIDITY_CHART_HEIGHT
	);
	const liquidityZeroY = getChartY(
		0,
		liquidityChartScale,
		LIQUIDITY_CHART_HEIGHT
	);
	const liquidityFilteredSpendTotal = Number(
		liquidityChartSeries
			.reduce((total, point) => total + Math.abs(point.filteredSpend), 0)
			.toFixed(2)
	);
	const liquidityAverageSavings = liquidityChartSeries.length
		? Number(
				(
					liquidityChartSeries.reduce(
						(total, point) => total + point.savings,
						0
					) / liquidityChartSeries.length
				).toFixed(2)
		  )
		: 0;
	const positiveSavingsMonths = liquidityChartSeries.filter(
		(point) => point.savings > 0
	).length;
	const recurringMerchantInsights = buildRecurringMerchantInsights({
		transactions,
		startMonth: analyticsRangeStart,
		endMonth: analyticsRangeEnd,
		selectedMerchants: selectedAnalyticsMerchants,
		selectedCategories: selectedAnalyticsCategories,
	});
	const currentLiquidityMonth = liquidityChartSeries.at(-1) ?? null;
	const previousLiquidityMonth = liquidityChartSeries.at(-2) ?? null;
	const currentSelectedSpend = Math.abs(
		currentLiquidityMonth?.filteredSpend ?? 0
	);
	const previousSelectedSpend = Math.abs(
		previousLiquidityMonth?.filteredSpend ?? 0
	);
	const selectedSpendDelta =
		currentLiquidityMonth && previousLiquidityMonth
			? Number((currentSelectedSpend - previousSelectedSpend).toFixed(2))
			: null;
	const savingsDelta =
		currentLiquidityMonth && previousLiquidityMonth
			? Number(
					(
						currentLiquidityMonth.savings - previousLiquidityMonth.savings
					).toFixed(2)
			  )
			: null;
	const liquidityFilterSummary = [
		formatFilterSummary(
			selectedAnalyticsMerchants.length,
			'merchant',
			'merchant',
			'tutti i merchant'
		),
		formatFilterSummary(
			selectedAnalyticsCategories.length,
			'categoria',
			'categorie',
			'tutte le categorie'
		),
		analyticsRangeStart && analyticsRangeEnd
			? `${formatMonth(analyticsRangeStart)} - ${formatMonth(
					analyticsRangeEnd
			  )}`
			: 'intero periodo',
	].join(' • ');
	const previousMonthSpend = monthlySpend.at(-2)?.total ?? null;
	const currentMonthDelta =
		previousMonthSpend === null
			? null
			: stats.overview.currentMonthSpend - previousMonthSpend;
	const currentMonthDeltaPercentage =
		previousMonthSpend && previousMonthSpend > 0
			? Number(
					(
						(Math.abs(currentMonthDelta ?? 0) / previousMonthSpend) *
						100
					).toFixed(1)
			  )
			: null;
	const paginationItems = buildPaginationItems(
		currentTransactionPage,
		totalTransactionPages
	);
	const firstVisibleRow = filteredTransactions.length
		? (currentTransactionPage - 1) * TRANSACTIONS_PER_PAGE + 1
		: 0;
	const lastVisibleRow = Math.min(
		currentTransactionPage * TRANSACTIONS_PER_PAGE,
		filteredTransactions.length
	);

	useEffect(() => {
		void initializeApp();
	}, []);

	useEffect(() => {
		const nextSelection =
			paginatedTransactions.find(
				(transaction) => transaction.id === selectedTransactionId
			) ??
			paginatedTransactions[0] ??
			null;

		if (nextSelection?.id !== selectedTransactionId) {
			applySelection(nextSelection);
		}

		if (!nextSelection && selectedTransactionId !== null) {
			applySelection(null);
		}
	}, [paginatedTransactions, selectedTransactionId]);

	useEffect(() => {
		setCurrentTransactionPage(1);
	}, [
		transactionSearch,
		transactionMonthFilter,
		transactionCategoryFilter,
		amountFilter,
	]);

	useEffect(() => {
		if (currentTransactionPage > totalTransactionPages) {
			setCurrentTransactionPage(totalTransactionPages);
		}
	}, [currentTransactionPage, totalTransactionPages]);

	useEffect(() => {
		if (!analyticsMonthOptions.length) {
			setAnalyticsStartMonth('');
			setAnalyticsEndMonth('');
			return;
		}

		setAnalyticsStartMonth((currentValue) =>
			currentValue && analyticsMonthOptions.includes(currentValue)
				? currentValue
				: analyticsMonthOptions[0]
		);
		setAnalyticsEndMonth((currentValue) =>
			currentValue && analyticsMonthOptions.includes(currentValue)
				? currentValue
				: analyticsMonthOptions.at(-1) ?? analyticsMonthOptions[0]
		);
	}, [transactions]);

	useEffect(() => {
		if (
			selectedRuleId &&
			!effectiveRules.some((rule) => rule.id === selectedRuleId)
		) {
			populateRuleEditor(null);
		}
	}, [effectiveRules, selectedRuleId]);

	useEffect(() => {
		setSelectedTransactionIds((currentIds) =>
			currentIds.filter((transactionId) =>
				transactions.some((transaction) => transaction.id === transactionId)
			)
		);
	}, [transactions]);

	useEffect(() => {
		if (typeof window === 'undefined') {
			return;
		}

		function syncRouteFromHash() {
			const nextRoute = readHashRoute();
			setActivePage(nextRoute.page);

			if (nextRoute.page === 'auth') {
				setAuthMode(nextRoute.authMode);
			}
		}

		syncRouteFromHash();
		window.addEventListener('hashchange', syncRouteFromHash);

		return () => {
			window.removeEventListener('hashchange', syncRouteFromHash);
		};
	}, []);

	useEffect(() => {
		if (!isUserMenuOpen || typeof window === 'undefined') {
			return;
		}

		function handlePointerDown(event: MouseEvent) {
			if (
				userMenuRef.current &&
				!userMenuRef.current.contains(event.target as Node)
			) {
				setIsUserMenuOpen(false);
			}
		}

		function handleKeyDown(event: KeyboardEvent) {
			if (event.key === 'Escape') {
				setIsUserMenuOpen(false);
			}
		}

		window.addEventListener('mousedown', handlePointerDown);
		window.addEventListener('keydown', handleKeyDown);

		return () => {
			window.removeEventListener('mousedown', handlePointerDown);
			window.removeEventListener('keydown', handleKeyDown);
		};
	}, [isUserMenuOpen]);

	async function initializeApp() {
		setErrorMessage('');

		const localRules = loadLocalRules();
		setRules(localRules);

		try {
			const [categoriesResponse, defaultRulesResponse] = await Promise.all([
				loadCategories(),
				loadDefaultRules(),
			]);

			startTransition(() => {
				setCategories(categoriesResponse.categories);
				setDefaultRules(defaultRulesResponse.rules);
			});
		} catch (error) {
			setErrorMessage(
				error instanceof Error
					? error.message
					: 'Impossibile caricare le categorie.'
			);
		}

		if (!authToken) {
			setIsBootstrapping(false);
			return;
		}

		try {
			const [userResponse, rulesResponse] = await Promise.all([
				loadCurrentUser(authToken),
				loadRules(authToken),
			]);

			startTransition(() => {
				setAuthUser(userResponse.user);
				setRules(rulesResponse.rules);
			});
			saveLocalRules(rulesResponse.rules);
		} catch {
			clearStoredAuthToken();
			setAuthToken(null);
			setAuthUser(null);
			setRules(localRules);
			setStatusMessage(
				'Sessione sincronizzata scaduta. Regole locali del browser ripristinate.'
			);
		} finally {
			setIsBootstrapping(false);
		}
	}

	function applySelection(transaction: Transaction | null) {
		if (!transaction) {
			setSelectedTransactionId(null);
			setNormalizedDescription('');
			setCategory('Other');
			setRulePattern('');
			setRulePatternType('contains');
			setRulePriority(1000);
			setSaveAsRule(true);
			return;
		}

		setSelectedTransactionId(transaction.id);
		setNormalizedDescription(transaction.normalizedDescription);
		setCategory(transaction.category);
		setRulePattern(transaction.normalizedDescription);
		setRulePatternType('contains');
		setRulePriority(1000);
		setSaveAsRule(true);
	}

	function populateRuleEditor(rule: EffectiveMerchantRule | null) {
		if (!rule) {
			setSelectedRuleId(null);
			setRuleEditorPattern('');
			setRuleEditorPatternType('contains');
			setRuleEditorName('');
			setRuleEditorCategory('Other');
			setRuleEditorPriority(1000);
			return;
		}

		setSelectedRuleId(rule.id);
		setRuleEditorPattern(rule.pattern);
		setRuleEditorPatternType(rule.patternType);
		setRuleEditorName(rule.normalizedName);
		setRuleEditorCategory(rule.category);
		setRuleEditorPriority(rule.priority);
	}

	function seedRuleEditorFromTransaction() {
		if (!selectedTransaction) {
			setErrorMessage(
				'Seleziona prima un movimento da cui generare la regola.'
			);
			return;
		}

		navigateToPage('rules');
		setSelectedRuleId(null);
		setRuleEditorPattern(
			rulePattern.trim() || selectedTransaction.normalizedDescription
		);
		setRuleEditorPatternType('contains');
		setRuleEditorName(
			normalizedDescription.trim() || selectedTransaction.normalizedDescription
		);
		setRuleEditorCategory(category || selectedTransaction.category);
		setStatusMessage('Form regola precompilato dal movimento selezionato.');
		setErrorMessage('');
	}

	function toggleTransactionSelection(transactionId: string) {
		setSelectedTransactionIds((currentIds) =>
			currentIds.includes(transactionId)
				? currentIds.filter((currentId) => currentId !== transactionId)
				: [...currentIds, transactionId]
		);
	}

	function selectVisibleTransactions(shouldSelect: boolean) {
		setSelectedTransactionIds((currentIds) => {
			const visibleIds = paginatedTransactions.map(
				(transaction) => transaction.id
			);

			if (shouldSelect) {
				return [...new Set([...currentIds, ...visibleIds])];
			}

			return currentIds.filter(
				(transactionId) => !visibleIds.includes(transactionId)
			);
		});
	}

	function closeCorrectionModal() {
		setIsCorrectionModalOpen(false);
	}

	function openCorrectionModal(transaction: Transaction) {
		applySelection(transaction);
		setSelectedTransactionIds((currentIds) =>
			currentIds.length
				? [...new Set([...currentIds, transaction.id])]
				: [transaction.id]
		);
		setIsCorrectionModalOpen(true);
	}

	function resetTransactionFilters() {
		setTransactionSearch('');
		setTransactionMonthFilter(ALL_FILTER_VALUE);
		setTransactionCategoryFilter(ALL_FILTER_VALUE);
		setAmountFilter('all');
		setCurrentTransactionPage(1);
	}

	function resetAnalyticsFilters() {
		setSelectedAnalyticsMerchants([]);
		setSelectedAnalyticsCategories([]);
		setAnalyticsStartMonth(analyticsMonthOptions[0] ?? '');
		setAnalyticsEndMonth(
			analyticsMonthOptions.at(-1) ?? analyticsMonthOptions[0] ?? ''
		);
		setAnalyticsFilterResetVersion((currentValue) => currentValue + 1);
	}

	function navigateToPage(
		nextPage: PageMode,
		nextAuthMode: AuthMode = authMode
	) {
		setActivePage(nextPage);

		if (nextPage === 'auth') {
			setAuthMode(nextAuthMode);
		}

		setIsUserMenuOpen(false);

		if (typeof window === 'undefined') {
			return;
		}

		const nextHash = buildHashRoute(nextPage, nextAuthMode);

		if (window.location.hash !== nextHash) {
			window.location.hash = nextHash;
		}
	}

	async function handleUpload(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();

		if (!uploadFile) {
			setErrorMessage('Seleziona un file CSV prima di importare.');
			return;
		}

		setIsUploading(true);
		setErrorMessage('');
		setStatusMessage('');

		try {
			const result = await uploadCsv(uploadFile, rules);
			const nextTransactions = result.transactions;

			startTransition(() => {
				setTransactions(nextTransactions);
			});

			setSelectedAnalyticsMerchants([]);
			setSelectedAnalyticsCategories([]);
			setAnalyticsStartMonth('');
			setAnalyticsEndMonth('');
			setAnalyticsFilterResetVersion((currentValue) => currentValue + 1);
			setSelectedTransactionIds([]);
			setIsCorrectionModalOpen(false);
			resetTransactionFilters();
			setCurrentTransactionPage(1);
			applySelection(nextTransactions[0] ?? null);
			setUploadFile(null);
			setFileInputKey((currentValue) => currentValue + 1);
			setStatusMessage(
				isAuthenticated
					? `Caricati ${nextTransactions.length} movimenti nella sessione corrente. Le regole restano sincronizzate sul tuo account.`
					: `Caricati ${nextTransactions.length} movimenti nella sessione corrente. Le regole restano nel browser e lo storico non viene salvato.`
			);
		} catch (error) {
			setErrorMessage(
				error instanceof Error ? error.message : 'Import CSV non riuscito.'
			);
		} finally {
			setIsUploading(false);
		}
	}

	async function handleSaveTransaction(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();

		if (!selectedTransactions.length) {
			setErrorMessage('Seleziona almeno una riga da modificare.');
			return;
		}

		setIsSaving(true);
		setErrorMessage('');
		setStatusMessage('');

		try {
			const timestamp = new Date().toISOString();
			const selectedIds = new Set(selectedTransactionIds);
			let nextTransactions = transactions.map((transaction) =>
				selectedIds.has(transaction.id)
					? {
							...transaction,
							normalizedDescription: normalizedDescription.trim(),
							category,
							updatedAt: timestamp,
					  }
					: transaction
			);
			let reclassifiedCount = 0;

			if (saveAsRule) {
				const savedRule = await persistRule({
					pattern: rulePattern.trim() || normalizedDescription.trim(),
					patternType: rulePatternType,
					normalizedName: normalizedDescription.trim(),
					category,
					priority: rulePriority,
					isDisabled: false,
				});
				const nextEffectiveRules = buildEffectiveRuleLibrary(
					defaultRules,
					mergeRuleCollection(rules, savedRule)
				);
				const reclassifyResult = reclassifyTransactions(
					nextTransactions,
					nextEffectiveRules
				);

				nextTransactions = reclassifyResult.transactions;
				reclassifiedCount = reclassifyResult.changedCount;
			}

			setTransactions(nextTransactions);
			setIsCorrectionModalOpen(false);

			const otherRowsNote =
				reclassifiedCount > 0
					? ` Altri ${reclassifiedCount} movimenti in sessione sono stati aggiornati con la stessa regola.`
					: '';

			setStatusMessage(
				saveAsRule
					? isAuthenticated
						? `Aggiornate ${selectedTransactions.length} righe. Regola sincronizzata sul tuo account e ancora valida su ${manualRulePreviewCount}/${selectedTransactions.length} righe selezionate.${otherRowsNote}`
						: `Aggiornate ${selectedTransactions.length} righe. Regola salvata nel browser e ancora valida su ${manualRulePreviewCount}/${selectedTransactions.length} righe selezionate.${otherRowsNote}`
					: `Aggiornate ${selectedTransactions.length} righe solo nella sessione corrente.`
			);
		} catch (error) {
			setErrorMessage(
				error instanceof Error ? error.message : 'Salvataggio non riuscito.'
			);
		} finally {
			setIsSaving(false);
		}
	}

	async function handleSaveRule(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();

		if (!ruleEditorPattern.trim() || !ruleEditorName.trim()) {
			setErrorMessage('Pattern e merchant normalizzato sono obbligatori.');
			return;
		}

		setIsRuleSaving(true);
		setErrorMessage('');
		setStatusMessage('');

		try {
			const savedRule = selectedRule
				? await persistRule(
						buildRulePayloadFromEffectiveRule(selectedRule, {
							pattern: ruleEditorPattern.trim(),
							patternType: ruleEditorPatternType,
							normalizedName: ruleEditorName.trim(),
							category: ruleEditorCategory,
							priority: ruleEditorPriority,
							isDisabled: false,
						})
				  )
				: await persistRule({
						pattern: ruleEditorPattern.trim(),
						patternType: ruleEditorPatternType,
						normalizedName: ruleEditorName.trim(),
						category: ruleEditorCategory,
						priority: ruleEditorPriority,
						isDisabled: false,
				  });
			const nextEffectiveRules = buildEffectiveRuleLibrary(
				defaultRules,
				mergeRuleCollection(rules, savedRule)
			);
			const { transactions: reclassifiedTransactions, changedCount } =
				reclassifyTransactions(transactions, nextEffectiveRules);

			if (changedCount > 0) {
				setTransactions(reclassifiedTransactions);
			}

			populateRuleEditor(
				nextEffectiveRules.find(
					(rule) =>
						rule.id ===
						(selectedRule?.source === 'default'
							? selectedRule.id
							: savedRule.id)
				) ?? null
			);
			setStatusMessage(
				`${
					isAuthenticated
						? 'Regola sincronizzata con il tuo account.'
						: 'Regola salvata nel browser.'
				}${
					changedCount > 0
						? ` ${changedCount} movimenti in sessione sono stati aggiornati.`
						: ''
				}`
			);
		} catch (error) {
			setErrorMessage(
				error instanceof Error
					? error.message
					: 'Salvataggio regola non riuscito.'
			);
		} finally {
			setIsRuleSaving(false);
		}
	}

	async function handleDeleteRule() {
		if (!selectedRuleId) {
			setErrorMessage('Seleziona una regola da eliminare.');
			return;
		}

		setIsRuleDeleting(true);
		setErrorMessage('');
		setStatusMessage('');

		try {
			let nextRules = rules;

			if (!selectedRule) {
				throw new Error('Regola selezionata non disponibile.');
			}

			if (selectedRule.source === 'default') {
				const disabledRule = await persistRule(
					buildRulePayloadFromEffectiveRule(selectedRule, {
						isDisabled: true,
					})
				);
				nextRules = mergeRuleCollection(rules, disabledRule);
			} else {
				const rawRuleId = selectedRule.rawRuleId ?? selectedRule.id;

				if (authToken) {
					await removeRule(authToken, rawRuleId);
				}

				nextRules = rules.filter((rule) => rule.id !== rawRuleId);
				setRules(nextRules);
				saveLocalRules(nextRules);
			}

			setRules(nextRules);
			saveLocalRules(nextRules);
			populateRuleEditor(null);

			const nextEffectiveRules = buildEffectiveRuleLibrary(
				defaultRules,
				nextRules
			);
			const { transactions: reclassifiedTransactions, changedCount } =
				reclassifyTransactions(transactions, nextEffectiveRules);

			if (changedCount > 0) {
				setTransactions(reclassifiedTransactions);
			}

			const reclassifyNote =
				changedCount > 0
					? ` ${changedCount} movimenti in sessione sono stati aggiornati.`
					: '';

			setStatusMessage(
				`${
					selectedRule.source === 'default'
						? 'Regola default disattivata nella tua libreria.'
						: isAuthenticated
						? 'Regola eliminata dal tuo account.'
						: 'Regola eliminata dal browser.'
				}${reclassifyNote}`
			);
		} catch (error) {
			setErrorMessage(
				error instanceof Error
					? error.message
					: 'Eliminazione regola non riuscita.'
			);
		} finally {
			setIsRuleDeleting(false);
		}
	}

	async function handleAuthSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();

		if (!authEmail.trim() || !authPassword.trim()) {
			setErrorMessage('Email e password sono obbligatorie.');
			return;
		}

		setIsAuthSubmitting(true);
		setErrorMessage('');
		setStatusMessage('');

		try {
			const payload: AuthPayload = {
				email: authEmail.trim(),
				password: authPassword,
				syncLocalRules: rules,
			};
			const response =
				authMode === 'signup' ? await signUp(payload) : await login(payload);

			saveStoredAuthToken(response.token);
			saveLocalRules(response.rules);
			setAuthToken(response.token);
			setAuthUser(response.user);
			setRules(response.rules);
			setAuthEmail(response.user.email);
			setAuthPassword('');
			setStatusMessage(
				authMode === 'signup'
					? 'Account creato. Le regole locali sono state sincronizzate.'
					: 'Accesso effettuato. Le regole sono ora sincronizzate.'
			);
			navigateToPage('dashboard');
		} catch (error) {
			setErrorMessage(
				error instanceof Error ? error.message : 'Autenticazione non riuscita.'
			);
		} finally {
			setIsAuthSubmitting(false);
		}
	}

	function handleExcludeFixedExpense(merchant: string) {
		const nextOverrides: Record<string, FixedExpenseOverrideState> = {
			...fixedExpenseOverrides,
			[merchant]: 'excluded',
		};

		setFixedExpenseOverrides(nextOverrides);
		saveFixedExpenseOverrides(nextOverrides);
	}

	function handleIncludeFixedExpense(merchant: string) {
		const nextOverrides: Record<string, FixedExpenseOverrideState> = {
			...fixedExpenseOverrides,
			[merchant]: 'included',
		};

		setFixedExpenseOverrides(nextOverrides);
		saveFixedExpenseOverrides(nextOverrides);
	}

	function handleResetFixedExpenseOverride(merchant: string) {
		const nextOverrides = { ...fixedExpenseOverrides };

		delete nextOverrides[merchant];
		setFixedExpenseOverrides(nextOverrides);
		saveFixedExpenseOverrides(nextOverrides);
	}

	function handleAddFixedExpense(event: FormEvent) {
		event.preventDefault();

		if (!fixedExpenseAddSelection) {
			return;
		}

		handleIncludeFixedExpense(fixedExpenseAddSelection);
		setFixedExpenseAddSelection('');
	}

	function handleLogout() {
		saveLocalRules(rules);
		clearStoredAuthToken();
		setAuthToken(null);
		setAuthUser(null);
		navigateToPage('dashboard');
		setStatusMessage(
			'Logout eseguito. Le regole restano disponibili nel browser su questo dispositivo.'
		);
	}

	async function handleResetHistory() {
		const shouldProceed =
			typeof window === 'undefined' ||
			window.confirm(
				'Azzero lo storico corrente. Le regole non verranno toccate. Procedo?'
			);

		if (!shouldProceed) {
			return;
		}

		setIsResettingHistory(true);
		setErrorMessage('');
		setStatusMessage('');

		try {
			setTransactions([]);
			setSelectedAnalyticsMerchants([]);
			setSelectedAnalyticsCategories([]);
			setAnalyticsStartMonth('');
			setAnalyticsEndMonth('');
			setAnalyticsFilterResetVersion((currentValue) => currentValue + 1);
			setSelectedTransactionIds([]);
			setIsCorrectionModalOpen(false);
			setCurrentTransactionPage(1);
			applySelection(null);
			resetTransactionFilters();
			setStatusMessage('Storico azzerato. Le regole restano invariate.');
		} catch (error) {
			setErrorMessage(
				error instanceof Error
					? error.message
					: 'Azzeramento storico non riuscito.'
			);
		} finally {
			setIsResettingHistory(false);
		}
	}

	async function persistRule(payload: RulePayload) {
		if (authToken) {
			const result = await saveRule(authToken, payload);
			const nextRules = mergeRuleCollection(rules, result.rule);
			setRules(nextRules);
			saveLocalRules(nextRules);
			return result.rule;
		}

		const existingRule =
			rules.find((rule) => payload.id && rule.id === payload.id) ??
			rules.find(
				(rule) =>
					payload.defaultRuleId !== undefined &&
					rule.defaultRuleId === payload.defaultRuleId
			) ??
			rules.find(
				(rule) =>
					rule.pattern === payload.pattern &&
					rule.patternType === payload.patternType &&
					rule.defaultRuleId === (payload.defaultRuleId ?? null)
			) ??
			null;
		const localRule = buildLocalRule(payload, existingRule);
		const nextRules = mergeRuleCollection(rules, localRule);
		setRules(nextRules);
		saveLocalRules(nextRules);
		return localRule;
	}

	const userMenuTitle = isRestoringSession
		? 'Ripristino sessione'
		: isAuthenticated && authUser
		? authUser.email
		: 'Account';
	const userMenuSubtitle = isRestoringSession
		? 'Verifica in corso'
		: isAuthenticated
		? 'Profilo, regole e logout'
		: 'Sign in o Sign up';
	const authPageTitle = isAuthenticated
		? 'Profilo e sincronizzazione.'
		: authMode === 'signup'
		? 'Crea il tuo account.'
		: 'Accedi per sincronizzare le regole.';
	const authPageCopy = isAuthenticated
		? 'Qui gestisci il tuo profilo e verifichi che la sincronizzazione riguardi solo le regole. I movimenti continuano a vivere esclusivamente nella sessione corrente.'
		: 'Questa pagina serve solo all’account. La dashboard resta libera da login obbligatorio e i movimenti non vengono mai salvati automaticamente nel backend.';

	return (
		<main className="app-shell">
			<header className="topbar">
				<div className="topbar__brand">
					<div className="topbar__identity">
						<span className="eyebrow">Finance MVP</span>
						<div className="topbar__copy">
							<strong>Personal Finance Tracker</strong>
							<span>
								Storico effimero, regole riutilizzabili e sync opzionale
							</span>
						</div>
					</div>

					<nav className="topbar__nav" aria-label="Navigazione principale">
						<button
							className={`topbar__link ${
								activePage === 'dashboard' ? 'is-active' : ''
							}`}
							onClick={() => navigateToPage('dashboard')}
							type="button"
						>
							Dashboard
						</button>
						<button
							className={`topbar__link ${
								activePage === 'rules' ? 'is-active' : ''
							}`}
							onClick={() => navigateToPage('rules')}
							type="button"
						>
							Regole
						</button>
					</nav>
				</div>

				<div className="user-menu" ref={userMenuRef}>
					<button
						aria-expanded={isUserMenuOpen}
						aria-haspopup="menu"
						className="user-menu__trigger"
						onClick={() => setIsUserMenuOpen((currentValue) => !currentValue)}
						type="button"
					>
						<span className="user-menu__avatar" aria-hidden="true">
							<svg viewBox="0 0 24 24" focusable="false">
								<path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-3.33 0-6 2.24-6 5v1h12v-1c0-2.76-2.67-5-6-5Z" />
							</svg>
						</span>
						<span className="user-menu__meta">
							<strong>{userMenuTitle}</strong>
							<small>{userMenuSubtitle}</small>
						</span>
						<span className="user-menu__caret" aria-hidden="true">
							{isUserMenuOpen ? '▴' : '▾'}
						</span>
					</button>

					{isUserMenuOpen ? (
						<div className="user-menu__dropdown" role="menu">
							{isRestoringSession ? (
								<div className="user-menu__section">
									<strong>Ripristino in corso</strong>
									<span className="user-menu__note">
										Sto verificando account e regole sincronizzate.
									</span>
								</div>
							) : isAuthenticated && authUser ? (
								<>
									<div className="user-menu__section user-menu__section--status">
										<strong>{authUser.email}</strong>
										<span>
											Regole su account. Movimenti sempre solo di sessione.
										</span>
									</div>
									<button
										className="user-menu__action"
										onClick={() => navigateToPage('auth', 'login')}
										type="button"
									>
										Profilo e sincronizzazione
									</button>
									<button
										className="user-menu__action"
										onClick={() => navigateToPage('dashboard')}
										type="button"
									>
										Dashboard movimenti
									</button>
									<button
										className="user-menu__action"
										onClick={() => navigateToPage('rules')}
										type="button"
									>
										Libreria regole
									</button>
									<button
										className="user-menu__action user-menu__action--danger"
										onClick={handleLogout}
										type="button"
									>
										Logout
									</button>
								</>
							) : (
								<>
									<div className="user-menu__section user-menu__section--status">
										<strong>Nessun account collegato</strong>
										<span>
											Puoi continuare anonimo oppure sincronizzare solo le
											regole.
										</span>
									</div>
									<button
										className="user-menu__action"
										onClick={() => navigateToPage('auth', 'login')}
										type="button"
									>
										Sign in
									</button>
									<button
										className="user-menu__action"
										onClick={() => navigateToPage('auth', 'signup')}
										type="button"
									>
										Sign up
									</button>
									<button
										className="user-menu__action"
										onClick={() => navigateToPage('dashboard')}
										type="button"
									>
										Continua senza account
									</button>
								</>
							)}
						</div>
					) : null}
				</div>
			</header>

			{statusMessage ? (
				<div className="flash flash--success">{statusMessage}</div>
			) : null}
			{errorMessage ? (
				<div className="flash flash--error">{errorMessage}</div>
			) : null}

			{isAuthPage ? (
				<section className="auth-route">
					<section className="hero-panel hero-panel--auth">
						<div>
							<span className="eyebrow">Account</span>
							<h1>{authPageTitle}</h1>
							<p className="hero-copy">{authPageCopy}</p>
						</div>
						<div className="hero-badge">
							<span className="hero-badge__label">Persistenza</span>
							<strong>
								{isAuthenticated
									? 'Regole sincronizzate'
									: 'Solo regole, niente storico'}
							</strong>
							<span>
								{isAuthenticated
									? 'Le regole seguono il tuo account. I movimenti restano comunque solo nella sessione corrente.'
									: 'Senza login puoi usare l’app liberamente: le regole restano nel browser, lo storico non viene salvato.'}
							</span>
						</div>
					</section>

					<section className="auth-route__grid">
						<article className="panel">
							<div className="panel-heading">
								<h2>
									{isAuthenticated
										? 'Profilo attivo'
										: 'Accesso e registrazione'}
								</h2>
								<p>
									{isAuthenticated
										? 'Qui puoi verificare il tuo account e uscire senza perdere le regole già presenti nel browser.'
										: 'L’account serve solo a sincronizzare la libreria regole tra dispositivi.'}
								</p>
							</div>

							{isAuthenticated && authUser ? (
								<>
									<div className="status-card status-card--account">
										<span>Utente collegato</span>
										<strong>{authUser.email}</strong>
										<p>
											Le regole vengono sincronizzate sul tuo account. I
											movimenti non vengono salvati nel backend.
										</p>
									</div>
									<div className="inline-actions">
										<button
											className="button button--secondary"
											onClick={() => navigateToPage('dashboard')}
											type="button"
										>
											Torna alla dashboard
										</button>
										<button
											className="button button--danger"
											onClick={handleLogout}
											type="button"
										>
											Logout
										</button>
									</div>
								</>
							) : (
								<>
									<div className="inline-actions inline-actions--compact">
										<button
											className={`button ${
												authMode === 'login'
													? 'button--primary is-active'
													: 'button--secondary'
											}`}
											onClick={() => navigateToPage('auth', 'login')}
											type="button"
										>
											Sign in
										</button>
										<button
											className={`button ${
												authMode === 'signup'
													? 'button--primary is-active'
													: 'button--secondary'
											}`}
											onClick={() => navigateToPage('auth', 'signup')}
											type="button"
										>
											Sign up
										</button>
									</div>

									<form
										className="editor-form auth-form"
										onSubmit={handleAuthSubmit}
									>
										<label>
											<span>Email</span>
											<input
												autoComplete="email"
												onChange={(event) => setAuthEmail(event.target.value)}
												type="email"
												value={authEmail}
											/>
										</label>
										<label>
											<span>Password</span>
											<input
												autoComplete={
													authMode === 'login'
														? 'current-password'
														: 'new-password'
												}
												minLength={8}
												onChange={(event) =>
													setAuthPassword(event.target.value)
												}
												type="password"
												value={authPassword}
											/>
										</label>
										<button
											className="button button--primary"
											disabled={isAuthSubmitting}
											type="submit"
										>
											{isAuthSubmitting
												? authMode === 'signup'
													? 'Creazione account...'
													: 'Accesso...'
												: authMode === 'signup'
												? 'Crea account'
												: 'Accedi'}
										</button>
									</form>

									<p className="auth-note">
										Se accedi, sincronizzi solo le regole. Se resti anonimo, le
										regole restano nel browser. In ogni caso i movimenti non vengono salvati
										da nessuna parte.
									</p>
								</>
							)}
						</article>

						<article className="panel panel--accent auth-route__side">
							<div className="panel-heading">
								<h2>COME FUNZIONA</h2>
							</div>

							<div className="status-stack">
								<div className="status-card status-card--browser">
									<span>Browser locale</span>
									<strong>Regole anonime</strong>
									<p>
										Se non fai login, le regole vivono solo su questo
										dispositivo e restano disponibili anche dopo il logout.
									</p>
								</div>
								<div className="status-card status-card--account">
									<span>Account</span>
									<strong>Regole sincronizzate</strong>
									<p>
										Con login o sign up, le regole vengono portate sull’account
										e tornano disponibili sugli altri dispositivi.
									</p>
								</div>
								<div className="status-card status-card--session">
									<span>Sessione corrente</span>
									<strong>Movimenti temporanei</strong>
									<p>
										Lo storico importato non viene archiviato: serve solo alla
										sessione corrente e si azzera con reset o refresh.
									</p>
								</div>
							</div>
						</article>
					</section>
				</section>
			) : activePage === 'dashboard' ? (
				<>
					<section className="hero-panel">
						<div>
							<span className="eyebrow">Finance MVP</span>
							<h1>Leggi meglio i movimenti del conto.</h1>
							<p className="hero-copy">
								Import CSV bancari, pulizia automatica delle descrizioni e
								regole riutilizzabili. Lo storico dei movimenti resta nella
								sessione corrente, mentre le regole possono sincronizzarsi solo
								se apri la pagina account.
							</p>
						</div>
						<div className="hero-badge">
							<span className="hero-badge__label">Stato</span>
							<strong>
								{isPending
									? 'Aggiornamento dashboard'
									: isRestoringSession
									? 'Ripristino sessione...'
									: 'Modalità ibrida pronta'}
							</strong>
							<span>
								{isRestoringSession
									? 'Verifica account e ricarico regole sincronizzate in corso.'
									: isAuthenticated
									? 'Regole sincronizzate su account. Storico movimenti solo in sessione.'
									: 'Regole nel browser. Storico movimenti non persistente.'}
							</span>
						</div>
					</section>

					<section className="summary-grid">
						<article className="summary-card">
							<span>Movimenti in sessione</span>
							<strong>{stats.overview.totalTransactions}</strong>
							<small>
								Lo storico corrente sparisce al reset o al refresh della pagina.
							</small>
						</article>
						<article className="summary-card">
							<span>Spesa mese di riferimento</span>
							<strong>{formatAmount(stats.overview.currentMonthSpend)}</strong>
							<small>{formatMonth(stats.overview.referenceMonth)}</small>
						</article>
						<article className="summary-card">
							<span>Regole attive</span>
							<strong>{stats.overview.ruleCount}</strong>
							<small>
								{isRestoringSession
									? 'Ripristino account in corso.'
									: isAuthenticated
									? 'Sincronizzate sul tuo account.'
									: 'Salvate nel browser locale.'}
							</small>
						</article>
					</section>

					<section className="dashboard-shell">
						<article className="panel auth-panel dashboard-account-panel">
							<div className="panel-heading">
								<h2>Stato account</h2>
								<p>
									L’account si gestisce dal menu utente fisso in alto a destra.
									Da qui leggi solo lo stato corrente.
								</p>
							</div>

							{isRestoringSession ? (
								<div className="auth-state">
									<span className="auth-badge">In verifica</span>
									<strong>Ripristino sessione</strong>
									<p>
										Sto recuperando regole sincronizzate e sessione account
										senza bloccare la dashboard.
									</p>
								</div>
							) : isAuthenticated && authUser ? (
								<div className="auth-state">
									<span className="auth-badge">Connesso</span>
									<strong>{authUser.email}</strong>
									<p>
										Le regole sono sincronizzate sul tuo account. I movimenti
										restano comunque solo nella sessione corrente.
									</p>
								</div>
							) : (
								<div className="auth-state">
									<span className="auth-badge">Locale</span>
									<strong>Modalità anonima</strong>
									<p>
										Le regole sono salvate nel browser corrente. Se vuoi
										sincronizzarle, usa il menu account in alto.
									</p>
								</div>
							)}
						</article>

						<section className="dashboard-ops-stack">
							<article className="panel panel--accent dashboard-wide-panel">
								<div className="panel-heading">
									<h2>Importa CSV banca</h2>
									<p>
										Ogni import sostituisce lo storico della sessione corrente.
										Le regole attive vengono comunque applicate.
									</p>
								</div>
								<form className="upload-form" onSubmit={handleUpload}>
									<label className="file-picker">
										<span>Seleziona file</span>
										<input
											key={fileInputKey}
											accept=".csv,text/csv"
											type="file"
											onChange={(event) => {
												setUploadFile(event.target.files?.[0] ?? null);
											}}
										/>
									</label>
									<div className="upload-meta">
										<strong>
											{uploadFile?.name ?? 'Nessun file selezionato'}
										</strong>
										<span>
											Parser compatibile con Mediolanum e file con colonne
											separate entrate/uscite. Le regole locali o sincronizzate
											vengono applicate subito all'import.
										</span>
									</div>
									<div className="inline-actions">
										<button
											className="button button--primary"
											disabled={!uploadFile || isUploading}
											type="submit"
										>
											{isUploading ? 'Import in corso...' : 'Importa movimenti'}
										</button>
										<button
											className="button button--danger"
											disabled={isResettingHistory}
											onClick={handleResetHistory}
											type="button"
										>
											{isResettingHistory ? 'Azzeramento...' : 'Azzera storico'}
										</button>
									</div>
									<p className="inline-note inline-note--warning">
										Azzera solo lo storico movimenti. Le regole restano intatte,
										sia in browser sia su account.
									</p>
								</form>
							</article>

							<article className="panel editor-panel dashboard-wide-panel">
								<div className="panel-heading">
									<h2>Correzione manuale</h2>
									<p>
										Clicca il merchant letto in tabella per aprire la modale di
										correzione. Puoi selezionare piu righe e verificare subito
										il match residuo della regola.
									</p>
								</div>
								<div className="correction-summary">
									<div className="scenario-grid">
										<div className="scenario-card">
											<span>Righe selezionate</span>
											<strong>{selectedTransactionIds.length}</strong>
											<small>
												Usa le checkbox per selezione multipla anche tra pagine
												diverse.
											</small>
										</div>
										<div className="scenario-card">
											<span>Merchant in focus</span>
											<strong>
												{selectedTransaction?.normalizedDescription ||
													'Nessuno'}
											</strong>
											<small>
												Il click sul merchant letto apre la modale e include
												automaticamente quella riga.
											</small>
										</div>
									</div>
									<div className="inline-actions">
										<button
											className="button button--primary"
											disabled={!selectedTransactionIds.length}
											onClick={() => {
												const transactionInFocus =
													selectedTransaction ?? selectedTransactions[0];
												if (transactionInFocus) {
													openCorrectionModal(transactionInFocus);
												}
											}}
											type="button"
										>
											Apri correzione modale
										</button>
										<button
											className="button button--secondary"
											disabled={!selectedTransaction}
											onClick={seedRuleEditorFromTransaction}
											type="button"
										>
											Usa movimento in focus per nuova regola
										</button>
										<button
											className="button button--secondary"
											disabled={!selectedTransactionIds.length}
											onClick={() => setSelectedTransactionIds([])}
											type="button"
										>
											Svuota selezione
										</button>
									</div>
									{selectedTransactionIds.length ? (
										<p className="inline-note">
											La modale mostrerà su quante delle{' '}
											{selectedTransactionIds.length} righe selezionate la
											regola corrente continua a fare match.
										</p>
									) : (
										<p className="empty-state">
											Seleziona una o più righe e clicca il merchant letto in
											tabella per correggerle in modale.
										</p>
									)}
								</div>
							</article>
						</section>

						<section className="insights-grid">
							<article className="panel insight-panel">
								<div className="panel-heading">
									<h2>Spesa per categoria</h2>
									<p>Dove escono più soldi nel mese di riferimento corrente.</p>
								</div>
								{stats.categorySpend.length ? (
									<div className="bar-list">
										{stats.categorySpend.slice(0, 6).map((item) => {
											const maxValue = stats.categorySpend[0]?.total ?? 1;
											const width = Math.max((item.total / maxValue) * 100, 8);

											return (
												<div className="bar-row" key={item.category}>
													<div className="bar-row__topline">
														<span>{item.category}</span>
														<strong>{formatAmount(item.total)}</strong>
													</div>
													<div className="bar-track">
														<div
															className="bar-fill"
															style={{ width: `${width}%` }}
														/>
													</div>
												</div>
											);
										})}
									</div>
								) : (
									<p className="empty-state">
										Importa un CSV per vedere la distribuzione per categoria.
									</p>
								)}
							</article>

							<article className="panel insight-panel insight-panel--trend">
								<div className="panel-heading">
									<h2>Andamento mensile</h2>
									<p>
										Trend delle uscite mese su mese, utile per capire se stai
										alleggerendo davvero la spesa.
									</p>
								</div>
								{monthlySpend.length ? (
									<div className="trend-chart-block">
										<div className="trend-summary-card">
											<strong>
												{formatAmount(stats.overview.currentMonthSpend)}
											</strong>
											<span>{formatMonth(stats.overview.referenceMonth)}</span>
											<small>
												{currentMonthDelta === null
													? 'Serve almeno un altro mese per confrontare il trend.'
													: currentMonthDelta < 0
													? `${formatAmount(
															Math.abs(currentMonthDelta)
													  )} in meno del mese precedente${
															currentMonthDeltaPercentage
																? ` (${currentMonthDeltaPercentage}%)`
																: ''
													  }.`
													: `${formatAmount(
															currentMonthDelta
													  )} in più del mese precedente${
															currentMonthDeltaPercentage
																? ` (${currentMonthDeltaPercentage}%)`
																: ''
													  }.`}
											</small>
										</div>
										<div className="trend-chart">
											<svg
												aria-hidden="true"
												viewBox={`0 0 ${TREND_CHART_WIDTH} ${TREND_CHART_HEIGHT}`}
											>
												{monthlyTrendScale.ticks.map((tick) => {
													const y = getChartY(
														tick,
														monthlyTrendScale,
														TREND_CHART_HEIGHT
													);

													return (
														<g key={tick}>
															<line
																className="trend-chart__gridline"
																x1={chartPadding.left}
																x2={TREND_CHART_WIDTH - chartPadding.right}
																y1={y}
																y2={y}
															/>
															<text
																className="trend-chart__ylabel"
																x="4"
																y={y + 4}
															>
																{formatAmount(tick)}
															</text>
														</g>
													);
												})}
												<polyline points={monthlyTrendChartPoints} />
												{monthlySpend.map((item, index) => {
													const x = getChartX(
														index,
														monthlySpend.length,
														TREND_CHART_WIDTH
													);
													const y = getChartY(
														item.total,
														monthlyTrendScale,
														TREND_CHART_HEIGHT
													);

													return (
														<circle cx={x} cy={y} key={item.month} r="4" />
													);
												})}
											</svg>
										</div>
										<div className="trend-chart__labels">
											{monthlySpend.map((item) => (
												<span key={item.month}>{formatMonth(item.month)}</span>
											))}
										</div>
									</div>
								) : (
									<p className="empty-state">
										Nessun andamento disponibile finché non importi movimenti.
									</p>
								)}
							</article>

							<article className="panel insight-panel">
								<div className="panel-heading">
									<h2>Spesa per merchant</h2>
									<p>
										I merchant che stanno assorbendo più budget nel mese di
										riferimento.
									</p>
								</div>
								{stats.merchantSpend.length ? (
									<div className="bar-list">
										{stats.merchantSpend.slice(0, 6).map((item) => {
											const maxValue = stats.merchantSpend[0]?.total ?? 1;
											const width = Math.max((item.total / maxValue) * 100, 8);

											return (
												<div className="bar-row" key={item.merchant}>
													<div className="bar-row__topline">
														<span>{item.merchant}</span>
														<strong>{formatAmount(item.total)}</strong>
													</div>
													<div className="bar-track">
														<div
															className="bar-fill bar-fill--merchant"
															style={{ width: `${width}%` }}
														/>
													</div>
													<small className="bar-row__meta">
														{item.count} movimenti nello stesso mese
													</small>
												</div>
											);
										})}
									</div>
								) : (
									<p className="empty-state">
										Importa un CSV per vedere i merchant più pesanti del mese.
									</p>
								)}
							</article>

							<article className="panel insight-panel insight-panel--savings">
								<div className="panel-heading">
									<h2>Margine liquido rapido</h2>
									<p>
										Stima orientativa su categorie comprimibili: dining,
										entertainment, shopping e travel.
									</p>
								</div>
								{stats.savingsPlan.discretionaryTotal > 0 ? (
									<div className="savings-plan">
										<div className="savings-plan__hero">
											<strong>
												{formatAmount(stats.savingsPlan.discretionaryTotal)}
											</strong>
											<span>Spesa discrezionale del mese</span>
											<small>
												{stats.savingsPlan.shareOfMonth}% dell'uscita mensile
												corrente.
											</small>
										</div>
										<div className="scenario-grid">
											<div className="scenario-card">
												<span>Taglio prudente</span>
												<strong>
													{formatAmount(stats.savingsPlan.scenario15)}
												</strong>
												<small>
													liquidità mensile in più con riduzione del 15%
												</small>
											</div>
											<div className="scenario-card">
												<span>Taglio deciso</span>
												<strong>
													{formatAmount(stats.savingsPlan.scenario30)}
												</strong>
												<small>
													liquidità mensile in più con riduzione del 30%
												</small>
											</div>
										</div>
										<div className="bar-list">
											{stats.savingsPlan.categories.map((item) => {
												const maxValue =
													stats.savingsPlan.categories[0]?.total ?? 1;
												const width = Math.max(
													(item.total / maxValue) * 100,
													8
												);

												return (
													<div className="bar-row" key={item.category}>
														<div className="bar-row__topline">
															<span>{item.category}</span>
															<strong>{formatAmount(item.total)}</strong>
														</div>
														<div className="bar-track">
															<div
																className="bar-fill bar-fill--savings"
																style={{ width: `${width}%` }}
															/>
														</div>
													</div>
												);
											})}
										</div>
									</div>
								) : (
									<p className="empty-state">
										Ancora nessuna spesa discrezionale rilevata nelle categorie
										comprimibili del mese corrente.
									</p>
								)}
							</article>

							<article className="panel insight-panel">
								<div className="panel-heading">
									<h2>Spese fisse mensili</h2>
									<p>
										Spese ricorrenti rilevate automaticamente (mensili,
										bimestrali o trimestrali) con importo stabile. Puoi
										escludere o includere manualmente ogni voce.
									</p>
								</div>
								{fixedExpensesSummary.included.length ? (
									<div className="bar-list">
										{fixedExpensesSummary.included.map((entry) => {
											const maxValue =
												fixedExpensesSummary.included[0]?.monthlyEquivalent ??
												1;
											const width = Math.max(
												(entry.monthlyEquivalent / maxValue) * 100,
												8
											);

											return (
												<div className="bar-row" key={entry.merchant}>
													<div className="bar-row__topline">
														<span>{entry.merchant}</span>
														<strong>
															{formatAmount(entry.monthlyEquivalent)}
														</strong>
													</div>
													<div className="bar-track">
														<div
															className="bar-fill bar-fill--savings"
															style={{ width: `${width}%` }}
														/>
													</div>
													<small className="bar-row__meta">
														{describeFixedExpenseCadence(
															entry.cadence,
															entry.cadenceMonths
														)}{' '}
														&middot; media su {entry.occurrenceCount} occorrenze
													</small>
													<button
														type="button"
														className="button button--secondary"
														onClick={() =>
															handleExcludeFixedExpense(entry.merchant)
														}
													>
														Escludi
													</button>
												</div>
											);
										})}
										<div className="bar-row bar-row--total">
											<div className="bar-row__topline">
												<span>Totale spese fisse mensili</span>
												<strong>
													{formatAmount(fixedExpensesSummary.total)}
												</strong>
											</div>
										</div>
									</div>
								) : (
									<p className="empty-state">
										Nessuna spesa fissa rilevata automaticamente. Puoi
										aggiungerne una manualmente qui sotto se importi più mesi di
										movimenti.
									</p>
								)}
								{fixedExpensesSummary.excluded.length ? (
									<div className="fixed-expenses-excluded">
										<h3>Escluse manualmente</h3>
										<div className="bar-list">
											{fixedExpensesSummary.excluded.map((entry) => (
												<div className="bar-row" key={entry.merchant}>
													<div className="bar-row__topline">
														<span>{entry.merchant}</span>
														<strong>
															{formatAmount(entry.monthlyEquivalent)}
														</strong>
													</div>
													<button
														type="button"
														className="button button--secondary"
														onClick={() =>
															handleResetFixedExpenseOverride(entry.merchant)
														}
													>
														Includi di nuovo
													</button>
												</div>
											))}
										</div>
									</div>
								) : null}
								{fixedExpensesSummary.addableMerchants.length ? (
									<form
										className="fixed-expenses-add-form"
										onSubmit={handleAddFixedExpense}
									>
										<label htmlFor="fixed-expense-add-select">
											Aggiungi spesa fissa
										</label>
										<select
											id="fixed-expense-add-select"
											value={fixedExpenseAddSelection}
											onChange={(event) =>
												setFixedExpenseAddSelection(event.target.value)
											}
										>
											<option value="">Seleziona un merchant</option>
											{fixedExpensesSummary.addableMerchants.map((merchant) => (
												<option key={merchant} value={merchant}>
													{merchant}
												</option>
											))}
										</select>
										<button
											type="submit"
											className="button button--secondary"
											disabled={!fixedExpenseAddSelection}
										>
											Aggiungi
										</button>
									</form>
								) : null}
							</article>
						</section>

						<article className="panel liquidity-panel">
							<div className="panel-heading panel-heading--inline">
								<div>
									<h2>Confronto spesa selezionata e risparmio mensile</h2>
									<p>
										Barre mensili: uscite filtrate per merchant e categoria.
										Linea: risparmio netto mensile, positivo o negativo.
									</p>
								</div>
								<span className="chip">{liquidityFilterSummary}</span>
							</div>

							{transactions.length ? (
								<div className="liquidity-panel__content">
									<div className="analytics-controls">
										<div className="analytics-controls__topline">
											<label className="filter-control">
												<span>Da mese</span>
												<select
													onChange={(event) => {
														const nextValue = event.target.value;
														setAnalyticsStartMonth(nextValue);

														if (
															analyticsRangeEnd &&
															analyticsRangeEnd < nextValue
														) {
															setAnalyticsEndMonth(nextValue);
														}
													}}
													value={analyticsRangeStart}
												>
													{analyticsMonthOptions.map((month) => (
														<option key={month} value={month}>
															{formatMonth(month)}
														</option>
													))}
												</select>
											</label>
											<label className="filter-control">
												<span>A mese</span>
												<select
													onChange={(event) => {
														const nextValue = event.target.value;
														setAnalyticsEndMonth(nextValue);

														if (
															analyticsRangeStart &&
															analyticsRangeStart > nextValue
														) {
															setAnalyticsStartMonth(nextValue);
														}
													}}
													value={analyticsRangeEnd}
												>
													{analyticsMonthOptions.map((month) => (
														<option key={month} value={month}>
															{formatMonth(month)}
														</option>
													))}
												</select>
											</label>
											<SearchableMultiSelect
												emptyMessage="Nessuna categoria trovata per questa ricerca."
												label="Categorie"
												onClearSelection={() =>
													setSelectedAnalyticsCategories([])
												}
												onToggleValue={(nextValue) =>
													setSelectedAnalyticsCategories((currentValues) =>
														toggleSelection(currentValues, nextValue)
													)
												}
												options={categorySelectOptions}
												placeholder="Tutte le categorie"
												resetVersion={analyticsFilterResetVersion}
												searchPlaceholder="Cerca categoria"
												selectedCountLabel="categorie"
												selectedValues={selectedAnalyticsCategories}
												selectionSummary={formatSelectSummary(
													selectedAnalyticsCategories,
													'Tutte le categorie',
													'categorie selezionate'
												)}
											/>
											<SearchableMultiSelect
												emptyMessage="Nessun merchant trovato per questa ricerca."
												label="Merchant"
												onClearSelection={() =>
													setSelectedAnalyticsMerchants([])
												}
												onToggleValue={(nextValue) =>
													setSelectedAnalyticsMerchants((currentValues) =>
														toggleSelection(currentValues, nextValue)
													)
												}
												options={merchantSelectOptions}
												placeholder="Tutti i merchant"
												resetVersion={analyticsFilterResetVersion}
												searchPlaceholder="Cerca merchant per nome"
												selectedCountLabel="merchant"
												selectedValues={selectedAnalyticsMerchants}
												selectionSummary={formatSelectSummary(
													selectedAnalyticsMerchants,
													'Tutti i merchant',
													'merchant selezionati'
												)}
											/>
											<button
												className="button button--secondary analytics-controls__reset"
												onClick={resetAnalyticsFilters}
												type="button"
											>
												Reset grafico
											</button>
										</div>
									</div>

									<div className="liquidity-summary-grid">
										<div className="scenario-card">
											<span>Uscite filtrate</span>
											<strong>
												{formatAmount(liquidityFilteredSpendTotal)}
											</strong>
											<small>
												Totale sul periodo e sui filtri selezionati.
											</small>
										</div>
										<div className="scenario-card">
											<span>Risparmio medio mensile</span>
											<strong>{formatAmount(liquidityAverageSavings)}</strong>
											<small>
												Valore netto mensile medio, positivo o negativo.
											</small>
										</div>
										<div className="scenario-card">
											<span>
												Spesa selezionata{' '}
												{currentLiquidityMonth
													? formatMonth(currentLiquidityMonth.month)
													: 'mese corrente'}
											</span>
											<strong>{formatAmount(currentSelectedSpend)}</strong>
											<small>
												{selectedSpendDelta !== null && previousLiquidityMonth
													? describeMonthComparison(
															selectedSpendDelta,
															previousLiquidityMonth.month,
															'expense'
													  )
													: 'Serve almeno un mese precedente nel range per il confronto.'}
											</small>
										</div>
										<div className="scenario-card">
											<span>
												Risparmio netto{' '}
												{currentLiquidityMonth
													? formatMonth(currentLiquidityMonth.month)
													: 'mese corrente'}
											</span>
											<strong>
												{formatAmount(currentLiquidityMonth?.savings ?? 0)}
											</strong>
											<small>
												{savingsDelta !== null && previousLiquidityMonth
													? describeMonthComparison(
															savingsDelta,
															previousLiquidityMonth.month,
															'savings'
													  )
													: 'Serve almeno un mese precedente nel range per il confronto.'}
											</small>
										</div>
										<div className="scenario-card">
											<span>Mesi con cashflow positivo</span>
											<strong>
												{positiveSavingsMonths}/{liquidityChartSeries.length}
											</strong>
											<small>
												Numero di mesi con entrate superiori alle uscite nel
												periodo selezionato.
											</small>
										</div>
									</div>

									<div className="analytics-recurring">
										<div>
											<span className="analytics-chip-group__label">
												Merchant ricorrenti comprimibili
											</span>
											<p>
												Merchant presenti in almeno due mesi nelle categorie
												comprimibili del range selezionato.
											</p>
										</div>
										{recurringMerchantInsights.length ? (
											<div className="analytics-recurring__list">
												{recurringMerchantInsights.map((merchantInsight) => (
													<article
														className="analytics-recurring__card"
														key={merchantInsight.merchant}
													>
														<strong>{merchantInsight.merchant}</strong>
														<span>{formatAmount(merchantInsight.total)}</span>
														<small>
															{merchantInsight.activeMonths} mesi attivi • media{' '}
															{formatAmount(merchantInsight.averageMonthly)}
															/mese
														</small>
													</article>
												))}
											</div>
										) : (
											<p className="empty-state">
												Nessun merchant ricorrente comprimibile nel range o nei
												filtri selezionati.
											</p>
										)}
									</div>

									{liquidityChartSeries.length ? (
										<div className="liquidity-chart">
											<div className="analytics-legend">
												<span>
													<i className="analytics-legend__bar" /> Spesa mensile
													selezionata
												</span>
												<span>
													<i className="analytics-legend__line" /> Risparmio
													mensile netto
												</span>
											</div>
											<div className="liquidity-chart__canvas">
												<svg
													aria-hidden="true"
													viewBox={`0 0 ${LIQUIDITY_CHART_WIDTH} ${LIQUIDITY_CHART_HEIGHT}`}
												>
													{liquidityChartScale.ticks.map((tick) => {
														const y = getChartY(
															tick,
															liquidityChartScale,
															LIQUIDITY_CHART_HEIGHT
														);

														return (
															<g key={tick}>
																<line
																	className="liquidity-chart__gridline"
																	x1={chartPadding.left}
																	x2={
																		LIQUIDITY_CHART_WIDTH - chartPadding.right
																	}
																	y1={y}
																	y2={y}
																/>
																<text
																	className="liquidity-chart__ylabel"
																	x="4"
																	y={y + 4}
																>
																	{formatAmount(tick)}
																</text>
															</g>
														);
													})}
													<line
														className="liquidity-chart__zeroline"
														x1={chartPadding.left}
														x2={LIQUIDITY_CHART_WIDTH - chartPadding.right}
														y1={liquidityZeroY}
														y2={liquidityZeroY}
													/>
													{liquidityChartSeries.map((point, index) => {
														const x = getChartX(
															index,
															liquidityChartSeries.length,
															LIQUIDITY_CHART_WIDTH
														);
														const barWidth = Math.max(
															18,
															Math.min(
																((LIQUIDITY_CHART_WIDTH -
																	chartPadding.left -
																	chartPadding.right) /
																	Math.max(liquidityChartSeries.length, 1)) *
																	0.48,
																48
															)
														);
														const spendY = getChartY(
															point.filteredSpend,
															liquidityChartScale,
															LIQUIDITY_CHART_HEIGHT
														);
														const barHeight = Math.abs(spendY - liquidityZeroY);

														return (
															<rect
																className="liquidity-chart__bar"
																height={barHeight}
																key={point.month}
																rx="8"
																width={barWidth}
																x={x - barWidth / 2}
																y={Math.min(liquidityZeroY, spendY)}
															/>
														);
													})}
													<polyline
														className="liquidity-chart__line"
														points={liquiditySavingsPoints}
													/>
													{liquidityChartSeries.map((point, index) => {
														const x = getChartX(
															index,
															liquidityChartSeries.length,
															LIQUIDITY_CHART_WIDTH
														);
														const y = getChartY(
															point.savings,
															liquidityChartScale,
															LIQUIDITY_CHART_HEIGHT
														);

														return (
															<circle
																className="liquidity-chart__dot"
																cx={x}
																cy={y}
																key={`${point.month}-dot`}
																r="4"
															/>
														);
													})}
													{liquidityChartSeries.map((point, index) => {
														const x = getChartX(
															index,
															liquidityChartSeries.length,
															LIQUIDITY_CHART_WIDTH
														);

														return (
															<text
																className="liquidity-chart__xlabel"
																key={`${point.month}-label`}
																textAnchor="middle"
																x={x}
																y={LIQUIDITY_CHART_HEIGHT - 10}
															>
																{formatMonth(point.month)}
															</text>
														);
													})}
												</svg>
											</div>
										</div>
									) : (
										<p className="empty-state">
											Nessun mese disponibile per il range selezionato.
										</p>
									)}
								</div>
							) : (
								<p className="empty-state">
									Importa un CSV per attivare il confronto mensile tra spesa
									selezionata e risparmio.
								</p>
							)}
						</article>

						<article className="panel movements-panel">
							<div className="panel-heading panel-heading--inline movements-header">
								<div>
									<h2>Movimenti</h2>
									<p>
										La lista vive solo nella sessione corrente. Puoi importare,
										confrontare, correggere e poi azzerare senza sporcare un
										archivio persistente.
									</p>
								</div>
								<span className="chip">
									{filteredTransactions.length
										? `${firstVisibleRow}-${lastVisibleRow}`
										: '0'}{' '}
									su {filteredTransactions.length} righe
								</span>
							</div>

							<div className="filter-toolbar">
								<div className="filter-toolbar__row">
									<label className="filter-control filter-control--search">
										<span>Ricerca libera</span>
										<input
											onChange={(event) =>
												setTransactionSearch(event.target.value)
											}
											placeholder="Merchant, categoria o testo originale"
											type="text"
											value={transactionSearch}
										/>
									</label>
									<label className="filter-control">
										<span>Mese</span>
										<select
											onChange={(event) =>
												setTransactionMonthFilter(event.target.value)
											}
											value={transactionMonthFilter}
										>
											<option value={ALL_FILTER_VALUE}>Tutti i mesi</option>
											{monthOptions.map((month) => (
												<option key={month} value={month}>
													{formatMonth(month)}
												</option>
											))}
										</select>
									</label>
									<label className="filter-control">
										<span>Categoria</span>
										<select
											onChange={(event) =>
												setTransactionCategoryFilter(event.target.value)
											}
											value={transactionCategoryFilter}
										>
											<option value={ALL_FILTER_VALUE}>
												Tutte le categorie
											</option>
											{categories.map((categoryOption) => (
												<option key={categoryOption} value={categoryOption}>
													{categoryOption}
												</option>
											))}
										</select>
									</label>
									<label className="filter-control">
										<span>Tipo movimento</span>
										<select
											onChange={(event) =>
												setAmountFilter(event.target.value as AmountFilter)
											}
											value={amountFilter}
										>
											<option value="all">Entrate e uscite</option>
											<option value="expenses">Solo uscite</option>
											<option value="income">Solo entrate</option>
										</select>
									</label>
								</div>

								<div className="filter-toolbar__meta">
									<p className="filter-summary">
										I filtri agiscono solo sul dataset corrente. Il reset svuota
										la sessione corrente senza toccare le regole salvate.
									</p>
									<button
										className="button button--secondary filter-reset"
										onClick={resetTransactionFilters}
										type="button"
									>
										Reset filtri
									</button>
								</div>
							</div>

							{filteredTransactions.length ? (
								<>
									<div className="table-shell table-shell--fixed">
										<table>
											<thead>
												<tr>
													<th>
														<input
															checked={allVisibleTransactionsSelected}
															onChange={(event) =>
																selectVisibleTransactions(event.target.checked)
															}
															type="checkbox"
														/>
													</th>
													<th>Data</th>
													<th>Descrizione originale</th>
													<th>Merchant letto</th>
													<th>Categoria</th>
													<th>Importo</th>
												</tr>
											</thead>
											<tbody>
												{paginatedTransactions.map((transaction) => (
													<tr
														className={
															selectedTransactionIds.includes(transaction.id)
																? 'is-selected'
																: ''
														}
														key={transaction.id}
													>
														<td>
															<input
																checked={selectedTransactionIds.includes(
																	transaction.id
																)}
																onChange={() =>
																	toggleTransactionSelection(transaction.id)
																}
																onClick={(event) => event.stopPropagation()}
																type="checkbox"
															/>
														</td>
														<td>{formatDate(transaction.date)}</td>
														<td
															className="cell-original-description"
															onClick={() => applySelection(transaction)}
														>
															<div className="cell-stack">
																<strong>
																	{transaction.originalDescription}
																</strong>
															</div>
														</td>
														<td className="cell-merchant">
															<button
																className="table-link"
																onClick={(event) => {
																	event.stopPropagation();
																	openCorrectionModal(transaction);
																}}
																type="button"
															>
																{transaction.normalizedDescription}
															</button>
														</td>
														<td>
															<span className="category-pill">
																{transaction.category}
															</span>
														</td>
														<td
															className={
																transaction.amount < 0
																	? 'amount amount--expense'
																	: 'amount amount--income'
															}
														>
															{formatAmount(transaction.amount)}
														</td>
													</tr>
												))}
											</tbody>
										</table>
									</div>
									<div className="pagination">
										<div className="pagination__meta">
											<strong>
												Pagina {currentTransactionPage} di{' '}
												{totalTransactionPages}
											</strong>
											<span>
												{TRANSACTIONS_PER_PAGE} righe per pagina, senza scroll
												verticale interno.
											</span>
										</div>
										<div className="pagination__controls">
											<button
												className="button button--secondary pagination__button"
												disabled={currentTransactionPage === 1}
												onClick={() =>
													setCurrentTransactionPage((page) =>
														Math.max(1, page - 1)
													)
												}
												type="button"
											>
												Precedente
											</button>
											{paginationItems.map((item, index) =>
												item === 'ellipsis' ? (
													<span
														className="pagination__ellipsis"
														key={`ellipsis-${index}`}
													>
														…
													</span>
												) : (
													<button
														className={`button pagination__button ${
															item === currentTransactionPage
																? 'pagination__button--active'
																: 'button--secondary'
														}`}
														key={item}
														onClick={() => setCurrentTransactionPage(item)}
														type="button"
													>
														{item}
													</button>
												)
											)}
											<button
												className="button button--secondary pagination__button"
												disabled={
													currentTransactionPage === totalTransactionPages
												}
												onClick={() =>
													setCurrentTransactionPage((page) =>
														Math.min(totalTransactionPages, page + 1)
													)
												}
												type="button"
											>
												Successiva
											</button>
										</div>
									</div>
								</>
							) : (
								<p className="empty-state">
									Nessun movimento corrisponde ai filtri attivi.
								</p>
							)}
						</article>
					</section>
				</>
			) : (
				<>
					<section className="hero-panel hero-panel--compact">
						<div>
							<span className="eyebrow">Regole</span>
							<h1>Normalizza una volta, riusa sempre.</h1>
							<p className="hero-copy">
								La libreria regole è separata dalla dashboard e può vivere nel
								browser oppure sincronizzarsi con il tuo account.
							</p>
						</div>
						<div className="hero-badge">
							<span className="hero-badge__label">Libreria</span>
							<strong>{isAuthenticated ? 'Sincronizzata' : 'Locale'}</strong>
							<span>
								{isAuthenticated
									? 'Le regole vengono salvate sul tuo account e restano riutilizzabili sui dispositivi collegati.'
									: 'Le regole restano in questo browser finché non scegli di sincronizzarle.'}
							</span>
						</div>
					</section>

					<section className="rules-grid">
						<article className="panel editor-panel">
							<div className="panel-heading">
								<h2>Editor regole merchant</h2>
								<p>
									Gestisci la libreria di regole attive.{' '}
									{isAuthenticated
										? 'Le regole sono sincronizzate sul tuo account.'
										: 'Le regole sono salvate nel browser locale.'}
								</p>
							</div>
							<div className="inline-actions inline-actions--compact">
								<button
									className="button button--secondary"
									onClick={() => populateRuleEditor(null)}
									type="button"
								>
									Nuova regola
								</button>
								<button
									className="button button--secondary"
									onClick={seedRuleEditorFromTransaction}
									type="button"
								>
									Usa movimento selezionato
								</button>
							</div>

							<form className="editor-form" onSubmit={handleSaveRule}>
								<label>
									<span>Pattern</span>
									<input
										onChange={(event) =>
											setRuleEditorPattern(event.target.value)
										}
										placeholder="Es. LIDL o BONIFICO STIPENDIO"
										type="text"
										value={ruleEditorPattern}
									/>
								</label>

								<label>
									<span>Tipo pattern</span>
									<select
										onChange={(event) =>
											setRuleEditorPatternType(
												event.target.value as RulePatternType
											)
										}
										value={ruleEditorPatternType}
									>
										<option value="contains">Contains</option>
										<option value="regex">Regex</option>
									</select>
								</label>

								<label>
									<span>Priorita</span>
									<input
										min={0}
										onChange={(event) =>
											setRuleEditorPriority(Number(event.target.value) || 0)
										}
										type="number"
										value={ruleEditorPriority}
									/>
								</label>

								<label>
									<span>Merchant normalizzato</span>
									<input
										onChange={(event) => setRuleEditorName(event.target.value)}
										type="text"
										value={ruleEditorName}
									/>
								</label>

								<label>
									<span>Categoria</span>
									<select
										onChange={(event) =>
											setRuleEditorCategory(event.target.value)
										}
										value={ruleEditorCategory}
									>
										{categories.map((categoryOption) => (
											<option key={categoryOption} value={categoryOption}>
												{categoryOption}
											</option>
										))}
									</select>
								</label>

								{selectedRule ? (
									<p className="inline-note">
										Stai modificando una regola{' '}
										{selectedRule.source === 'default' ? 'default' : 'custom'}.
										La priorita piú alta vince quando piu regole matchano la
										stessa riga.
									</p>
								) : null}

								<div className="inline-actions">
									<button
										className="button button--primary"
										disabled={isRuleSaving}
										type="submit"
									>
										{isRuleSaving
											? 'Salvataggio...'
											: selectedRule
											? 'Aggiorna regola'
											: 'Crea regola'}
									</button>
									<button
										className="button button--danger"
										disabled={!selectedRule || isRuleDeleting}
										onClick={handleDeleteRule}
										type="button"
									>
										{isRuleDeleting
											? 'Salvataggio...'
											: selectedRule?.source === 'default'
											? 'Disattiva regola default'
											: 'Elimina regola'}
									</button>
								</div>
							</form>
						</article>

						<article className="panel rule-list-panel">
							<div className="panel-heading panel-heading--inline">
								<div>
									<h2>Libreria regole</h2>
									<p>
										Vista effettiva: include regole default, override, priorita
										e regole custom.
									</p>
								</div>
								<span className="chip">
									{filteredRules.length} su {effectiveRules.length} regole
								</span>
							</div>
							<label className="search-field search-field--rules">
								<span>Ricerca regole</span>
								<input
									onChange={(event) => setRuleSearch(event.target.value)}
									placeholder="Pattern, merchant o categoria"
									type="text"
									value={ruleSearch}
								/>
							</label>
							{filteredRules.length ? (
								<div className="rule-list">
									{filteredRules.map((rule) => (
										<button
											className={`rule-card ${
												rule.id === selectedRuleId ? 'is-selected' : ''
											}`}
											key={rule.id}
											onClick={() => populateRuleEditor(rule)}
											type="button"
										>
											<div className="rule-card__topline">
												<strong>{rule.normalizedName}</strong>
												<span className="category-pill">{rule.category}</span>
											</div>
											<span className="rule-card__pattern">{rule.pattern}</span>
											<small>
												{rule.source === 'default' ? 'Default' : 'Custom'} ·{' '}
												{rule.patternType === 'regex' ? 'Regex' : 'Contains'} ·{' '}
												priorita {rule.priority} · aggiornato il{' '}
												{formatDate(rule.updatedAt)}
											</small>
										</button>
									))}
								</div>
							) : (
								<p className="empty-state">
									Nessuna regola corrisponde alla ricerca corrente.
								</p>
							)}
						</article>
					</section>
				</>
			)}

			{isCorrectionModalOpen ? (
				<div className="modal-backdrop" onClick={closeCorrectionModal}>
					<div
						className="modal-card"
						onClick={(event) => event.stopPropagation()}
					>
						<div className="panel-heading panel-heading--inline">
							<div>
								<h2>Correzione manuale multi-riga</h2>
								<p>
									Aggiorni merchant e categoria delle righe selezionate. Se
									salvi anche una regola, vedi subito quante continuano a
									matchare.
								</p>
							</div>
							<button
								className="button button--secondary"
								onClick={closeCorrectionModal}
								type="button"
							>
								Chiudi
							</button>
						</div>

						<form className="editor-form" onSubmit={handleSaveTransaction}>
							<div className="editor-highlight">
								<span>Righe in modifica</span>
								<strong>{selectedTransactions.length}</strong>
								<small>
									Merchant in focus:{' '}
									{selectedTransaction?.normalizedDescription || 'Nessuno'}
								</small>
							</div>

							{selectedTransactions.length ? (
								<div className="selection-pills">
									{selectedTransactions.slice(0, 6).map((transaction) => (
										<span className="chip" key={transaction.id}>
											{transaction.normalizedDescription}
										</span>
									))}
									{selectedTransactions.length > 6 ? (
										<span className="chip">
											+{selectedTransactions.length - 6} righe
										</span>
									) : null}
								</div>
							) : null}

							<div className="dashboard-form-grid">
								<label>
									<span>Merchant normalizzato</span>
									<input
										onChange={(event) =>
											setNormalizedDescription(event.target.value)
										}
										type="text"
										value={normalizedDescription}
									/>
								</label>

								<label>
									<span>Categoria</span>
									<select
										onChange={(event) => setCategory(event.target.value)}
										value={category}
									>
										{categories.map((categoryOption) => (
											<option key={categoryOption} value={categoryOption}>
												{categoryOption}
											</option>
										))}
									</select>
								</label>

								<label>
									<span>Pattern regola</span>
									<input
										disabled={!saveAsRule}
										onChange={(event) => setRulePattern(event.target.value)}
										placeholder="Es. AMAZON o STIPENDIO"
										type="text"
										value={rulePattern}
									/>
								</label>

								<label>
									<span>Tipo pattern</span>
									<select
										disabled={!saveAsRule}
										onChange={(event) =>
											setRulePatternType(event.target.value as RulePatternType)
										}
										value={rulePatternType}
									>
										<option value="contains">Contains</option>
										<option value="regex">Regex</option>
									</select>
								</label>

								<label>
									<span>Priorita regola</span>
									<input
										disabled={!saveAsRule}
										min={0}
										onChange={(event) =>
											setRulePriority(Number(event.target.value) || 0)
										}
										type="number"
										value={rulePriority}
									/>
								</label>
							</div>

							<label className="checkbox-row">
								<input
									checked={saveAsRule}
									onChange={(event) => setSaveAsRule(event.target.checked)}
									type="checkbox"
								/>
								<span>
									Salva anche una regola riutilizzabile{' '}
									{isAuthenticated ? 'sincronizzata' : 'nel browser'}
								</span>
							</label>

							{saveAsRule ? (
								<p className="inline-note">
									Con questa configurazione la regola continua a matchare{' '}
									{manualRulePreviewCount} righe su{' '}
									{selectedTransactions.length} selezionate.
								</p>
							) : null}

							<div className="inline-actions">
								<button
									className="button button--primary"
									disabled={isSaving}
									type="submit"
								>
									{isSaving
										? 'Salvataggio...'
										: 'Applica alle righe selezionate'}
								</button>
								<button
									className="button button--secondary"
									onClick={() => setSelectedTransactionIds([])}
									type="button"
								>
									Azzera selezione
								</button>
							</div>
						</form>
					</div>
				</div>
			) : null}
		</main>
	);
}
