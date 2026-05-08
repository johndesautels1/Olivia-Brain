"use client";

interface PrintButtonProps {
  title: string;
}

export function PrintButton({ title }: PrintButtonProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <button
      onClick={handlePrint}
      className="flex items-center gap-2 rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-2 text-xs text-[var(--muted)] hover:text-[var(--foreground)] hover:border-indigo-500/50 transition-colors print:hidden"
      title={`Print or save "${title}" as PDF`}
      aria-label="Print or save as PDF"
    >
      <svg
        className="h-4 w-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="6 9 6 2 18 2 18 9" />
        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
        <rect width="12" height="8" x="6" y="14" />
      </svg>
      Print / PDF
    </button>
  );
}
