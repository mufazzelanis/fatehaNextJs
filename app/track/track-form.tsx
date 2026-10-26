"use client";

import { useActionState } from "react";
import { trackOrder, type TrackResult } from "@/app/actions/order";
import { bn, STATUS_META, taka } from "@/lib/format";
import { FormAlert, SubmitButton } from "@/components/form-bits";
import { SearchIcon } from "@/components/icons";
import { OrderTimeline } from "@/components/order-timeline";

export function TrackForm({ defaultOrderNo }: { defaultOrderNo: string }) {
  const [state, action] = useActionState<TrackResult, FormData>(trackOrder, {});
  const order = state.order;

  return (
    <>
      <form action={action} className="mt-10 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xl shadow-brand-900/5 sm:p-8">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="order_no" className="label">অর্ডার নাম্বার</label>
            <input id="order_no" name="order_no" defaultValue={state.values?.order_no ?? defaultOrderNo}
              placeholder="যেমন: DC10001" className="field font-ui uppercase tracking-wide" required />
          </div>
          <div>
            <label htmlFor="phone" className="label">মোবাইল নাম্বার</label>
            <input id="phone" name="phone" type="tel" inputMode="tel" defaultValue={state.values?.phone}
              placeholder="01XXXXXXXXX" className="field font-ui tracking-wide" required />
          </div>
        </div>
        <div className="mt-5 space-y-4">
          <FormAlert error={state.error} />
          <SubmitButton className="btn-primary w-full" pendingText="খোঁজা হচ্ছে...">
            <SearchIcon className="size-5" /> অর্ডার খুঁজুন
          </SubmitButton>
        </div>
      </form>

      {order && (
        <div key={order.order_no} className="mt-8 overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xl shadow-brand-900/5 animate-slide-up">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-6">
            <div>
              <p className="text-sm text-slate-500">অর্ডার নাম্বার</p>
              <p className="font-ui text-xl font-bold text-slate-900">#{order.order_no}</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-sm font-semibold ring-1 ring-inset ${STATUS_META[order.status].className}`}>
              {order.status_bn}
            </span>
          </div>
          <div className="p-6">
            <OrderTimeline status={order.status} history={order.history} />
          </div>
          <div className="flex flex-wrap justify-between gap-3 bg-slate-50 px-6 py-4 text-slate-700">
            <span>{order.items.map((i) => `${i.name} × ${bn(i.quantity)}`).join(", ")}</span>
            <span className="font-display font-bold text-brand-700">{taka(order.total)}</span>
          </div>
        </div>
      )}
    </>
  );
}
