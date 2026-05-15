"use client";

import { useCallback, useState } from "react";
import { useVault } from "@/hooks/useVault";
import { useClipboard } from "@/hooks/useClipboard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PasswordField } from "@/components/vault/PasswordField";

export default function GeneratorPage() {
  const { generatePassword } = useVault();
  const { copy, copied } = useClipboard({ clearAfterMs: 30_000 });

  const [password, setPassword] = useState(() => generatePassword());

  const [length, setLength] = useState(20);
  const [includeUppercase, setIncludeUppercase] = useState(true);
  const [includeLowercase, setIncludeLowercase] = useState(true);
  const [includeNumbers, setIncludeNumbers] = useState(true);
  const [includeSymbols, setIncludeSymbols] = useState(true);
  const [excludeAmbiguous, setExcludeAmbiguous] = useState(false);
  const [passphraseMode, setPassphraseMode] = useState(false);
  const [wordCount, setWordCount] = useState(4);
  const [separator, setSeparator] = useState("-");
  const [capitalize, setCapitalize] = useState(false);
  const [includeNumber, setIncludeNumber] = useState(false);

  const handleRegenerate = useCallback(() => {
    const pw = generatePassword({
      length,
      includeUppercase,
      includeLowercase,
      includeNumbers,
      includeSymbols,
      excludeAmbiguous,
      passphraseMode,
      passphraseWordCount: wordCount,
      passphraseSeparator: separator,
    });
    setPassword(pw);
  }, [
    generatePassword,
    length,
    includeUppercase,
    includeLowercase,
    includeNumbers,
    includeSymbols,
    excludeAmbiguous,
    passphraseMode,
    wordCount,
    separator,
  ]);

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">
          Password Generator
        </h1>
        <p className="text-sm text-text-muted mt-1">
          Cryptographically secure random passwords.
        </p>
      </div>

      {/* Output */}
      <Card>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <p className="flex-1 font-password text-base text-text-primary break-all">
              {password}
            </p>
            <button
              type="button"
              onClick={() => copy(password)}
              aria-label="Copy password"
              className={[
                "p-2 rounded-md transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
                copied
                  ? "text-success bg-success-muted"
                  : "text-text-muted hover:text-text-primary",
              ].join(" ")}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                {copied ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                )}
              </svg>
            </button>
            <Button variant="secondary" size="sm" onClick={handleRegenerate}>
              Regenerate
            </Button>
          </div>

          <PasswordField value={password} autoHideMs={0} showStrength />
        </div>
      </Card>

      {/* Configuration */}
      <Card header="Configuration">
        <div className="space-y-5">
          {/* Mode toggle */}
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={!passphraseMode}
                onChange={() => setPassphraseMode(false)}
                className="text-accent focus:ring-border-focus"
              />
              <span className="text-sm text-text-primary">Password</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={passphraseMode}
                onChange={() => setPassphraseMode(true)}
                className="text-accent focus:ring-border-focus"
              />
              <span className="text-sm text-text-primary">Passphrase</span>
            </label>
          </div>

          {!passphraseMode && (
            <>
              {/* Length slider */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <label htmlFor="gen-password-length" className="text-sm text-text-secondary">
                    Length
                  </label>
                  <span className="text-sm font-mono text-text-primary">
                    {length}
                  </span>
                </div>
                <input
                  id="gen-password-length"
                  type="range"
                  min={4}
                  max={128}
                  value={length}
                  onChange={(e) => setLength(Number(e.target.value))}
                  className="w-full accent-accent"
                />
              </div>

              {/* Character set checkboxes */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  {
                    label: "Uppercase (A-Z)",
                    checked: includeUppercase,
                    set: setIncludeUppercase,
                  },
                  {
                    label: "Lowercase (a-z)",
                    checked: includeLowercase,
                    set: setIncludeLowercase,
                  },
                  {
                    label: "Numbers (0-9)",
                    checked: includeNumbers,
                    set: setIncludeNumbers,
                  },
                  {
                    label: "Symbols (!@#$...)",
                    checked: includeSymbols,
                    set: setIncludeSymbols,
                  },
                ].map(({ label, checked, set }) => (
                  <label
                    key={label}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => set(e.target.checked)}
                      className="rounded border-border bg-surface text-accent focus:ring-border-focus"
                    />
                    <span className="text-sm text-text-secondary">
                      {label}
                    </span>
                  </label>
                ))}
              </div>

              {/* Exclude ambiguous */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={excludeAmbiguous}
                  onChange={(e) => setExcludeAmbiguous(e.target.checked)}
                  className="rounded border-border bg-surface text-accent focus:ring-border-focus"
                />
                <span className="text-sm text-text-secondary">
                  Exclude ambiguous characters (Il1O0)
                </span>
              </label>
            </>
          )}

          {passphraseMode && (
            <>
              {/* Word count */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <label htmlFor="gen-word-count" className="text-sm text-text-secondary">
                    Word Count
                  </label>
                  <span className="text-sm font-mono text-text-primary">
                    {wordCount}
                  </span>
                </div>
                <input
                  id="gen-word-count"
                  type="range"
                  min={3}
                  max={10}
                  value={wordCount}
                  onChange={(e) => setWordCount(Number(e.target.value))}
                  className="w-full accent-accent"
                />
              </div>

              {/* Separator */}
              <div className="space-y-1">
                <label htmlFor="gen-separator" className="text-sm text-text-secondary">
                  Word Separator
                </label>
                <input
                  id="gen-separator"
                  type="text"
                  value={separator}
                  onChange={(e) => setSeparator(e.target.value || "-")}
                  className="w-full rounded-md border border-border px-3 py-2 text-sm bg-surface text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-border-focus focus:border-transparent"
                />
              </div>

              {/* Capitalize & Number */}
              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={capitalize}
                    onChange={(e) => setCapitalize(e.target.checked)}
                    className="rounded border-border bg-surface text-accent focus:ring-border-focus"
                  />
                  <span className="text-sm text-text-secondary">
                    Capitalize Words
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeNumber}
                    onChange={(e) => setIncludeNumber(e.target.checked)}
                    className="rounded border-border bg-surface text-accent focus:ring-border-focus"
                  />
                  <span className="text-sm text-text-secondary">
                    Append Number
                  </span>
                </label>
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
