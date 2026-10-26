import { bn, STATUS_META, TRACK_STEPS, type OrderStatus } from "@/lib/format";
import { CheckIcon, XIcon } from "./icons";

type HistoryEntry = { status: OrderStatus; created_at: string | Date };

function when(value: string | Date) {
  return new Date(value).toLocaleString("bn-BD", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Dhaka",
  });
}

/** Horizontal step tracker for customers (Bangla). */
export function OrderTimeline({ status, history }: { status: OrderStatus; history: HistoryEntry[] }) {
  const stopped = status === "cancelled" || status === "returned";
  const currentIndex = stopped ? -1 : TRACK_STEPS.indexOf(status);
  const reachedAt = new Map<OrderStatus, string | Date>();
  for (const h of history) reachedAt.set(h.status, h.created_at);

  if (stopped) {
    const at = reachedAt.get(status);
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
        <span className="grid size-9 place-items-center rounded-full bg-rose-500 text-white"><XIcon className="size-5" /></span>
        <div>
          <p className="font-semibold">এই অর্ডারটি {STATUS_META[status].bn} হয়েছে</p>
          {at && <p className="text-sm opacity-80">{when(at)}</p>}
        </div>
      </div>
    );
  }

  return (
    <ol className="grid grid-cols-5 gap-1">
      {TRACK_STEPS.map((step, i) => {
        const done = i <= currentIndex;
        const active = i === currentIndex;
        const at = reachedAt.get(step);
        return (
          <li key={step} className="relative flex flex-col items-center text-center">
            {i > 0 && (
              <span className={`absolute right-1/2 top-4 h-1 w-full -translate-y-1/2 rounded-full ${i <= currentIndex ? "bg-brand-500" : "bg-slate-200"}`} aria-hidden="true" />
            )}
            <span className={`relative z-10 grid size-8 place-items-center rounded-full text-sm font-bold transition ${
              done ? "bg-brand-600 text-white shadow-md shadow-brand-600/30" : "bg-slate-200 text-slate-500"} ${active ? "ring-4 ring-brand-200" : ""}`}>
              {done ? <CheckIcon className="size-4" strokeWidth={3} /> : bn(i + 1)}
            </span>
            <span className={`mt-2 text-[11px] font-semibold leading-tight sm:text-sm ${done ? "text-slate-900" : "text-slate-400"}`}>
              {STATUS_META[step].bn}
            </span>
            {at && done && <span className="mt-0.5 hidden text-[11px] text-slate-500 sm:block">{when(at)}</span>}
          </li>
        );
      })}
    </ol>
  );
}
