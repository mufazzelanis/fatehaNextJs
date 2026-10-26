"use server";

import bcrypt from "bcryptjs";
import { unlink } from "node:fs/promises";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { execute, queryOne } from "@/lib/db";
import { adminWith, DENIED, requirePermission } from "@/lib/auth";
import { resolveArea } from "@/lib/data/locations";
import { normalizePhone } from "@/lib/phone";
import { diff, logActivity } from "@/lib/activity";
import { areaHolder, dealerDocPath, getDealerById, isDealerLevel, isMonth, LEVEL_LABEL, monthLabel, targetFor } from "@/lib/dealer";
import type { ActionState } from "@/lib/action-state";

export async function reviewDealer(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await adminWith("dealers.manage");
  if (!admin) return DENIED;
  const id = Number(formData.get("id"));
  const decision = String(formData.get("decision") ?? "");
  const note = String(formData.get("note") ?? "").trim().slice(0, 500) || null;
  const d = await getDealerById(id);
  if (!d) return { error: "Dealer not found" };

  if (decision === "approve" || decision === "reactivate") {
    const level = decision === "approve" ? String(formData.get("level") ?? "") : d.level;
    if (!isDealerLevel(level)) return { fieldErrors: { level: "Choose the dealer level" } };
    if (level === "union" && !d.union_id) return { fieldErrors: { level: "This applicant has no union — set one under Edit first" } };
    const holder = await areaHolder(level, d, d.id);
    if (holder) return { error: `${holder.name} is already the active ${LEVEL_LABEL[level].toLowerCase()} for this area. Suspend them first.` };
    await execute(
      "UPDATE dealers SET level = ?, status = 'active', admin_note = COALESCE(?, admin_note), reviewed_by = ?, reviewed_at = NOW() WHERE id = ?",
      [level, note, admin.id, id],
    );
    await logActivity({
      actor: admin, action: decision === "approve" ? "dealer.approved" : "dealer.reactivated", module: "dealers", entityType: "dealer", entityId: id,
      description: `${decision === "approve" ? "Approved" : "Reactivated"} ${d.name} as ${LEVEL_LABEL[level]} (${d.district})`,
      changes: [{ field: "status", from: d.status, to: "active" }, ...(d.level !== level ? [{ field: "level", from: d.level, to: level }] : [])],
    });
  } else if (decision === "reject" || decision === "suspend") {
    if (decision === "reject" && !note) return { fieldErrors: { note: "Tell the applicant why (they see this message)" } };
    const status = decision === "reject" ? "rejected" : "suspended";
    await execute("UPDATE dealers SET status = ?, admin_note = COALESCE(?, admin_note), reviewed_by = ?, reviewed_at = NOW() WHERE id = ?", [status, note, admin.id, id]);
    await logActivity({
      actor: admin, action: `dealer.${status}`, module: "dealers", entityType: "dealer", entityId: id,
      description: `${decision === "reject" ? "Rejected" : "Suspended"} dealer ${d.name}${note ? ` — ${note}` : ""}`,
      changes: [{ field: "status", from: d.status, to: status }],
    });
  } else return { error: "Unknown action" };
  refresh();
  return { ok: true, message: "Saved" };
}

export async function saveDealerProfile(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await adminWith("dealers.manage");
  if (!admin) return DENIED;
  const id = Number(formData.get("id"));
  const d = await getDealerById(id);
  if (!d) return { error: "Dealer not found" };
  const get = (k: string) => String(formData.get(k) ?? "").trim();
  const next = {
    name: get("name").slice(0, 120), phone: normalizePhone(get("phone")) ?? "", email: get("email") || null, address: get("address").slice(0, 500),
    district_id: Number(get("district")) || 0, thana_id: Number(get("thana")) || 0, union_id: Number(get("union")) || null,
  };
  const fieldErrors: Record<string, string> = {};
  if (next.name.length < 3) fieldErrors.name = "Enter the name";
  if (!next.phone) fieldErrors.phone = "Enter a valid 11-digit mobile number";
  else if (await queryOne("SELECT id FROM dealers WHERE phone = ? AND id <> ?", [next.phone, id])) fieldErrors.phone = "Another dealer uses this number";
  const area = await resolveArea(next.district_id, next.thana_id, next.union_id);
  if (!area) fieldErrors.thana = "Choose a valid district → thana → union";
  if (d.level === "union" && !next.union_id) fieldErrors.union = "A union dealer needs a union";
  const password = get("password");
  if (password && password.length < 6) fieldErrors.password = "Use at least 6 characters";
  if (Object.keys(fieldErrors).length) return { fieldErrors };
  if (d.status === "active" && d.level) {
    const holder = await areaHolder(d.level, next, id);
    if (holder) return { error: `${holder.name} already covers that area as ${LEVEL_LABEL[d.level].toLowerCase()}` };
  }
  await execute(
    "UPDATE dealers SET name=?, phone=?, email=?, address=?, district_id=?, thana_id=?, union_id=? WHERE id=?",
    [next.name, next.phone, next.email, next.address, next.district_id, next.thana_id, next.union_id, id],
  );
  if (password) await execute("UPDATE dealers SET password_hash = ? WHERE id = ?", [await bcrypt.hash(password, 10), id]);
  const changes = diff(d as unknown as Record<string, unknown>, next, ["name", "phone", "email", "address", "district_id", "thana_id", "union_id"]);
  if (password) changes.push({ field: "password", from: "•••", to: "reset" });
  if (changes.length) {
    await logActivity({ actor: admin, action: "dealer.updated", module: "dealers", entityType: "dealer", entityId: id, description: `Updated dealer ${next.name} (${changes.map((c) => c.field).join(", ")})`, changes });
  }
  refresh();
  return { ok: true, message: changes.length ? "Dealer updated" : "Nothing changed" };
}

export async function setDealerTarget(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await adminWith("dealers.manage");
  if (!admin) return DENIED;
  const id = Number(formData.get("dealer_id"));
  const month = String(formData.get("month") ?? "");
  const raw = String(formData.get("amount") ?? "").trim();
  const amount = raw === "" ? null : Math.round(Number(raw));
  if (!isMonth(month)) return { error: "Choose a month" };
  if (amount !== null && (!Number.isFinite(amount) || amount < 0 || amount > 1_000_000_000)) return { error: "Enter a valid amount" };
  const d = await queryOne<{ name: string; status: string }>("SELECT name, status FROM dealers WHERE id = ?", [id]);
  if (!d || d.status !== "active") return { error: "Only active dealers can have targets" };
  const before = await targetFor(id, month);
  if (amount === null) await execute("DELETE FROM dealer_targets WHERE dealer_id = ? AND month = ?", [id, month]);
  else {
    await execute(
      `INSERT INTO dealer_targets (dealer_id, month, amount, set_by, set_by_id) VALUES (?, ?, ?, 'admin', ?)
       ON DUPLICATE KEY UPDATE amount = VALUES(amount), set_by = 'admin', set_by_id = VALUES(set_by_id)`,
      [id, month, amount, admin.id],
    );
  }
  if ((before?.amount ?? null) !== amount) {
    await logActivity({
      actor: admin, action: "dealer.target_set", module: "dealers", entityType: "dealer", entityId: id,
      description: `Set ${d.name}'s ${monthLabel(month)} target to ${amount === null ? "none" : `৳${amount}`}`,
      changes: [{ field: `target ${month}`, from: before?.amount ?? null, to: amount }],
    });
  }
  refresh();
  return { ok: true, message: `Saved` };
}

export async function deleteDealer(formData: FormData) {
  const admin = await requirePermission("dealers.manage");
  const id = Number(formData.get("id"));
  const d = await getDealerById(id);
  if (!d) redirect("/admin/dealers");
  await execute("DELETE FROM dealers WHERE id = ?", [id]);
  for (const f of [d.photo, d.nid_front, d.nid_back, d.bank_slip]) if (f) await unlink(dealerDocPath(f)).catch(() => {});
  await logActivity({ actor: admin, action: "dealer.deleted", module: "dealers", entityType: "dealer", entityId: id, description: `Deleted dealer ${d.name} (${d.phone})` });
  redirect("/admin/dealers");
}
