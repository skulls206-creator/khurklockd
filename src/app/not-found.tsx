import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-bg-primary p-8 text-center">
      <h1 className="text-4xl font-bold text-text-primary mb-4">404</h1>
      <h2 className="text-lg text-text-secondary mb-6">Page Not Found</h2>
      <p className="text-sm text-text-muted max-w-md mb-8">
        The page you are looking for does not exist or has been moved.
        Your encrypted vault data is safe and was not affected.
      </p>
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-accent text-white font-medium text-sm hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-1 focus-visible:ring-offset-bg-primary transition-colors"
      >
        Return to Vault
      </Link>
    </main>
  );
}
