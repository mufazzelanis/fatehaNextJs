import "server-only";
import { queryOne } from "@/lib/db";

/** The combo order page: the landing whose page type is "order" (a live one first). */
export async function findComboLanding() {
  return queryOne<{ id: number }>(
    `SELECT id FROM landing_pages WHERE content LIKE '%"pageType":"order"%' ORDER BY status = 'published' DESC, id LIMIT 1`,
  );
}
