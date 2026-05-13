export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-bg-primary text-text-primary">
      <div className="flex flex-col items-center gap-6 text-center">
        {/* Lock icon placeholder */}
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-border bg-surface">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-accent"
          >
            <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>

        <div>
          <h1 className="text-3xl font-bold tracking-tight">Khurklockd</h1>
          <p className="mt-2 max-w-md text-text-secondary leading-relaxed">
            A local-first, encrypted password manager and digital vault for Web3.
            Your keys, your control.
          </p>
        </div>

        <div className="flex gap-3">
          <div className="rounded-lg border border-border bg-surface px-4 py-2 text-sm text-text-secondary">
            <span className="font-mono text-success">AES-256-GCM</span>
            {" "}Encryption
          </div>
          <div className="rounded-lg border border-border bg-surface px-4 py-2 text-sm text-text-secondary">
            <span className="font-mono text-accent">Argon2id</span>
            {" "}Key Derivation
          </div>
          <div className="rounded-lg border border-border bg-surface px-4 py-2 text-sm text-text-secondary">
            <span className="font-mono text-cyan">Lighthouse</span>
            {" "}Backup
          </div>
        </div>

        <p className="mt-4 text-sm text-text-muted">
          Vault initialization coming soon.
        </p>
      </div>
    </main>
  );
}
