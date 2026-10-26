"use client";

import { useEffect, useRef, useState } from "react";

type Place = { id: number; name: string; bn_name: string | null };

const load = (url: string) => fetch(url).then((r) => r.json() as Promise<Place[]>).catch(() => [] as Place[]);

/**
 * District → Thana → Union dependent dropdowns. Submits `district`, `thana` and `union` ids.
 * `union`: "hidden" | "optional" | "required".
 */
export function AreaPicker({ districts, defaults, union = "optional", errors = {}, selectClass, labelClass, onChange, labels }: {
  districts: Place[];
  defaults?: { district?: string | number | null; thana?: string | number | null; union?: string | number | null };
  union?: "hidden" | "optional" | "required";
  errors?: Record<string, string | undefined>;
  selectClass: string;
  labelClass: string;
  onChange?: (v: { district: string; thana: string; union: string }) => void;
  labels?: { district?: string; thana?: string; union?: string };
}) {
  const [district, setDistrict] = useState(String(defaults?.district ?? ""));
  const [thana, setThana] = useState(String(defaults?.thana ?? ""));
  const [unionId, setUnionId] = useState(String(defaults?.union ?? ""));
  const [thanas, setThanas] = useState<Place[]>([]);
  const [unions, setUnions] = useState<Place[]>([]);
  const [loading, setLoading] = useState<"" | "thana" | "union">("");
  const restored = useRef(false);

  // Restore the lists for pre-filled values (editing, or after a failed submit).
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    const d = String(defaults?.district ?? "");
    const t = String(defaults?.thana ?? "");
    if (d) load(`/api/locations/thanas?district=${d}`).then(setThanas);
    if (t) load(`/api/locations/unions?thana=${t}`).then(setUnions);
  }, [defaults]);

  const emit = (v: { district: string; thana: string; union: string }) => onChange?.(v);

  function chooseDistrict(id: string) {
    setDistrict(id); setThana(""); setUnionId(""); setThanas([]); setUnions([]);
    emit({ district: id, thana: "", union: "" });
    if (!id) return;
    setLoading("thana");
    load(`/api/locations/thanas?district=${id}`).then(setThanas).finally(() => setLoading(""));
  }
  function chooseThana(id: string) {
    setThana(id); setUnionId(""); setUnions([]);
    emit({ district, thana: id, union: "" });
    if (!id) return; // load even while hidden — the union field may appear later
    setLoading("union");
    load(`/api/locations/unions?thana=${id}`).then(setUnions).finally(() => setLoading(""));
  }
  const name = (p: Place) => (p.bn_name ? `${p.name} — ${p.bn_name}` : p.name);

  return (
    <>
      <label className="block">
        <span className={labelClass}>{labels?.district ?? "District"}</span>
        <select name="district" value={district} onChange={(e) => chooseDistrict(e.target.value)} className={selectClass} aria-invalid={!!errors.district} required>
          <option value="">Select district</option>
          {districts.map((d) => <option key={d.id} value={d.id}>{name(d)}</option>)}
        </select>
        {errors.district && <span className="mt-1 block text-xs text-rose-600">{errors.district}</span>}
      </label>
      <label className="block">
        <span className={labelClass}>{labels?.thana ?? "Thana / Upazila"}</span>
        <select name="thana" value={thana} onChange={(e) => chooseThana(e.target.value)} disabled={!district || loading === "thana"}
          className={selectClass} aria-invalid={!!errors.thana} required>
          <option value="">{loading === "thana" ? "Loading…" : district ? "Select thana" : "Select district first"}</option>
          {thanas.map((t) => <option key={t.id} value={t.id}>{name(t)}</option>)}
        </select>
        {errors.thana && <span className="mt-1 block text-xs text-rose-600">{errors.thana}</span>}
      </label>
      {union !== "hidden" && (
        <label className="block">
          <span className={labelClass}>{labels?.union ?? "Union"}{union === "optional" ? <span className="font-normal text-slate-400"> (optional)</span> : null}</span>
          <select name="union" value={unionId} onChange={(e) => { setUnionId(e.target.value); emit({ district, thana, union: e.target.value }); }}
            disabled={!thana || loading === "union" || unions.length === 0} className={selectClass} aria-invalid={!!errors.union} required={union === "required"}>
            <option value="">{loading === "union" ? "Loading…" : !thana ? "Select thana first" : unions.length === 0 ? "Not needed" : "Select union"}</option>
            {unions.map((u) => <option key={u.id} value={u.id}>{name(u)}</option>)}
          </select>
          {errors.union && <span className="mt-1 block text-xs text-rose-600">{errors.union}</span>}
          {union === "required" && thana && loading !== "union" && unions.length === 0 && (
            <span className="mt-1 block text-xs text-amber-700">City thanas have no unions — apply as a Thana Dealer for this area.</span>
          )}
        </label>
      )}
    </>
  );
}
