// Helpers for safely composing PostgREST (supabase-js) filter strings.
//
// `.or('col.eq.' + value)` and `.filter()` take a raw filter *string*, so an
// unescaped value containing a comma, parenthesis or dot lets the caller inject
// extra conditions (e.g. a search term `x),role.eq.admin,name.ilike.(y` widens
// the result set). PostgREST allows the value to be wrapped in double quotes,
// with `"` and `\` backslash-escaped inside — commas/parens are then literal.

// Quote a value for use inside a PostgREST filter string (`.or()`, `.filter()`).
export const pgrstValue = (value: string | number): string =>
  `"${String(value).replace(/["\\]/g, '\\$&')}"`;

// Escape the LIKE/ILIKE wildcards `%` and `_` so a user's literal `%` or `_`
// is matched literally rather than as a wildcard. Apply BEFORE wrapping the
// `%term%` pattern with pgrstValue().
export const escapeLike = (value: string): string => value.replace(/[%_\\]/g, '\\$&');
