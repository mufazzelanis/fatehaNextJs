import Link from "next/link";

/** Shown where contact details used to be typed: they now come from Admin → Business Info. */
export function BusinessNote({ items }: { items: { label: string; value: string }[] }) {
  return (
    <div className="rounded-xl bg-sky-50 p-4 text-sm ring-1 ring-sky-200">
      <dl className="space-y-1">
        {items.map((i) => (
          <div key={i.label} className="flex flex-wrap gap-x-2">
            <dt className="text-sky-800/80">{i.label}:</dt>
            <dd className="font-semibold text-sky-950">{i.value || <span className="font-normal italic text-sky-700/70">not set</span>}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-xs text-sky-900">
        These come from <Link href="/admin/business" className="font-semibold underline">Business Info</Link> — change them there once and the whole website updates.
      </p>
    </div>
  );
}
