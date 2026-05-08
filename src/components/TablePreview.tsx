type QueryResult<T> = {
  data: T[] | null;
  error: { message: string; code?: string; hint?: string } | null;
  label: string;
};

function formatError(err: NonNullable<QueryResult<unknown>["error"]>) {
  const parts = [err.message];
  if (err.hint) parts.push(`Hint: ${err.hint}`);
  if (err.code) parts.push(`(code ${err.code})`);
  return parts.join(" ");
}

export function TablePreview<T extends Record<string, unknown>>({
  label,
  data,
  error,
}: QueryResult<T>) {
  return (
    <div className="rounded-md border border-zinc-200 bg-zinc-50/80 p-3 dark:border-zinc-700 dark:bg-zinc-950/50">
      <h3 className="mb-2 font-mono text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {label}
      </h3>
      {error ? (
        <p className="text-sm leading-relaxed text-red-700 dark:text-red-400">
          {formatError(error)}
        </p>
      ) : data && data.length > 0 ? (
        <ul className="max-h-48 space-y-2 overflow-y-auto text-sm">
          {data.map((row, i) => (
            <li
              key={i}
              className="rounded border border-zinc-200 bg-white p-2 font-mono text-xs text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
            >
              <pre className="whitespace-pre-wrap break-all">
                {JSON.stringify(row, null, 2)}
              </pre>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          No rows (or empty table). Query succeeded.
        </p>
      )}
    </div>
  );
}
