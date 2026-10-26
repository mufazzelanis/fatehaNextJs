"use client";

import { useActionState, useState } from "react";
import { deleteDealer, reviewDealer, saveDealerProfile, setDealerTarget } from "@/app/actions/admin-dealers";
import { initialState } from "@/lib/action-state";
import { AreaPicker } from "@/components/area-picker";
import { FieldError, FormAlert, SubmitButton } from "@/components/form-bits";
import { CheckIcon, TrashIcon } from "@/components/icons";

type Level = "district" | "thana" | "union";
const LEVELS: { key: Level; label: string }[] = [
  { key: "district", label: "District Dealer" },
  { key: "thana", label: "Thana Dealer" },
  { key: "union", label: "Union Dealer" },
];

export function TargetCell({ dealerId, month, value, readOnly }: { dealerId: number; month: string; value: number | null; readOnly?: boolean }) {
  const [state, action] = useActionState(setDealerTarget, initialState);
  const [v, setV] = useState(value != null ? String(value) : "");
  const dirty = v !== (value != null ? String(value) : "");
  if (readOnly) return <span>{value != null ? `৳${value.toLocaleString("en-IN")}` : "—"}</span>;
  return (
    <form action={action} className="space-y-1">
      <input type="hidden" name="dealer_id" value={dealerId} />
      <input type="hidden" name="month" value={month} />
      <div className="flex items-center gap-1.5">
        <input name="amount" type="number" min={0} step={100} value={v} onChange={(e) => setV(e.target.value)} placeholder="Not set" aria-label="Target (৳)"
          className="a-input h-9 w-32" />
        <SubmitButton className={`grid h-9 place-items-center rounded-lg px-3 text-xs font-semibold transition ${dirty ? "bg-brand-700 text-white" : "bg-slate-100 text-slate-400"}`} pendingText="…">
          {state.ok && !dirty ? <CheckIcon className="size-4 text-emerald-600" /> : "Save"}
        </SubmitButton>
      </div>
      {state.error && <p className="text-xs text-rose-600">{state.error}</p>}
    </form>
  );
}

export function ReviewPanel({ id, status, level, appliedLevel, hasUnion }: { id: number; status: string; level: Level | null; appliedLevel: Level | null; hasUnion: boolean }) {
  const [state, action] = useActionState(reviewDealer, initialState);
  const [mode, setMode] = useState<"" | "reject" | "suspend">("");
  const fe = state.fieldErrors ?? {};
  return (
    <div className="space-y-3">
      {(status === "pending" || status === "rejected") && (
        <form action={action} className="space-y-3">
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="decision" value="approve" />
          <label className="block">
            <span className="a-label">Approve as</span>
            <select name="level" defaultValue={appliedLevel ?? level ?? ""} className="a-input" aria-invalid={!!fe.level}>
              <option value="">Choose level…</option>
              {LEVELS.map((l) => <option key={l.key} value={l.key} disabled={l.key === "union" && !hasUnion}>{l.label}{l.key === appliedLevel ? " (applied)" : ""}</option>)}
            </select>
            <FieldError message={fe.level} />
          </label>
          <input name="note" placeholder="Note (optional)" className="a-input" maxLength={500} />
          <SubmitButton className="a-btn w-full bg-emerald-600 hover:bg-emerald-700" pendingText="Approving…"><CheckIcon className="size-4" /> Approve & activate</SubmitButton>
        </form>
      )}
      {status === "suspended" && (
        <form action={action}>
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="decision" value="reactivate" />
          <SubmitButton className="a-btn w-full bg-emerald-600 hover:bg-emerald-700" pendingText="…">Reactivate dealer</SubmitButton>
        </form>
      )}
      {mode ? (
        <form action={action} className="space-y-2 rounded-xl border border-rose-200 bg-rose-50/50 p-3">
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="decision" value={mode} />
          <textarea name="note" rows={2} maxLength={500} placeholder={mode === "reject" ? "Reason (shown to the applicant)" : "Reason (optional, shown to the dealer)"} className="a-input" aria-invalid={!!fe.note} />
          <FieldError message={fe.note} />
          <div className="flex gap-2">
            <SubmitButton className="a-btn flex-1 bg-rose-600 hover:bg-rose-700" pendingText="…">{mode === "reject" ? "Reject application" : "Suspend dealer"}</SubmitButton>
            <button type="button" onClick={() => setMode("")} className="a-btn-outline">Cancel</button>
          </div>
        </form>
      ) : (
        <div className="flex gap-2">
          {status === "pending" && <button type="button" onClick={() => setMode("reject")} className="a-btn-outline flex-1 text-rose-700">Reject</button>}
          {status === "active" && <button type="button" onClick={() => setMode("suspend")} className="a-btn-outline flex-1 text-rose-700">Suspend</button>}
        </div>
      )}
      <FormAlert error={state.error} message={state.message} />
    </div>
  );
}

type Place = { id: number; name: string; bn_name: string | null };

export function ProfileForm({ dealer, districts }: {
  dealer: { id: number; name: string; phone: string; email: string | null; address: string; district_id: number; thana_id: number; union_id: number | null; level: Level | null };
  districts: Place[];
}) {
  const [state, action] = useActionState(saveDealerProfile, initialState);
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="id" value={dealer.id} />
      <label className="block"><span className="a-label">Name</span><input name="name" defaultValue={dealer.name} className="a-input" aria-invalid={!!fe.name} /><FieldError message={fe.name} /></label>
      <label className="block"><span className="a-label">Mobile</span><input name="phone" defaultValue={dealer.phone} className="a-input" aria-invalid={!!fe.phone} /><FieldError message={fe.phone} /></label>
      <label className="block"><span className="a-label">Email</span><input name="email" defaultValue={dealer.email ?? ""} className="a-input" /></label>
      <label className="block"><span className="a-label">New password (leave empty to keep)</span><input name="password" type="password" autoComplete="new-password" className="a-input" aria-invalid={!!fe.password} /><FieldError message={fe.password} /></label>
      <div className="grid gap-3 sm:col-span-2 sm:grid-cols-3">
        <AreaPicker districts={districts} defaults={{ district: dealer.district_id, thana: dealer.thana_id, union: dealer.union_id }}
          union={dealer.level === "union" ? "required" : "optional"} errors={fe} selectClass="a-input" labelClass="a-label" />
      </div>
      <label className="block sm:col-span-2"><span className="a-label">Address</span><textarea name="address" rows={2} defaultValue={dealer.address} className="a-input" /></label>
      <div className="flex items-center gap-3 sm:col-span-2">
        <SubmitButton className="a-btn" pendingText="Saving…">Save details</SubmitButton>
        <FormAlert error={state.error} message={state.message} />
      </div>
    </form>
  );
}

export function DeleteDealerButton({ id }: { id: number }) {
  const [confirm, setConfirm] = useState(false);
  return confirm ? (
    <form action={deleteDealer} className="flex items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <span className="text-sm text-slate-600">Delete permanently?</span>
      <SubmitButton className="a-btn bg-rose-600 hover:bg-rose-700" pendingText="…">Delete</SubmitButton>
      <button type="button" onClick={() => setConfirm(false)} className="a-btn-outline">Cancel</button>
    </form>
  ) : (
    <button type="button" onClick={() => setConfirm(true)} className="a-btn-outline text-rose-700"><TrashIcon className="size-4" /> Delete</button>
  );
}
