'use client';

import { useEffect, useId, useRef, useState } from 'react';

import type { StockSearchItem } from '@/data/stocks';
import {
  STOCK_SEARCH_EMPTY_MESSAGE,
  formatStockDisplay,
  searchStocks,
  type StockSearchSuggestion,
} from '@/lib/stockSearch';

const SEARCH_DEBOUNCE_MS = 240;

type StockSearchInputProps = {
  inputValue: string;
  selectedStock: StockSearchItem | null;
  errorMessage: string | null;
  disabled?: boolean;
  placeholder: string;
  onErrorMessageChange: (message: string | null) => void;
  onInputValueChange: (value: string) => void;
  onSelectedStockChange: (stock: StockSearchItem | null) => void;
};

export function StockSearchInput({
  inputValue,
  selectedStock,
  errorMessage,
  disabled = false,
  placeholder,
  onErrorMessageChange,
  onInputValueChange,
  onSelectedStockChange,
}: StockSearchInputProps) {
  const [suggestions, setSuggestions] = useState<StockSearchSuggestion[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listboxId = useId();
  const activeOptionId =
    isOpen && highlightedIndex >= 0 ? `${listboxId}-option-${highlightedIndex}` : undefined;
  const trimmedValue = inputValue.trim();

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, []);

  useEffect(() => {
    if (!trimmedValue) {
      return;
    }

    const timer = window.setTimeout(() => {
      const nextSuggestions = searchStocks(trimmedValue);

      setSuggestions(nextSuggestions);
      setHighlightedIndex(nextSuggestions.length > 0 ? 0 : -1);
      setIsLoading(false);

      if (isFocused) {
        setIsOpen(true);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [isFocused, trimmedValue]);

  function handleSelect(stock: StockSearchItem) {
    onSelectedStockChange(stock);
    onInputValueChange(formatStockDisplay(stock));
    onErrorMessageChange(null);
    setHighlightedIndex(0);
    setIsOpen(false);
    inputRef.current?.focus();
  }

  function handleInputChange(value: string) {
    const nextTrimmedValue = value.trim();

    onInputValueChange(value);
    onSelectedStockChange(null);
    onErrorMessageChange(null);

    if (!nextTrimmedValue) {
      setSuggestions([]);
      setHighlightedIndex(-1);
      setIsLoading(false);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    setIsOpen(true);
  }

  function handleArrowNavigation(direction: 1 | -1) {
    if (suggestions.length === 0) {
      return;
    }

    setIsOpen(true);
    setHighlightedIndex((currentIndex) => {
      if (currentIndex < 0) {
        return direction > 0 ? 0 : suggestions.length - 1;
      }

      return (currentIndex + direction + suggestions.length) % suggestions.length;
    });
  }

  const shouldShowEmptyState =
    isOpen && !isLoading && trimmedValue.length > 0 && suggestions.length === 0;

  return (
    <div className="relative" ref={containerRef}>
      <input
        ref={inputRef}
        aria-activedescendant={activeOptionId}
        aria-autocomplete="list"
        aria-controls={listboxId}
        aria-expanded={isOpen}
        aria-label="股票代码"
        autoCapitalize="off"
        autoComplete="off"
        autoCorrect="off"
        className="mystic-input mt-2 pr-12 text-[1.16rem] tracking-[0.08em] sm:text-[1.22rem]"
        disabled={disabled}
        inputMode="search"
        name="stockCode"
        onChange={(event) => handleInputChange(event.target.value)}
        onCompositionEnd={() => setIsComposing(false)}
        onCompositionStart={() => setIsComposing(true)}
        onFocus={() => {
          setIsFocused(true);
          if (trimmedValue) {
            setIsOpen(true);
          }
        }}
        onKeyDown={(event) => {
          if (isComposing) {
            return;
          }

          if (event.key === 'ArrowDown') {
            event.preventDefault();
            handleArrowNavigation(1);
            return;
          }

          if (event.key === 'ArrowUp') {
            event.preventDefault();
            handleArrowNavigation(-1);
            return;
          }

          if (
            event.key === 'Enter' &&
            isOpen &&
            highlightedIndex >= 0 &&
            suggestions[highlightedIndex]
          ) {
            event.preventDefault();
            handleSelect(suggestions[highlightedIndex]);
            return;
          }

          if (event.key === 'Escape') {
            setIsOpen(false);
          }
        }}
        onBlur={() => {
          setIsFocused(false);
        }}
        placeholder={placeholder}
        role="combobox"
        spellCheck={false}
        value={inputValue}
      />

      {selectedStock ? (
        <div className="mt-2 text-xs leading-6 tracking-[0.08em] text-[var(--text-muted)]">
          已锁定标的: {formatStockDisplay(selectedStock)}
        </div>
      ) : null}

      {isOpen ? (
        <div
          className="absolute inset-x-0 top-[calc(100%+0.7rem)] z-30 overflow-hidden rounded-[1.35rem] border border-[var(--border-strong)] bg-[linear-gradient(180deg,rgba(36,23,19,0.95),rgba(22,15,12,0.96))] shadow-[0_30px_60px_rgba(6,3,2,0.42),inset_0_1px_0_rgba(255,243,223,0.08)] backdrop-blur-xl"
          data-testid="stock-search-listbox-shell"
        >
          <div
            aria-label="股票候选"
            className="max-h-[18rem] overflow-y-auto p-2 sm:max-h-[20rem]"
            id={listboxId}
            role="listbox"
          >
            {isLoading ? (
              <div className="px-4 py-4 text-sm text-[var(--text-muted)]">命盘检索器聚集中...</div>
            ) : null}

            {!isLoading
              ? suggestions.map((stock, index) => {
                  const isHighlighted = index === highlightedIndex;

                  return (
                    <button
                      key={stock.code}
                      aria-selected={selectedStock?.code === stock.code || isHighlighted}
                      className={[
                        'flex w-full items-center justify-between gap-3 rounded-[1.05rem] px-4 py-3 text-left transition',
                        isHighlighted
                          ? 'border border-[var(--border-strong)] bg-[rgba(255,244,220,0.08)] shadow-[0_0_0_1px_rgba(224,177,92,0.16),inset_0_1px_0_rgba(255,244,220,0.08)]'
                          : 'border border-transparent hover:border-[var(--border-soft)] hover:bg-[rgba(255,244,220,0.04)]',
                      ].join(' ')}
                      id={`${listboxId}-option-${index}`}
                      onClick={() => handleSelect(stock)}
                      onMouseDown={(event) => event.preventDefault()}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      role="option"
                      type="button"
                    >
                      <span className="min-w-0">
                        <span className="block text-base font-medium text-[var(--text-primary)]">
                          {formatStockDisplay(stock)}
                        </span>
                        <span className="mt-1 block text-xs tracking-[0.08em] text-[var(--text-muted)]">
                          {stock.exchange ?? 'A股'} 命盘候选
                        </span>
                      </span>
                      <span className="shrink-0 rounded-full border border-[var(--border-soft)] bg-[rgba(255,247,232,0.05)] px-3 py-1 text-[11px] tracking-[0.18em] text-[var(--accent-strong)]">
                        {stock.market}
                      </span>
                    </button>
                  );
                })
              : null}

            {shouldShowEmptyState ? (
              <div className="px-4 py-4 text-sm leading-6 text-[var(--text-muted)]">
                {STOCK_SEARCH_EMPTY_MESSAGE}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {errorMessage ? (
        <p
          className="mt-3 rounded-[1rem] border border-[rgba(214,103,61,0.24)] bg-[rgba(125,37,22,0.14)] px-4 py-3 text-sm leading-6 text-[rgba(255,223,194,0.92)]"
          role="alert"
        >
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
