"use client";

import { useActionState, useState } from "react";
import { resendPurchase, updateOrderDetails, updateOrderStatus } from "@/app/actions/admin";
import { initialState } from "@/lib/action-state";
import { money, ORDER_STATUSES, STATUS_META, type OrderStatus } from "@/lib/format";
import { FormAlert, SubmitButton } from "@/components/form-bits";

export function StatusForm({ id, status, readOnly = false }: { id: number; status: OrderStatus; readOnly?: boolean }) {
  const [state, action] = useActionState(updateOrderStatus, initialState);
  const [value, setValue] = useState<OrderStatus>(status);

  if (readOnly) {
    return <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">Your role can view this order but not change its status.</p>;
  }
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <div className="grid grid-cols-2 gap-2">
        {ORDER_STATUSES.map((s) => (
          <label key={s} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
            value === s ? "border-brand-500 bg-brand-50 font-medium text-brand-900 ring-2 ring-brand-500/15" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
            <input type="radio" name="status" value={s} checked={value === s} onChange={() => setValue(s)} className="sr-only" />
            <span className={`size-2 rounded-full ${STATUS_META[s].dot}`} />
            {STATUS_META[s].label}
          </label>
        ))}
      </div>
      <textarea name="note" rows={2} placeholder="Note (optional) — e.g. courier tracking ID" className="a-input resize-none" />
      <FormAlert error={state.error} message={state.message} />
      <SubmitButton className="a-btn w-full" pendingText="Saving…">Update status</SubmitButton>
      {(value === "cancelled" || value === "returned") && value !== status && (
        <p className="text-xs text-slate-500">Stock for this order will be returned to inventory.</p>
      )}
    </form>
  );
}

type Details = {
  id: number;
  customer_name: string;
  phone: string;
  address: string;
  shipping_zone: string;
  shipping_label: string;
  shipping_charge: number;
  discount: number;
  admin_note: string;
  subtotal: number;
};

export function OrderDetailsForm({ order, zones, readOnly = false }: { order: Details; zones: { id: string; label: string; charge: number }[]; readOnly?: boolean }) {
  const [state, action] = useActionState(updateOrderDetails, initialState);
  const [shipping, setShipping] = useState(order.shipping_charge);
  // Keep the order's current zone selectable even if it was removed from the checkout since.
  const options = zones.some((z) => z.id === order.shipping_zone) ? zones : [{ id: order.shipping_zone, label: order.shipping_label, charge: order.shipping_charge }, ...zones];
  const [discount, setDiscount] = useState(order.discount);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="id" value={order.id} />
      <fieldset disabled={readOnly} className="space-y-4 disabled:opacity-70">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block"><span className="a-label">Customer name</span><input name="customer_name" defaultValue={order.customer_name} className="a-input font-sans" required /></label>
        <label className="block"><span className="a-label">Phone</span><input name="phone" defaultValue={order.phone} className="a-input" required /></label>
      </div>
      <label className="block"><span className="a-label">Address</span><textarea name="address" rows={2} defaultValue={order.address} className="a-input resize-none font-sans" required /></label>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block">
          <span className="a-label">Zone</span>
          <select name="shipping_zone" defaultValue={order.shipping_zone} className="a-input font-sans"
            onChange={(e) => { const z = options.find((o) => o.id === e.target.value); if (z) setShipping(z.charge); }}>
            {options.map((z) => <option key={z.id} value={z.id}>{z.label} (৳{z.charge})</option>)}
          </select>
        </label>
        <label className="block"><span className="a-label">Shipping (৳)</span><input name="shipping_charge" type="number" min={0} step="1" value={shipping} onChange={(e) => setShipping(Number(e.target.value))} className="a-input" /></label>
        <label className="block"><span className="a-label">Discount (৳)</span><input name="discount" type="number" min={0} step="1" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} className="a-input" /></label>
      </div>
      <label className="block"><span className="a-label">Internal note (only admins see this)</span><textarea name="admin_note" rows={2} defaultValue={order.admin_note} className="a-input resize-none font-sans" /></label>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">New total: <strong className="tabular-nums text-slate-900">{money(Math.max(order.subtotal + (shipping || 0) - (discount || 0), 0))}</strong></p>
        {!readOnly && <SubmitButton pendingText="Saving…">Save changes</SubmitButton>}
      </div>
      </fieldset>
      <FormAlert error={state.error} message={state.message} />
    </form>
  );
}

export function DeleteOrderButton({ id, action }: { id: number; action: (formData: FormData) => Promise<void> }) {
  const [confirming, setConfirming] = useState(false);
  if (!confirming) {
    return (
      <button type="button" onClick={() => setConfirming(true)} className="a-btn-outline text-rose-600 hover:bg-rose-50">
        Delete
      </button>
    );
  }
  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <SubmitButton className="a-btn bg-rose-600 hover:bg-rose-700" pendingText="Deleting…">Confirm delete</SubmitButton>
      <button type="button" onClick={() => setConfirming(false)} className="a-btn-outline">Cancel</button>
    </form>
  );
}

export function ResendPurchaseButton({ id, sent }: { id: number; sent: boolean }) {
  const [state, action] = useActionState(resendPurchase, initialState);
  return (
    <form action={action} className="mt-2 space-y-2">
      <input type="hidden" name="id" value={id} />
      <SubmitButton className="a-btn-outline w-full py-1.5 text-xs" pendingText="Sending…">
        {sent ? "Send Purchase again" : "Send Purchase to Facebook now"}
      </SubmitButton>
      <FormAlert error={state.error} message={state.message} />
    </form>
  );
}
