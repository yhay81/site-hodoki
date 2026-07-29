import { Hono } from "hono";
import type { Context } from "hono";
import { requestId } from "hono/request-id";

import { securityHeaders } from "./middleware/security";
import { GuidePage, HomePage, NotFoundPage, PrivacyPage } from "./ui/pages";

export type Bindings = {
  ASSETS: Fetcher;
  DB: D1Database;
};

type AppContext = Context<{ Bindings: Bindings; Variables: { requestId: string } }>;
type SignalState = "check" | "missing" | "ready";

type SiteLink = {
  kind: "external" | "internal";
  label: string;
  url: string;
};

type Heading = {
  level: 1 | 2;
  text: string;
};

class ApiError extends Error {
  constructor(
    readonly code: string,
    readonly status: 400 | 403 | 413 | 415 | 422 | 429 | 502 | 504,
  ) {
    super(code);
  }
}

const app = new Hono<{ Bindings: Bindings; Variables: { requestId: string } }>();
const browserSessionPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const telemetryNames = new Set(["visited", "inspected", "export_saved", "returned"]);
const maximumHtmlBytes = 1_000_000;
const maximumRobotsBytes = 100_000;
const reservedOwndHosts = new Set([
  "blog.amebaownd.com",
  "guide.amebaownd.com",
  "help.amebaownd.com",
  "www.amebaownd.com",
]);

const cleanup = (db: D1Database) =>
  db.prepare("DELETE FROM product_events WHERE created_at < unixepoch() - (30 * 86400)").run();

const enforceSameOrigin = (c: AppContext) => {
  const fetchSite = c.req.header("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin") throw new ApiError("cross_site_request", 403);
  const origin = c.req.header("origin");
  if (origin && origin !== new URL(c.req.url).origin) {
    throw new ApiError("cross_site_request", 403);
  }
};

const parseJson = async (c: AppContext, maximumBytes: number) => {
  const contentType = c.req.header("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    throw new ApiError("unsupported_media_type", 415);
  }
  const contentLength = Number(c.req.header("content-length") ?? "0");
  if (contentLength > maximumBytes) throw new ApiError("payload_too_large", 413);
  const rawBody = await c.req.text();
  if (new TextEncoder().encode(rawBody).byteLength > maximumBytes) {
    throw new ApiError("payload_too_large", 413);
  }
  try {
    return JSON.parse(rawBody) as unknown;
  } catch {
    throw new ApiError("invalid_json", 400);
  }
};

const cleanText = (value: unknown, maximumLength: number) => {
  if (typeof value !== "string") return "";
  return Array.from(value.normalize("NFKC"))
    .map((character) => {
      const code = character.charCodeAt(0);
      return code < 32 || code === 127 ? " " : character;
    })
    .join("")
    .replaceAll(/\s+/g, " ")
    .trim()
    .slice(0, maximumLength);
};

const isAllowedOwndHostname = (hostname: string) => {
  const normalized = hostname.toLowerCase();
  return (
    normalized.endsWith(".amebaownd.com") &&
    normalized.split(".").length >= 3 &&
    !reservedOwndHosts.has(normalized)
  );
};

const parseSourceUrl = (value: unknown) => {
  if (typeof value !== "string" || value.length > 500) {
    throw new ApiError("invalid_source", 400);
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new ApiError("invalid_source", 400);
  }
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    (url.port && url.port !== "443") ||
    !isAllowedOwndHostname(url.hostname) ||
    (url.pathname !== "" && url.pathname !== "/")
  ) {
    throw new ApiError("invalid_source", 400);
  }
  url.hash = "";
  url.search = "";
  url.pathname = "/";
  return url;
};

const fetchPublic = async (url: URL) => {
  try {
    return await fetch(url, {
      headers: {
        accept: "text/html, text/plain;q=0.9",
        "user-agent": "SiteHodoki/1.0 (+https://site-hodoki.yhay81.com/guide)",
      },
      redirect: "manual",
      signal: AbortSignal.timeout(8_000),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      throw new ApiError("source_timeout", 504);
    }
    throw new ApiError("source_unavailable", 502);
  }
};

const readLimitedBody = async (response: Response, maximumBytes: number) => {
  const contentLength = Number(response.headers.get("content-length") ?? "0");
  if (contentLength > maximumBytes) throw new ApiError("source_too_large", 413);
  const body = await response.text();
  if (new TextEncoder().encode(body).byteLength > maximumBytes) {
    throw new ApiError("source_too_large", 413);
  }
  return body;
};

const patternMatchesPath = (pattern: string, path: string) => {
  const endAnchored = pattern.endsWith("$");
  const normalized = endAnchored ? pattern.slice(0, -1) : pattern;
  const expression = normalized
    .split("*")
    .map((part) => part.replaceAll(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join(".*");
  return new RegExp(`^${expression}${endAnchored ? "$" : ""}`).test(path);
};

export const robotsAllows = (robotsText: string, path: string) => {
  const groups: Array<{ agents: string[]; rules: Array<{ allow: boolean; pattern: string }> }> = [];
  let current: { agents: string[]; rules: Array<{ allow: boolean; pattern: string }> } | null =
    null;
  for (const rawLine of robotsText.split(/\r?\n/)) {
    const line = rawLine.split("#", 1)[0]?.trim() ?? "";
    if (!line) continue;
    const separator = line.indexOf(":");
    if (separator < 0) continue;
    const key = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();
    if (key === "user-agent") {
      if (!current || current.rules.length > 0) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      continue;
    }
    if ((key === "allow" || key === "disallow") && current && value) {
      current.rules.push({ allow: key === "allow", pattern: value });
    }
  }
  const rules = groups
    .filter((group) => group.agents.some((agent) => agent === "*" || agent === "sitehodoki"))
    .flatMap((group) => group.rules)
    .filter((rule) => patternMatchesPath(rule.pattern, path))
    .sort((left, right) => right.pattern.length - left.pattern.length);
  if (rules.length === 0) return true;
  const longest = rules[0]?.pattern.length ?? 0;
  return rules.some((rule) => rule.pattern.length === longest && rule.allow);
};

const requireRobotsPermission = async (source: URL) => {
  const robotsUrl = new URL("/robots.txt", source.origin);
  const response = await fetchPublic(robotsUrl);
  if (response.status === 404 || response.status === 410) return;
  if (!response.ok) throw new ApiError("robots_unavailable", 502);
  const body = await readLimitedBody(response, maximumRobotsBytes);
  if (!robotsAllows(body, `${source.pathname}${source.search}`)) {
    throw new ApiError("robots_denied", 403);
  }
};

const fetchSourceHtml = async (initialUrl: URL) => {
  const initialHostname = initialUrl.hostname;
  let currentUrl = initialUrl;
  for (let redirectCount = 0; redirectCount <= 3; redirectCount += 1) {
    const response = await fetchPublic(currentUrl);
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location || redirectCount === 3) throw new ApiError("redirect_denied", 403);
      const next = new URL(location, currentUrl);
      if (
        next.protocol !== "https:" ||
        next.hostname !== initialHostname ||
        next.username ||
        next.password ||
        (next.port && next.port !== "443")
      ) {
        throw new ApiError("redirect_denied", 403);
      }
      currentUrl = next;
      continue;
    }
    if (!response.ok) throw new ApiError("source_unavailable", 502);
    const contentType = (response.headers.get("content-type") ?? "").toLowerCase();
    if (!contentType.includes("text/html")) throw new ApiError("not_html", 422);
    return { html: await readLimitedBody(response, maximumHtmlBytes), url: currentUrl };
  }
  throw new ApiError("redirect_denied", 403);
};

const decodeHtml = (value: string) =>
  value
    .replaceAll(/&#(\d+);/g, (_match, number: string) =>
      String.fromCodePoint(Math.min(0x10ffff, Number(number))),
    )
    .replaceAll(/&#x([\da-f]+);/gi, (_match, number: string) =>
      String.fromCodePoint(Math.min(0x10ffff, Number.parseInt(number, 16))),
    )
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&nbsp;", " ");

const plainFromHtml = (value: string, maximumLength: number) =>
  decodeHtml(
    value
      .replaceAll(/<!--[\s\S]*?-->/g, " ")
      .replaceAll(/<(script|style|noscript)\b[\s\S]*?<\/\1>/gi, " ")
      .replaceAll(/<[^>]+>/g, " "),
  )
    .replaceAll(/\s+/g, " ")
    .trim()
    .slice(0, maximumLength);

const attribute = (tag: string, name: string) => {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  return decodeHtml(match?.[1] ?? match?.[2] ?? match?.[3] ?? "").trim();
};

const metaContent = (html: string, name: string) => {
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const tag = match[0];
    if (attribute(tag, "name").toLowerCase() === name.toLowerCase()) {
      return cleanText(attribute(tag, "content"), 240);
    }
  }
  return "";
};

const canonicalUrl = (html: string, baseUrl: URL) => {
  for (const match of html.matchAll(/<link\b[^>]*>/gi)) {
    const tag = match[0];
    if (attribute(tag, "rel").toLowerCase().split(/\s+/).includes("canonical")) {
      try {
        const url = new URL(attribute(tag, "href"), baseUrl);
        return url.protocol === "https:" ? url.toString() : "";
      } catch {
        return "";
      }
    }
  }
  return "";
};

const uniqueLinks = (links: SiteLink[]) => {
  const seen = new Set<string>();
  return links.filter((link) => {
    const key = `${link.kind}:${link.url}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export const inspectHtml = (html: string, sourceUrl: URL) => {
  const structuralHtml = html.replaceAll(
    /<(script|style|noscript|template)\b[\s\S]*?<\/\1>/gi,
    " ",
  );
  const titleMatch = structuralHtml.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  const title = cleanText(plainFromHtml(titleMatch?.[1] ?? "", 120), 120);
  const description = metaContent(structuralHtml, "description");
  const headings: Heading[] = [];
  for (const match of structuralHtml.matchAll(/<(h1|h2)\b[^>]*>([\s\S]*?)<\/\1>/gi)) {
    const text = cleanText(plainFromHtml(match[2] ?? "", 120), 120);
    if (text) headings.push({ level: match[1]?.toLowerCase() === "h1" ? 1 : 2, text });
    if (headings.length >= 16) break;
  }

  const links: SiteLink[] = [];
  for (const match of structuralHtml.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const href = attribute(match[1] ?? "", "href");
    const label = cleanText(plainFromHtml(match[2] ?? "", 80), 80);
    if (!href || !label) continue;
    try {
      const url = new URL(href, sourceUrl);
      if (url.protocol !== "https:" && url.protocol !== "http:") continue;
      url.hash = "";
      const internal = url.hostname === sourceUrl.hostname;
      links.push({
        kind: internal ? "internal" : "external",
        label,
        url: url.toString(),
      });
    } catch {
      continue;
    }
  }
  const deduplicated = uniqueLinks(links);
  const internalLinks = deduplicated.filter((link) => link.kind === "internal").slice(0, 12);
  const externalLinks = deduplicated.filter((link) => link.kind === "external").slice(0, 12);
  const imageCount = [...structuralHtml.matchAll(/<img\b/gi)].length;
  const h1Count = headings.filter((heading) => heading.level === 1).length;
  const wordCount = plainFromHtml(html, 100_000).length;
  const signals: Array<{ detail: string; label: string; state: SignalState }> = [
    {
      detail: title ? "ページ名を下書きへ移せます" : "新しいページ名を決めてください",
      label: "ページタイトル",
      state: title ? "ready" : "missing",
    },
    {
      detail: description ? "検索結果向けの説明があります" : "120字ほどの説明を用意してください",
      label: "ページ説明",
      state: description ? "ready" : "missing",
    },
    {
      detail:
        h1Count === 1
          ? "主見出しが一つあります"
          : h1Count === 0
            ? "主見出しを一つ用意してください"
            : `${h1Count}個あるため一つに整理してください`,
      label: "主見出し",
      state: h1Count === 1 ? "ready" : h1Count === 0 ? "missing" : "check",
    },
    {
      detail:
        internalLinks.length > 0
          ? `${internalLinks.length}件のページ導線を見つけました`
          : "トップ以外のページ導線は見つかりません",
      label: "内部ページ",
      state: internalLinks.length > 0 ? "ready" : "check",
    },
    {
      detail:
        imageCount > 0
          ? `${imageCount}枚を元サイトと権利確認しながら手動で移してください`
          : "移す画像は見つかりません",
      label: "画像",
      state: imageCount > 0 ? "check" : "ready",
    },
  ];
  return {
    canonical: canonicalUrl(structuralHtml, sourceUrl),
    counts: {
      externalLinks: externalLinks.length,
      headings: headings.length,
      images: imageCount,
      internalLinks: internalLinks.length,
      textCharacters: wordCount,
    },
    description,
    externalLinks,
    headings,
    internalLinks,
    signals,
    sourceUrl: sourceUrl.toString(),
    title: title || sourceUrl.hostname,
  };
};

const isAutomatedQa = (c: AppContext) => {
  if (c.req.header("x-automated-qa") === "1") return true;
  const referer = c.req.header("referer");
  if (!referer) return false;
  try {
    return new URL(referer).searchParams.get("qa") === "1";
  } catch {
    return false;
  }
};

const recordEvent = async (db: D1Database, sessionId: string, name: string, context: string) => {
  await db.batch([
    db
      .prepare(
        `INSERT OR IGNORE INTO product_events
         (session_id, name, context, occurred_on, created_at)
         VALUES (?, ?, ?, ?, unixepoch())`,
      )
      .bind(sessionId, name, context, new Date().toISOString().slice(0, 10)),
    db.prepare("DELETE FROM product_events WHERE created_at < unixepoch() - (30 * 86400)"),
  ]);
};

app.use("*", requestId());
app.use("*", securityHeaders);
app.use("/api/*", async (c, next) => {
  c.header("Cache-Control", "private, no-store");
  await next();
});

app.get("/", (c) => {
  c.header("Cache-Control", "public, max-age=300, s-maxage=86400");
  return c.html(<HomePage />);
});
app.get("/guide", (c) => {
  c.header("Cache-Control", "public, max-age=300, s-maxage=86400");
  return c.html(<GuidePage />);
});
app.get("/privacy", (c) => {
  c.header("Cache-Control", "public, max-age=300, s-maxage=86400");
  return c.html(<PrivacyPage />);
});

app.post("/api/inspect", async (c) => {
  enforceSameOrigin(c);
  const payload = await parseJson(c, 2048);
  if (!payload || typeof payload !== "object") throw new ApiError("invalid_source", 400);
  const source = payload as Record<string, unknown>;
  const sourceUrl = parseSourceUrl(source.url);
  const sessionId = typeof source.sessionId === "string" ? source.sessionId : "";
  const website = cleanText(source.website, 100);
  if (!browserSessionPattern.test(sessionId) || source.ownership !== true || website) {
    throw new ApiError("invalid_source", 400);
  }

  if (!isAutomatedQa(c)) {
    const recent = await c.env.DB.prepare(
      `SELECT COUNT(*) AS count FROM product_events
       WHERE session_id = ? AND name = 'inspected' AND created_at > unixepoch() - 86400`,
    )
      .bind(sessionId)
      .first<{ count: number }>();
    if (Number(recent?.count ?? 0) >= 10) throw new ApiError("rate_limited", 429);
  }

  await requireRobotsPermission(sourceUrl);
  const sourceDocument = await fetchSourceHtml(sourceUrl);
  const result = inspectHtml(sourceDocument.html, sourceDocument.url);
  if (!isAutomatedQa(c)) await recordEvent(c.env.DB, sessionId, "inspected", "");
  return c.json(result);
});

app.post("/api/telemetry", async (c) => {
  enforceSameOrigin(c);
  if (isAutomatedQa(c)) return c.body(null, 204);
  const payload = await parseJson(c, 1024);
  if (!payload || typeof payload !== "object") throw new ApiError("invalid_telemetry", 400);
  const source = payload as Record<string, unknown>;
  const sessionId = typeof source.sessionId === "string" ? source.sessionId : "";
  const name = typeof source.name === "string" ? source.name : "";
  const context = cleanText(source.context, 16);
  if (
    !browserSessionPattern.test(sessionId) ||
    !telemetryNames.has(name) ||
    (context !== "" && context !== "home" && context !== "json" && context !== "html")
  ) {
    throw new ApiError("invalid_telemetry", 400);
  }
  await recordEvent(c.env.DB, sessionId, name, context);
  return c.body(null, 204);
});

app.get("/healthz", (c) =>
  c.json({ healthy: true, service: "site-hodoki", time: new Date().toISOString() }),
);

app.notFound((c) => {
  if (c.req.method === "GET" && !c.req.path.startsWith("/api/")) {
    return c.html(<NotFoundPage />, 404);
  }
  return c.json({ error: "not_found", requestId: c.get("requestId") }, 404);
});

app.onError((error, c) => {
  if (error instanceof ApiError) {
    return c.json({ error: error.code, requestId: c.get("requestId") }, error.status);
  }
  console.error(
    JSON.stringify({
      event: "request_failed",
      message: error.message,
      requestId: c.get("requestId"),
    }),
  );
  return c.json({ error: "internal_error", requestId: c.get("requestId") }, 500);
});

export { app };
export default {
  fetch: app.fetch,
  scheduled(_controller: ScheduledController, env: Bindings, context: ExecutionContext) {
    context.waitUntil(cleanup(env.DB));
  },
};
