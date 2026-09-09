import { useEffect, useRef, useState } from 'react';

import { useDebouncedValue } from '../useDebouncedValue';

export type SearchableMultiSelectOption = {
	value: string;
	label: string;
	helperText?: string;
	searchText?: string;
};

export function SearchableMultiSelect(props: {
	label: string;
	placeholder: string;
	searchPlaceholder: string;
	emptyMessage: string;
	options: SearchableMultiSelectOption[];
	selectedValues: string[];
	onToggleValue: (value: string) => void;
	onClearSelection: () => void;
	resetVersion: number;
	selectionSummary: string;
	selectedCountLabel: string;
}) {
	const {
		label,
		placeholder,
		searchPlaceholder,
		emptyMessage,
		options,
		selectedValues,
		onToggleValue,
		onClearSelection,
		resetVersion,
		selectionSummary,
		selectedCountLabel,
	} = props;
	const [isOpen, setIsOpen] = useState(false);
	const [searchValue, setSearchValue] = useState('');
	const containerRef = useRef<HTMLDivElement | null>(null);
	const debouncedSearch = useDebouncedValue(searchValue);
	const normalizedSearch = debouncedSearch.trim().toLowerCase();
	const filteredOptions = options.filter((option) =>
		normalizedSearch.length === 0
			? true
			: [option.label, option.helperText, option.searchText]
					.filter(Boolean)
					.join(' ')
					.toLowerCase()
					.includes(normalizedSearch)
	);

	useEffect(() => {
		setSearchValue('');
		setIsOpen(false);
	}, [resetVersion]);

	useEffect(() => {
		if (!isOpen || typeof window === 'undefined') {
			return;
		}

		function handlePointerDown(event: MouseEvent) {
			if (
				containerRef.current &&
				!containerRef.current.contains(event.target as Node)
			) {
				setIsOpen(false);
			}
		}

		function handleKeyDown(event: KeyboardEvent) {
			if (event.key === 'Escape') {
				setIsOpen(false);
			}
		}

		window.addEventListener('mousedown', handlePointerDown);
		window.addEventListener('keydown', handleKeyDown);

		return () => {
			window.removeEventListener('mousedown', handlePointerDown);
			window.removeEventListener('keydown', handleKeyDown);
		};
	}, [isOpen]);

	return (
		<div className={`search-select ${isOpen ? 'is-open' : ''}`} ref={containerRef}>
			<span className="search-select__label">{label}</span>
			<button
				aria-expanded={isOpen}
				className="search-select__trigger"
				onClick={() => setIsOpen((currentValue) => !currentValue)}
				type="button"
			>
				<span className="search-select__summary">
					{selectedValues.length === 0 ? placeholder : selectionSummary}
				</span>
				<span className="search-select__meta">
					<strong>{selectedValues.length === 0 ? 'Tutti' : selectedValues.length}</strong>
					<small>{selectedCountLabel}</small>
				</span>
			</button>
			{isOpen ? (
				<div className="search-select__panel">
					<label className="search-select__search">
						<input
							autoFocus
							onChange={(event) => setSearchValue(event.target.value)}
							placeholder={searchPlaceholder}
							type="search"
							value={searchValue}
						/>
					</label>
					<div className="search-select__panel-meta">
						<span>
							{selectedValues.length
								? `${selectedValues.length} filtri attivi`
								: 'Nessun filtro attivo'}
						</span>
						<button
							className="search-select__clear"
							onClick={() => {
								onClearSelection();
								setSearchValue('');
							}}
							type="button"
						>
							Pulisci
						</button>
					</div>
					<div className="search-select__options">
						{filteredOptions.length ? (
							filteredOptions.map((option) => {
								const isSelected = selectedValues.includes(option.value);

								return (
									<button
										className={`search-select__option ${isSelected ? 'is-active' : ''}`}
										key={option.value}
										onClick={() => onToggleValue(option.value)}
										type="button"
									>
										<span>{option.label}</span>
										{option.helperText ? <small>{option.helperText}</small> : null}
									</button>
								);
							})
						) : (
							<p className="empty-state">{emptyMessage}</p>
						)}
					</div>
				</div>
			) : null}
		</div>
	);
}
