export const metadata = {
  title: "Offline — Khurklockd",
};

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary px-4">
      <div className="w-full max-w-sm text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent-muted mb-4">
          <svg
            className="h-8 w-8 text-accent"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-text-primary">You&apos;re offline</h1>
        <p className="text-sm text-text-muted mt-2">
          Khurklockd works offline once installed. Reconnect to sync the latest
          app updates, or reload to retry.
        </p>
        <p className="text-xs text-text-muted mt-6">
          Your encrypted vault is stored locally and remains accessible without
          a network connection.
        </p>
      </div>
    </div>
  );
}
