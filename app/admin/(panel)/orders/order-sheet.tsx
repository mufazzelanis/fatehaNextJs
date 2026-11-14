"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { getQuickOrder, type QuickOrder } from "@/app/actions/order-quick";
import { updateOrderStatus } from "@/app/actions/admin";
import { initialState } from "@/lib/action-state";
import { dateTime, money, ORDER_STATUSES, STATUS_META, type OrderStatus } from "@/lib/format";
import { StatusBadge } from "@/components/admin/ui";
import { Spinner } from "@/components/form-bits";
import { CheckIcon, ChevronLeftIcon, ChevronRightIcon, PhoneIcon, PrinterIcon, WhatsappIcon, XIcon } from "@/components/icons";

/** Bangladeshi mobile → 8801XXXXXXXXX for WhatsApp links. */
const waNumber = (phone: string) => {
  const d = phone.replace(/\D/g, "");
  return d.startsWith("880") ? d : d.startsWith("0") ? `88${d}` : d;
};

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Older phones / http: fall back to a hidden textarea.
    const t = document.createElement("textarea");
    t.value = text;
    t.style.position = "fixed";
    t.style.opacity = "0";
    document.body.appendChild(t);
    t.select();
    const ok = document.execCommand("copy");
    t.remove();
    return ok;
  }
}

function CopyRow({ label, value, mono, onCopied }: { label: string; value: string; mono?: boolean; onCopied: (what: string) => void }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button"
      onClick={async () => { if (await copyText(value)) { setDone(true); onCopied(label); setTimeout(() => setDone(false), 1500); } }}
      className="flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition active:scale-[0.99] active:bg-slate-100 hover:bg-slate-50">
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</span>
        <span className={`block break-words text-[15px] font-medium text-slate-900 ${mono ? "font-mono tabular-nums" : "font-sans"}`}>{value}</span>
      </span>
      <span className={`mt-1 inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold transition ${done ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
        {done ? <><CheckIcon className="size-3.5" /> Copied</> : <><CopyGlyph /> Copy</>}
      </span>
    </button>
  );
}

function CopyGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V6a2 2 0 0 1 2-2h9" />
    </svg>
  );
}

/**
 * Phone-friendly order popup (bottom sheet): full details, one-tap copy of name / phone / address
 * (or everything at once for the courier), call / WhatsApp, status change, and ← → to move through the list.
 */
export function OrderSheet({ ids, openId, onClose, onOpen, canEdit, canPrint }: {
  ids: number[]; openId: number | null; onClose: () => void; onOpen: (id: number) => void; canEdit: boolean; canPrint: boolean;
}) {
  const [order, setOrder] = useState<QuickOrder | null>(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [pick, setPick] = useState<OrderStatus | null>(null);
  const [note, setNote] = useState("");
  const [saving, startSave] = useTransition();
  const touch = useRef<{ x: number; y: number } | null>(null);
  const reqId = useRef(0);

  /** Fetches the order; the returned promise resolves after state is set (stale answers are dropped). */
  const load = useCallback((id: number) => {
    const n = ++reqId.current;
    return getQuickOrder(id).catch(() => null).then((o) => {
      if (n !== reqId.current) return; // a newer order was opened meanwhile
      if (!o) { setError("Could not load this order"); return; }
      setError("");
      setOrder(o);
    });
  }, []);

  // Another order opened: forget the half-chosen status change (adjusted during render, not in an effect).
  const [shownId, setShownId] = useState(openId);
  if (shownId !== openId) {
    setShownId(openId);
    setPick(null);
    setNote("");
    setError("");
  }

  useEffect(() => {
    if (openId === null) return;
    const n = ++reqId.current;
    getQuickOrder(openId).catch(() => null).then((o) => {
      if (n !== reqId.current) return;
      if (!o) setError("Could not load this order");
      else setOrder(o);
    });
  }, [openId]);

  const pos = openId === null ? -1 : ids.indexOf(openId);
  const prev = pos > 0 ? ids[pos - 1] : null;
  const next = pos >= 0 && pos < ids.length - 1 ? ids[pos + 1] : null;

  // Lock the page behind the sheet; Escape closes, arrow keys move.
  useEffect(() => {
    if (openId === null) return;
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && prev) onOpen(prev);
      if (e.key === "ArrowRight" && next) onOpen(next);
    };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = old; window.removeEventListener("keydown", onKey); };
  }, [openId, onClose, onOpen, prev, next]);

  const flash = (text: string) => { setToast(text); setTimeout(() => setToast(""), 1800); };

  const saveStatus = () => {
    if (!order || !pick) return;
    startSave(async () => {
      const fd = new FormData();
      fd.set("id", String(order.id));
      fd.set("status", pick);
      fd.set("note", note);
      const res = await updateOrderStatus(initialState, fd);
      if (res.error) { flash(res.error); return; }
      flash(res.message ?? "Status updated");
      setPick(null);
      setNote("");
      await load(order.id);
    });
  };

  if (openId === null) return null;
  const o = order && order.id === openId ? order : null;
  const courierText = o ? `${o.name}\n${o.phone}\n${o.address}${o.zone ? `\n${o.zone}` : ""}\nCOD: ${o.total} টাকা\nOrder #${o.orderNo}` : "";
  const risky = o && o.customer.cancelled + o.customer.returned > 0;

  return createPortal(
    <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Order details">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-slate-950/50 backdrop-blur-[2px] animate-fade-in" />
      <div className="absolute inset-x-0 bottom-0 flex max-h-[92dvh] flex-col rounded-t-3xl bg-white shadow-2xl animate-sheet-up"
        onTouchStart={(e) => { touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }}
        onTouchEnd={(e) => {
          const t = touch.current;
          touch.current = null;
          if (!t) return;
          const dx = e.changedTouches[0].clientX - t.x;
          const dy = e.changedTouches[0].clientY - t.y;
          // Sideways swipe = next / previous order.
          if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5) { if (dx < 0 && next) onOpen(next); if (dx > 0 && prev) onOpen(prev); }
        }}>
        {/* header */}
        <div className="shrink-0 border-b border-slate-100 px-4 pb-3 pt-2">
          <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-slate-200" />
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => prev && onOpen(prev)} disabled={!prev} aria-label="Previous order"
              className="grid size-9 place-items-center rounded-full text-slate-500 ring-1 ring-slate-200 disabled:opacity-30"><ChevronLeftIcon className="size-4" /></button>
            <div className="min-w-0 flex-1 text-center">
              <p className="truncate font-semibold text-slate-900">#{o?.orderNo ?? "…"}</p>
              <p className="text-[11px] text-slate-500">{pos + 1} of {ids.length}{o ? ` · ${dateTime(o.createdAt)}` : ""}</p>
            </div>
            <button type="button" onClick={() => next && onOpen(next)} disabled={!next} aria-label="Next order"
              className="grid size-9 place-items-center rounded-full text-slate-500 ring-1 ring-slate-200 disabled:opacity-30"><ChevronRightIcon className="size-4" /></button>
            <button type="button" onClick={onClose} aria-label="Close" className="grid size-9 place-items-center rounded-full bg-slate-100 text-slate-600"><XIcon className="size-4" /></button>
          </div>
        </div>

        {/* body */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-6 pt-3">
          {!o ? (
            <div className="grid h-48 place-items-center text-sm text-slate-500">
              {error ? <span className="text-rose-600">{error}</span> : <span className="flex items-center gap-2"><Spinner className="size-5 text-brand-700" /> Loading…</span>}
            </div>
          ) : (
            <div className={`space-y-3 transition ${saving ? "opacity-60" : ""}`}>
              <div className="flex flex-wrap items-center gap-2 px-1">
                <StatusBadge status={o.status} />
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${o.origin === "Shop" ? "bg-sky-50 text-sky-700 ring-sky-600/20" : "bg-brand-50 text-brand-700 ring-brand-600/20"}`}>{o.origin}</span>
                {o.campaign && <span className="max-w-full truncate rounded-full bg-blue-50 px-2 py-0.5 font-mono text-[11px] text-blue-700 ring-1 ring-inset ring-blue-600/15">{o.source} · {o.campaign}</span>}
              </div>

              {/* customer: copy */}
              <section className="rounded-2xl ring-1 ring-slate-200">
                <CopyRow label="Name" value={o.name} onCopied={(w) => flash(`${w} copied`)} />
                <div className="mx-3 border-t border-slate-100" />
                <CopyRow label="Phone" value={o.phone} mono onCopied={(w) => flash(`${w} copied`)} />
                <div className="mx-3 border-t border-slate-100" />
                <CopyRow label={`Address${o.zone ? ` · ${o.zone}` : ""}`} value={o.address} onCopied={(w) => flash(`${w} copied`)} />
                <div className="grid grid-cols-3 gap-2 border-t border-slate-100 p-2">
                  <a href={`tel:${o.phone}`} className="flex items-center justify-center gap-1.5 rounded-xl bg-brand-700 py-2.5 text-sm font-semibold text-white active:scale-95"><PhoneIcon className="size-4" /> Call</a>
                  <a href={`https://wa.me/${waNumber(o.phone)}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5 rounded-xl bg-[#25d366] py-2.5 text-sm font-semibold text-white active:scale-95"><WhatsappIcon className="size-4" /> WhatsApp</a>
                  <button type="button" onClick={async () => { if (await copyText(courierText)) flash("All details copied for the courier"); }}
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white active:scale-95"><CopyGlyph /> Copy all</button>
                </div>
              </section>

              {/* customer history */}
              <div className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs ${risky ? "bg-rose-50 text-rose-800" : o.customer.delivered ? "bg-emerald-50 text-emerald-800" : "bg-slate-50 text-slate-600"}`}>
                <span className="text-base">{risky ? "⚠️" : o.customer.delivered ? "⭐" : "🆕"}</span>
                {o.customer.orders === 0 ? "First order from this number" : (
                  <span>Other orders from this number: <b>{o.customer.orders}</b> · {o.customer.delivered} delivered{o.customer.cancelled ? ` · ${o.customer.cancelled} cancelled` : ""}{o.customer.returned ? ` · ${o.customer.returned} returned` : ""}</span>
                )}
              </div>

              {o.note && <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900"><b>Customer note:</b> <span className="font-sans">{o.note}</span></p>}

              {/* items + money */}
              <section className="rounded-2xl ring-1 ring-slate-200">
                <ul className="divide-y divide-slate-100">
                  {o.items.map((i, k) => (
                    <li key={k} className="flex items-start justify-between gap-3 px-3 py-2.5 text-sm">
                      <span className="min-w-0 font-sans text-slate-800">{i.name} <span className="text-slate-500">× {i.qty}</span></span>
                      <span className="shrink-0 tabular-nums text-slate-900">{money(i.total)}</span>
                    </li>
                  ))}
                </ul>
                <dl className="space-y-1 border-t border-slate-100 px-3 py-2.5 text-sm">
                  <div className="flex justify-between text-slate-500"><dt>Subtotal</dt><dd className="tabular-nums">{money(o.subtotal)}</dd></div>
                  <div className="flex justify-between text-slate-500"><dt>Delivery</dt><dd className="tabular-nums">{money(o.shipping)}</dd></div>
                  {o.discount > 0 && <div className="flex justify-between text-emerald-700"><dt>Discount</dt><dd className="tabular-nums">−{money(o.discount)}</dd></div>}
                  <div className="flex justify-between pt-1 text-base font-bold text-slate-900"><dt>Total ({o.payment})</dt><dd className="tabular-nums">{money(o.total)}</dd></div>
                  {o.trx && <div className="flex justify-between text-xs text-slate-500"><dt>Transaction</dt><dd className="font-mono">{o.trx}</dd></div>}
                </dl>
              </section>

              {/* status */}
              {canEdit && (
                <section className="rounded-2xl p-3 ring-1 ring-slate-200">
                  <p className="mb-2 text-sm font-semibold text-slate-900">Change status</p>
                  <div className="grid grid-cols-2 gap-2">
                    {ORDER_STATUSES.map((s) => {
                      const current = s === o.status;
                      const chosen = s === pick;
                      return (
                        <button key={s} type="button" disabled={current || saving} onClick={() => setPick(chosen ? null : s)}
                          className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium ring-1 transition active:scale-[0.98] ${
                            chosen ? "bg-slate-900 text-white ring-slate-900" : current ? "bg-slate-50 text-slate-400 ring-slate-200" : "bg-white text-slate-700 ring-slate-200"}`}>
                          <span className={`size-2.5 rounded-full ${STATUS_META[s].dot}`} />
                          {STATUS_META[s].label}{current && <span className="ml-auto text-[10px]">now</span>}
                        </button>
                      );
                    })}
                  </div>
                  {pick && (
                    <div className="mt-3 space-y-2 animate-fade-in">
                      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional) — e.g. customer didn't pick up"
                        className="a-input font-sans" maxLength={500} />
                      {pick === "cancelled" && <p className="text-xs text-rose-700">Stock goes back, and if auto-block is on the customer&apos;s IP is blocked.</p>}
                      <button type="button" onClick={saveStatus} disabled={saving}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-700 py-3 text-sm font-semibold text-white active:scale-[0.99] disabled:opacity-60">
                        {saving ? <><Spinner className="size-4" /> Saving…</> : <>Mark as {STATUS_META[pick].label}</>}
                      </button>
                    </div>
                  )}
                </section>
              )}

              {/* history */}
              {o.history.length > 0 && (
                <details className="rounded-2xl px-3 py-2 ring-1 ring-slate-200">
                  <summary className="cursor-pointer py-1 text-sm font-semibold text-slate-900">Status history ({o.history.length})</summary>
                  <ol className="mt-2 space-y-2 border-l-2 border-slate-100 pl-3">
                    {[...o.history].reverse().map((h, k) => (
                      <li key={k} className="text-xs text-slate-600">
                        <span className="font-semibold text-slate-800">{STATUS_META[h.status]?.label ?? h.status}</span> · {dateTime(h.at)}{h.by ? ` · ${h.by}` : ""}
                        {h.note && <p className="font-sans text-slate-500">{h.note}</p>}
                      </li>
                    ))}
                  </ol>
                </details>
              )}

              <div className="flex gap-2">
                <Link href={`/admin/orders/${o.id}`} className="a-btn-outline flex-1 justify-center py-2.5">Open full page</Link>
                {canPrint && <a href={`/admin/invoice?ids=${o.id}`} target="_blank" className="a-btn-outline justify-center py-2.5"><PrinterIcon className="size-4" /> Invoice</a>}
              </div>
              {o.ip && <p className="text-center text-[11px] text-slate-400">IP {o.ip}</p>}
            </div>
          )}
        </div>

        {toast && (
          <div className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center animate-fade-in">
            <span className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-lg">{toast}</span>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
