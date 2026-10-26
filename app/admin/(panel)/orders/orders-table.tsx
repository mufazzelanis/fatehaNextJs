"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { bulkOrderAction } from "@/app/actions/admin";
import { dateTime, money, ORDER_STATUSES, STATUS_META, type OrderStatus } from "@/lib/format";
import { StatusBadge } from "@/components/admin/ui";
import { Spinner } from "@/components/form-bits";
import { EyeIcon, PhoneIcon, PrinterIcon, TrashIcon } from "@/components/icons";

type Row = {
  id: number;
  order_no: string;
  customer_name: string;
  phone: string;
  address: string;
  total: number;
  status: OrderStatus;
  zone: string;
  items: number;
  created_at: string;
  note: string | null;
  /** "Shop" or the landing page name */
  origin: string;
  pay: { method: string; status: string; label: string; className: string } | null;
};

type Perms = { edit: boolean; remove: boolean; export: boolean };

export function OrdersTable({ orders, perms }: { orders: Row[]; perms: Perms }) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [pending, startTransition] = useTransition();
  const [flash, setFlash] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const visible = orders.filter((o) => selected.has(o.id)).map((o) => o.id);
  const allChecked = orders.length > 0 && visible.length === orders.length;

  const toggle = (id: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const run = (action: OrderStatus | "delete") =>
    startTransition(async () => {
      const result = await bulkOrderAction(visible, action);
      setFlash({ ok: !!result.ok, text: result.message ?? result.error ?? "" });
      setSelected(new Set());
      setConfirmDelete(false);
      setTimeout(() => setFlash(null), 3500);
    });

  return (
    <>
      {(visible.length > 0 || flash) && (
        <div className="sticky top-16 z-10 flex flex-wrap items-center gap-2 border-b border-brand-100 bg-brand-50/95 px-4 py-2.5 text-sm backdrop-blur animate-fade-in">
          {flash && visible.length === 0 ? (
            <span className={flash.ok ? "text-emerald-700" : "text-rose-700"}>{flash.text}</span>
          ) : (
            <>
              <span className="font-medium text-slate-900">{visible.length} selected</span>
              <span className="mx-1 h-4 w-px bg-slate-300" />
              {perms.edit && (
                <label className="flex items-center gap-2 text-slate-600">
                  Mark as
                  <select disabled={pending} defaultValue="" className="a-input w-auto py-1"
                    onChange={(e) => { if (e.target.value) run(e.target.value as OrderStatus); e.target.value = ""; }}>
                    <option value="" disabled>Choose status…</option>
                    {ORDER_STATUSES.map((s) => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
                  </select>
                </label>
              )}
              {perms.export && (
                <a href={`/admin/invoice?ids=${visible.join(",")}`} target="_blank" className="a-btn-outline py-1"><PrinterIcon className="size-4" /> Print invoices</a>
              )}
              {!perms.remove ? null : confirmDelete ? (
                <span className="flex items-center gap-2">
                  <span className="text-rose-700">Delete {visible.length} order(s)? Stock is restored.</span>
                  <button type="button" onClick={() => run("delete")} disabled={pending} className="rounded-lg bg-rose-600 px-3 py-1 font-medium text-white hover:bg-rose-700">Yes, delete</button>
                  <button type="button" onClick={() => setConfirmDelete(false)} className="a-btn-outline py-1">Cancel</button>
                </span>
              ) : (
                <button type="button" onClick={() => setConfirmDelete(true)} disabled={pending} className="a-btn-outline py-1 text-rose-600"><TrashIcon className="size-4" /> Delete</button>
              )}
              {pending && <Spinner className="size-4 text-brand-700" />}
            </>
          )}
        </div>
      )}

      {/* Phones: cards */}
      <ul className={`divide-y divide-slate-100 transition md:hidden ${pending ? "opacity-60" : ""}`}>
        <li className="flex items-center gap-3 bg-slate-50/70 px-4 py-2 text-xs text-slate-500">
          <input type="checkbox" checked={allChecked} aria-label="Select all"
            onChange={() => setSelected(allChecked ? new Set() : new Set(orders.map((o) => o.id)))}
            className="size-4 rounded border-slate-300 accent-brand-700" />
          Select all
        </li>
        {orders.map((o) => (
          <li key={o.id} className={`flex gap-3 px-4 py-3.5 transition active:bg-slate-50 ${selected.has(o.id) ? "bg-brand-50/60" : ""}`}>
            <input type="checkbox" checked={selected.has(o.id)} onChange={() => toggle(o.id)} aria-label={`Select ${o.order_no}`}
              className="mt-1 size-4 shrink-0 rounded border-slate-300 accent-brand-700" />
            <Link href={`/admin/orders/${o.id}`} className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">#{o.order_no}</p>
                  <p className="truncate font-sans text-sm font-medium text-slate-700">{o.customer_name}</p>
                </div>
                <StatusBadge status={o.status} />
              </div>
              <p className="mt-1 line-clamp-1 font-sans text-xs text-slate-500">{o.address}</p>
              <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                <span>{dateTime(o.created_at)} · <span className={o.origin === "Shop" ? "text-sky-600" : "text-brand-700"}>{o.origin}</span></span>
                <span className="text-sm font-semibold tabular-nums text-slate-900">{money(o.total)}</span>
              </div>
              {o.pay && <div className="mt-1.5 text-right"><PayPill pay={o.pay} /></div>}
            </Link>
            <a href={`tel:${o.phone}`} aria-label={`Call ${o.customer_name}`}
              className="grid size-9 shrink-0 place-items-center self-center rounded-full bg-brand-50 text-brand-700 transition active:scale-95">
              <PhoneIcon className="size-4" />
            </a>
          </li>
        ))}
      </ul>

      {/* Tablets & desktops: table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[860px] text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/70 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
              <th className="w-10 px-4 py-3">
                <input type="checkbox" checked={allChecked} aria-label="Select all"
                  onChange={() => setSelected(allChecked ? new Set() : new Set(orders.map((o) => o.id)))}
                  className="size-4 rounded border-slate-300 accent-brand-700" />
              </th>
              <th className="px-3 py-3 font-medium">Order</th>
              <th className="px-3 py-3 font-medium">Customer</th>
              <th className="px-3 py-3 font-medium">Address</th>
              <th className="px-3 py-3 text-right font-medium">Total</th>
              <th className="px-3 py-3 font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className={`divide-y divide-slate-100 transition ${pending ? "opacity-60" : ""}`}>
            {orders.map((o) => (
              <tr key={o.id} className={`group transition hover:bg-slate-50/80 ${selected.has(o.id) ? "bg-brand-50/50" : ""}`}>
                <td className="px-4 py-3">
                  <input type="checkbox" checked={selected.has(o.id)} onChange={() => toggle(o.id)} aria-label={`Select ${o.order_no}`}
                    className="size-4 rounded border-slate-300 accent-brand-700" />
                </td>
                <td className="px-3 py-3">
                  <Link href={`/admin/orders/${o.id}`} className="font-semibold text-slate-900 hover:text-brand-700">#{o.order_no}</Link>
                  <p className="text-xs text-slate-500">{dateTime(o.created_at)}</p>
                </td>
                <td className="px-3 py-3">
                  <p className="font-sans font-medium text-slate-900">{o.customer_name}</p>
                  <a href={`tel:${o.phone}`} className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-brand-700">
                    <PhoneIcon className="size-3" /> {o.phone}
                  </a>
                </td>
                <td className="max-w-64 px-3 py-3">
                  <p className="line-clamp-2 font-sans text-slate-600" title={o.address}>{o.address}</p>
                  <p className="text-xs text-slate-400">{o.zone} · {o.items} item{o.items === 1 ? "" : "s"} · <span className={o.origin === "Shop" ? "text-sky-600" : "text-brand-700"}>{o.origin}</span></p>
                </td>
                <td className="px-3 py-3 text-right font-medium tabular-nums text-slate-900">{money(o.total)}{o.pay && <div className="mt-1"><PayPill pay={o.pay} /></div>}</td>
                <td className="px-3 py-3"><StatusBadge status={o.status} /></td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/orders/${o.id}`} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 ring-1 ring-slate-200 transition hover:bg-white hover:text-brand-700 hover:ring-brand-300">
                    <EyeIcon className="size-3.5" /> View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function PayPill({ pay }: { pay: NonNullable<Row["pay"]> }) {
  return (
    <span className={`inline-flex whitespace-nowrap rounded-full px-2 py-px text-[11px] font-medium ring-1 ring-inset ${pay.className}`} title={pay.label}>
      {pay.method} · {pay.label}
    </span>
  );
}
