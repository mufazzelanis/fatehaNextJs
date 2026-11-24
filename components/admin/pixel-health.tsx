import { pixelHealth } from "@/lib/meta/capi";

const ago = (d: Date | null) => {
  if (!d) return "";
  const min = Math.round((Date.now() - new Date(d).getTime()) / 60000);
  return min < 1 ? "just now" : min < 60 ? `${min} min ago` : `${Math.round(min / 60)} h ago`;
};

/**
 * Conversions API health for the last 24 hours, per pixel, from the event log: how many events Facebook
 * accepted / refused and the last refusal in plain words. Red when a pixel only fails (usually a wrong token).
 */
export async function PixelHealth({ pixels, title = "Conversions API health · last 24 hours", capiOn }: {
  pixels: { id: string; label: string; where: string; hasToken: boolean }[]; title?: string; capiOn: boolean;
}) {
  const list = pixels.filter((p, i) => pixels.findIndex((x) => x.id === p.id && x.where === p.where) === i);
  if (!list.length) return null;
  const health = await pixelHealth([...new Set(list.map((p) => p.id))]);
  const broken = list.filter((p) => { const h = health[p.id]; return h && h.failed > 0 && h.ok === 0; });
  return (
    <section className={`a-card p-5 ${broken.length ? "ring-2 ring-rose-300" : ""}`}>
      <h2 className="font-medium text-slate-900">{title}</h2>
      {broken.length > 0 && (
        <p className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-800 ring-1 ring-rose-200">
          ⚠ Facebook is refusing every server event for {broken.map((b) => b.id).join(", ")} — the browser pixel still works, but the
          Conversions API needs a correct access token (see below).
        </p>
      )}
      {!capiOn && <p className="mt-2 text-xs text-slate-500">Conversions API is switched off (Facebook Pixel → settings) — only the browser pixel runs.</p>}
      <ul className="mt-3 space-y-2">
        {list.map((p) => {
          const h = health[p.id];
          const state = !p.hasToken ? "browser" : !h || h.ok + h.failed === 0 ? "idle" : h.failed === 0 ? "ok" : h.ok === 0 ? "bad" : "mixed";
          const tone = { ok: "border-emerald-200 bg-emerald-50", mixed: "border-amber-200 bg-amber-50", bad: "border-rose-200 bg-rose-50", idle: "border-slate-200 bg-slate-50", browser: "border-slate-200 bg-slate-50" }[state];
          return (
            <li key={`${p.id}-${p.where}`} className={`rounded-lg border p-3 text-sm ${tone}`}>
              <p className="flex flex-wrap items-center gap-x-2 font-medium text-slate-900">
                <span>{state === "ok" ? "✅" : state === "bad" ? "⛔" : state === "mixed" ? "⚠️" : "•"}</span>
                {p.label || "Pixel"} <span className="font-mono text-xs font-normal text-slate-500">{p.id}</span>
                <span className="text-xs font-normal text-slate-500">· {p.where}</span>
              </p>
              <p className="mt-0.5 text-xs text-slate-700">
                {state === "browser" && "No access token — browser pixel only (add the pixel's Conversions API token to send server events)."}
                {state === "idle" && "No server events in the last 24 hours."}
                {(state === "ok" || state === "mixed" || state === "bad") && <>
                  Accepted <b>{h!.ok}</b> · refused <b className={h!.failed ? "text-rose-700" : ""}>{h!.failed}</b>
                  {h!.lastOkAt && <> · last accepted {ago(h!.lastOkAt)}</>}
                </>}
              </p>
              {h?.lastError && h.failed > 0 && (
                <p className="mt-1 text-xs text-rose-700">Last refusal ({ago(h.lastErrorAt)}): {h.lastError}</p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** The pixels a page really reports to, for its health box: own, main, or both (by its pixel mode). */
export function pagePixelsFor(mode: string, own: { id: string; label: string; token: string }[], main: { id: string; label: string; token: string }[], where: string) {
  const ownRows = own.map((p) => ({ id: p.id, label: p.label, where, hasToken: !!p.token }));
  const mainRows = main.map((p) => ({ id: p.id, label: p.label, where: "Main site pixel", hasToken: !!p.token }));
  if ((mode === "own" || mode === "both") && own.length) return mode === "own" ? ownRows : [...ownRows, ...mainRows];
  return mainRows;
}
