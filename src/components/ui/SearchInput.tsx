"use client";

import {
  type InputHTMLAttributes,
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

export interface SearchInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "type"> {
  /** Debounced onChange (300ms). Receives the current value string. */
  onSearch: (value: string) => void;
  /** Time in ms to debounce. Default 300. */
  debounceMs?: number;
  /** Clear button callback. Also clears the input. */
  onClear?: () => void;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  function SearchInput(
    {
      onSearch,
      debounceMs = 300,
      onClear,
      placeholder = "Search...",
      className = "",
      value: controlledValue,
      defaultValue,
      ...rest
    },
    ref,
  ) {
    const [internalValue, setInternalValue] = useState(
      (controlledValue as string) ?? defaultValue?.toString() ?? "",
    );
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const currentValue =
      controlledValue !== undefined ? (controlledValue as string) : internalValue;

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        if (controlledValue === undefined) {
          setInternalValue(val);
        }

        if (debounceRef.current) {
          clearTimeout(debounceRef.current);
        }
        debounceRef.current = setTimeout(() => {
          onSearch(val);
        }, debounceMs);
      },
      [controlledValue, debounceMs, onSearch],
    );

    const handleClear = useCallback(() => {
      if (controlledValue === undefined) {
        setInternalValue("");
      }
      onSearch("");
      onClear?.();
    }, [controlledValue, onClear, onSearch]);

    useEffect(() => {
      return () => {
        if (debounceRef.current) {
          clearTimeout(debounceRef.current);
        }
      };
    }, []);

    return (
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>

        <input
          ref={ref}
          type="text"
          value={currentValue}
          onChange={handleChange}
          placeholder={placeholder}
          className={[
            "w-full rounded-md border border-border pl-10 pr-8 py-2 text-sm",
            "bg-surface text-text-primary placeholder:text-text-muted",
            "transition-colors duration-150",
            "focus:outline-none focus:ring-2 focus:ring-border-focus focus:border-transparent",
            className,
          ].join(" ")}
          {...rest}
        />

        {currentValue.length > 0 && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Clear search"
            className={[
              "absolute right-2 top-1/2 -translate-y-1/2",
              "text-text-muted hover:text-text-primary",
              "transition-colors duration-150",
              "p-0.5 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
            ].join(" ")}
          >
            <svg
              className="h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>
    );
  },
);

export default SearchInput;
