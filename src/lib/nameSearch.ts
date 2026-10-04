import { or, sql, type AnyColumn, type SQL } from "drizzle-orm";
import { normalizeName } from "./vgLeaderMatch";

// Both cases listed: lower() may leave non-ASCII letters alone depending on the DB locale.
const ACCENTED = "áàâäãåéèêëíìîïóòôöõúùûüñçÁÀÂÄÃÅÉÈÊËÍÌÎÏÓÒÔÖÕÚÙÛÜÑÇ";
const PLAIN = "aaaaaaeeeeiiiiooooouuuuncaaaaaaeeeeiiiiooooouuuunc";

/** SQL mirror of normalizeName(): lowercase, accents stripped (ñ -> n), punctuation dropped, whitespace collapsed. */
function normalizedSql(col: AnyColumn): SQL {
  return sql`trim(regexp_replace(regexp_replace(translate(lower(regexp_replace(${col}, ${"[̀-ͯ]"}, '', 'g')), ${ACCENTED}, ${PLAIN}), ${"[^a-z\\s-]"}, ' ', 'g'), ${"\\s+"}, ' ', 'g'))`;
}

/**
 * Substring name search that ignores case, accents and dots: "penas" finds "Peñas",
 * "ma anna" finds "Ma. Anna". Matches nothing if the query has no letters.
 */
export function nameContains(cols: AnyColumn[], q: string): SQL {
  const needle = normalizeName(q);
  if (!needle) return sql`false`;
  return or(...cols.map((c) => sql`${normalizedSql(c)} like ${`%${needle}%`}`))!;
}
