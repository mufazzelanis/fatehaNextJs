import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { query, queryOne } from "../db";

export const LOCATIONS_TAG = "locations";
export type Place = { id: number; name: string; bn_name: string | null };

export async function getDistricts(): Promise<Place[]> {
  "use cache";
  cacheTag(LOCATIONS_TAG);
  cacheLife("max");
  return query<Place>("SELECT id, name, bn_name FROM districts ORDER BY name");
}

export async function getThanas(districtId: number): Promise<Place[]> {
  "use cache";
  cacheTag(LOCATIONS_TAG);
  cacheLife("max");
  return query<Place>("SELECT id, name, bn_name FROM thanas WHERE district_id = ? ORDER BY name", [districtId]);
}

export async function getUnions(thanaId: number): Promise<Place[]> {
  "use cache";
  cacheTag(LOCATIONS_TAG);
  cacheLife("max");
  return query<Place>("SELECT id, name, bn_name FROM unions WHERE thana_id = ? ORDER BY name", [thanaId]);
}

/** Checks that union ⊂ thana ⊂ district and returns readable names. */
export async function resolveArea(districtId: number, thanaId: number, unionId: number | null) {
  const row = await queryOne<{ district: string; thana: string; union_name: string | null }>(
    `SELECT d.name AS district, t.name AS thana, u.name AS union_name
     FROM districts d JOIN thanas t ON t.district_id = d.id
     LEFT JOIN unions u ON u.id = ? AND u.thana_id = t.id
     WHERE d.id = ? AND t.id = ?`,
    [unionId ?? 0, districtId, thanaId],
  );
  if (!row || (unionId && !row.union_name)) return null;
  return row;
}
