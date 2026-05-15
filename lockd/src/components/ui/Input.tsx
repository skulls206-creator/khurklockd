"use client";

import {
  type InputHTMLAttributes,
  forwardRef,
  useId,
  useState,
  useCallback,
} from "react";

export type InputType = "text" | "password" | "email" | "number";

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "size"> {
  label?: string;
  hint?: string;
  error?: string | null;
  type?: InputType;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input(
    {
      label,
      hint,
      error,
      type = "text",
      className = "",
      disabled,
      id: idProp,
      ...rest
    },
    ref,
  ) {
    const autoId = useId();
    const id = idProp ?? autoId;
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === "password";
    const resolvedType = isPassword && showPassword ? "text" : type;

    const togglePassword = useCallback(() => {
      setShowPassword((prev) => !prev);
    }, []);

    const hasError = !!error;

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label
            htmlFor={id}
            className="text-sm font-medium text-text-primary"
          >
            {label}
          </label>
        )}

        <div className="relative">
          <input
            ref={ref}
            id={id}
            type={resolvedType}
            disabled={disabled}
            aria-invalid={hasError ? "true" : undefined}
            aria-describedby={
              hasError ? `${id}-error` : hint ? `${id}-hint` : undefined
            }
            className={[
              "w-full rounded-md border px-3 py-2 text-sm",
              "bg-surface text-text-primary placeholder:text-text-muted",
              "transition-colors duration-150",
              "focus:outline-none focus:ring-2 focus:ring-border-focus focus:border-transparent",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              hasError
                ? "border-danger focus:ring-danger"
                : "border-border",
              isPassword ? "pr-10" : "",
              className,
            ]
              .filter(Boolean)
              .join(" ")}
            {...rest}
          />

          {isPassword && (
            <button
              type="button"
              onClick={togglePassword}
              tabIndex={-1}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className={[
                "absolute right-2 top-1/2 -translate-y-1/2",
                "text-text-muted hover:text-text-secondary",
                "transition-colors duration-150",
                "p-1 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
              ].join(" ")}
            >
              {showPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M15 12a3 3 0 01-6 0m6 0a3 3 0 01-6 0m0 0l6 6M4 4l16 16" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          )}
        </div>

        {hint && !hasError && (
          <p id={`${id}-hint`} className="text-xs text-text-muted">
            {hint}
          </p>
        )}

        {hasError && (
          <p id={`${id}-error`} className="text-xs text-danger" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  },
);

export default Input;
