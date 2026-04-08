const BREAK_BEFORE_KEYWORDS = [
  "WITH",
  "SELECT",
  "FROM",
  "WHERE",
  "GROUP BY",
  "ORDER BY",
  "HAVING",
  "LIMIT",
  "UNION ALL",
  "UNION",
  "LEFT JOIN",
  "RIGHT JOIN",
  "INNER JOIN",
  "OUTER JOIN",
  "JOIN",
  "ON"
] as const;

const COMMA_FORMAT_CLAUSES = ["WITH", "SELECT", "GROUP BY", "ORDER BY"] as const;

export function formatSqlForDisplay(sql: string): string {
  const normalized = sql.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "";
  }

  let formatted = normalized;
  for (const keyword of BREAK_BEFORE_KEYWORDS) {
    const pattern = new RegExp(`\\s+${escapeRegExp(keyword)}\\s+`, "gi");
    formatted = formatted.replace(pattern, `\n${keyword} `);
  }

  formatted = formatted.replace(
    /\b(WITH|SELECT|GROUP BY|ORDER BY)\b([^\n]*)/gi,
    (_match, clause, body) => `${clause}${formatClauseBody(body, clause.toUpperCase())}`
  );

  return formatted.replace(/\n{2,}/g, "\n").trim();
}

function formatClauseBody(body: string, clause: string): string {
  const trimmed = body.trimStart();
  if (!trimmed) {
    return "";
  }
  if (!COMMA_FORMAT_CLAUSES.includes(clause as (typeof COMMA_FORMAT_CLAUSES)[number])) {
    return ` ${trimmed}`;
  }
  return splitCommaSeparated(trimmed)
    .map((segment) => `\n  ${segment.trim()}`)
    .join(",");
}

function splitCommaSeparated(input: string): string[] {
  const result: string[] = [];
  let current = "";
  let depth = 0;
  let quote: "'" | '"' | null = null;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const previous = index > 0 ? input[index - 1] : "";

    if ((char === "'" || char === '"') && previous !== "\\") {
      if (quote === char) {
        quote = null;
      } else if (quote === null) {
        quote = char;
      }
    }

    if (quote === null) {
      if (char === "(") {
        depth += 1;
      } else if (char === ")" && depth > 0) {
        depth -= 1;
      } else if (char === "," && depth === 0) {
        result.push(current);
        current = "";
        continue;
      }
    }

    current += char;
  }

  if (current.trim()) {
    result.push(current);
  }

  return result.length > 0 ? result : [input];
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
