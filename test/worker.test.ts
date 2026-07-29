import { afterEach, describe, expect, it, vi } from "vitest";

import { app, inspectHtml, robotsAllows, type Bindings } from "../src/worker";

const sessionId = "21d6f5db-2a77-4dd2-8319-e45fe918e687";

type Call = {
  arguments: unknown[];
  sql: string;
};

const makeBindings = (recentInspects = 0) => {
  const calls: Call[] = [];
  const prepare = vi.fn((sql: string) => {
    const call: Call = { arguments: [], sql };
    calls.push(call);
    const statement = {
      all: async () => ({ results: [] }),
      bind: (...values: unknown[]) => {
        call.arguments = values;
        return statement;
      },
      first: async () => (sql.includes("COUNT(*) AS count") ? { count: recentInspects } : null),
      raw: async () => [],
      run: async () => ({ meta: { changes: 1 } }),
    };
    return statement as unknown as D1PreparedStatement;
  });
  const db = {
    batch: vi.fn(async () => []),
    dump: vi.fn(async () => new ArrayBuffer(0)),
    exec: vi.fn(async () => ({ count: 0, duration: 0 })),
    prepare,
    withSession: vi.fn(),
  } as unknown as D1Database;
  return {
    bindings: {
      ASSETS: { fetch: vi.fn() } as unknown as Fetcher,
      DB: db,
    } satisfies Bindings,
    calls,
    db,
  };
};

const headers = {
  "content-type": "application/json",
  origin: "http://localhost",
  "sec-fetch-site": "same-origin",
};

const validPayload = () => ({
  ownership: true,
  sessionId,
  url: "https://atelier-morning.amebaownd.com/",
  website: "",
});

const sourceHtml = `<!doctype html>
<html lang="ja">
<head>
  <title>ATELIER &amp; MORNING</title>
  <meta name="description" content="手仕事の教室と展示のお知らせ">
  <link rel="canonical" href="/">
</head>
<body>
  <h1>手仕事の朝</h1>
  <h2>教室について</h2>
  <a href="/pages/about">わたしたち</a>
  <a href="/pages/about#detail">わたしたち</a>
  <a href="https://note.com/example">note</a>
  <a href="javascript:alert(1)">危険</a>
  <img src="/one.jpg"><img src="/two.jpg">
  <script><h2>抽出しない</h2></script>
</body>
</html>`;

const requestInspect = (bindings: Bindings, payload = validPayload(), extraHeaders = {}) =>
  app.request(
    "/api/inspect",
    {
      body: JSON.stringify(payload),
      headers: { ...headers, ...extraHeaders },
      method: "POST",
    },
    bindings,
  );

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("robots.txt", () => {
  it("規則なし、拒否、より具体的な許可を判定する", () => {
    expect(robotsAllows("", "/")).toBe(true);
    expect(robotsAllows("User-agent: *\nDisallow: /", "/")).toBe(false);
    expect(
      robotsAllows(
        "User-agent: *\nDisallow: /private/\nAllow: /private/public/\n",
        "/private/public/index.html",
      ),
    ).toBe(true);
  });

  it("ワイルドカード、末尾指定、専用user-agentを扱う", () => {
    const rules = `User-agent: OtherBot
Disallow: /

User-agent: SiteHodoki
Disallow: /*.pdf$
Allow: /guide/*.pdf$
`;
    expect(robotsAllows(rules, "/files/book.pdf")).toBe(false);
    expect(robotsAllows(rules, "/guide/book.pdf")).toBe(true);
    expect(robotsAllows(rules, "/files/book.pdf?download=1")).toBe(true);
  });
});

describe("公開HTMLの抽出", () => {
  it("必要な骨組みだけを正規化して返す", () => {
    const result = inspectHtml(sourceHtml, new URL("https://atelier-morning.amebaownd.com/"));
    expect(result.title).toBe("ATELIER & MORNING");
    expect(result.description).toBe("手仕事の教室と展示のお知らせ");
    expect(result.canonical).toBe("https://atelier-morning.amebaownd.com/");
    expect(result.headings).toEqual([
      { level: 1, text: "手仕事の朝" },
      { level: 2, text: "教室について" },
    ]);
    expect(result.internalLinks).toHaveLength(1);
    expect(result.externalLinks).toEqual([
      { kind: "external", label: "note", url: "https://note.com/example" },
    ]);
    expect(result.counts.images).toBe(2);
    expect(JSON.stringify(result)).not.toContain("抽出しない");
    expect(JSON.stringify(result)).not.toContain("javascript:");
  });
});

describe("サイトほどき worker", () => {
  it("公開ページに製品情報、構造化データ、セキュリティヘッダーを返す", async () => {
    const { bindings } = makeBindings();
    for (const path of ["/", "/guide", "/privacy"]) {
      const response = await app.request(path, undefined, bindings);
      const html = await response.text();
      expect(response.status).toBe(200);
      expect(response.headers.get("content-security-policy")).toContain("frame-ancestors 'none'");
      expect(html).toContain("サイトほどき");
      expect(html).toContain("application/ld+json");
      expect(html).toContain(
        `href="https://site-hodoki.yhay81.com${path === "/" ? "" : path}" rel="canonical"`,
      );
      expect(html).not.toMatch(/public validation|success criteria|experiment|仮説|成功条件/i);
    }
  });

  it("任意URL、予約済み公式ホスト、所有未確認、越境を拒否する", async () => {
    const cases = [
      { ...validPayload(), url: "http://atelier-morning.amebaownd.com/" },
      { ...validPayload(), url: "https://example.com/" },
      { ...validPayload(), url: "https://guide.amebaownd.com/" },
      { ...validPayload(), url: "https://atelier-morning.amebaownd.com/pages/about" },
      { ...validPayload(), ownership: false },
    ];
    for (const payload of cases) {
      expect((await requestInspect(makeBindings().bindings, payload)).status).toBe(400);
    }
    expect(
      (
        await requestInspect(makeBindings().bindings, validPayload(), {
          origin: "https://evil.example",
        })
      ).status,
    ).toBe(403);
  });

  it("robotsを確認して同一ホストの公開HTMLを解析する", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response("User-agent: *\nAllow: /\n", {
          headers: { "content-type": "text/plain" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(sourceHtml, { headers: { "content-type": "text/html; charset=utf-8" } }),
      );
    vi.stubGlobal("fetch", fetchMock);
    const { bindings, calls } = makeBindings();
    const response = await requestInspect(bindings);
    const body = await response.json<{
      counts: { images: number };
      sourceUrl: string;
      title: string;
    }>();
    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      counts: { images: 2 },
      sourceUrl: "https://atelier-morning.amebaownd.com/",
      title: "ATELIER & MORNING",
    });
    expect(fetchMock.mock.calls[0]?.[0].toString()).toBe(
      "https://atelier-morning.amebaownd.com/robots.txt",
    );
    expect(fetchMock.mock.calls[1]?.[0].toString()).toBe("https://atelier-morning.amebaownd.com/");
    expect(calls.some((call) => call.sql.includes("INSERT OR IGNORE INTO product_events"))).toBe(
      true,
    );
    expect(JSON.stringify(calls)).not.toContain("atelier-morning");
  });

  it("robots拒否・取得不能時は本文へアクセスしない", async () => {
    for (const response of [
      new Response("User-agent: *\nDisallow: /\n"),
      new Response("upstream unavailable", { status: 503 }),
    ]) {
      const fetchMock = vi.fn().mockResolvedValueOnce(response);
      vi.stubGlobal("fetch", fetchMock);
      const result = await requestInspect(makeBindings().bindings);
      expect(result.status).toBe(response.status === 503 ? 502 : 403);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      vi.unstubAllGlobals();
    }
  });

  it("robotsが存在しなければ許可し、別ホスト転送は拒否する", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("", { status: 404 }))
      .mockResolvedValueOnce(
        new Response("", {
          headers: { location: "https://evil.example/" },
          status: 302,
        }),
      );
    vi.stubGlobal("fetch", fetchMock);
    expect((await requestInspect(makeBindings().bindings)).status).toBe(403);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("HTML以外と1MB超の本文を拒否する", async () => {
    const notHtml = vi
      .fn()
      .mockResolvedValueOnce(new Response("", { status: 404 }))
      .mockResolvedValueOnce(
        new Response("{}", { headers: { "content-type": "application/json" } }),
      );
    vi.stubGlobal("fetch", notHtml);
    expect((await requestInspect(makeBindings().bindings)).status).toBe(422);
    vi.unstubAllGlobals();

    const tooLarge = vi
      .fn()
      .mockResolvedValueOnce(new Response("", { status: 404 }))
      .mockResolvedValueOnce(
        new Response("", {
          headers: { "content-length": "1000001", "content-type": "text/html" },
        }),
      );
    vi.stubGlobal("fetch", tooLarge);
    expect((await requestInspect(makeBindings().bindings)).status).toBe(413);
  });

  it("同じ匿名端末の一日10回上限を適用する", async () => {
    const response = await requestInspect(makeBindings(10).bindings);
    expect(response.status).toBe(429);
  });

  it("自動QAは解析・操作イベントとも記録しない", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("", { status: 404 }))
      .mockResolvedValueOnce(
        new Response(sourceHtml, { headers: { "content-type": "text/html" } }),
      );
    vi.stubGlobal("fetch", fetchMock);
    const qa = makeBindings(10);
    expect(
      (
        await requestInspect(qa.bindings, validPayload(), {
          "x-automated-qa": "1",
        })
      ).status,
    ).toBe(200);
    expect(qa.calls.some((call) => call.sql.includes("COUNT(*) AS count"))).toBe(false);
    expect(qa.calls.some((call) => call.sql.includes("INSERT OR IGNORE"))).toBe(false);

    const telemetry = await app.request(
      "/api/telemetry",
      {
        body: JSON.stringify({ context: "home", name: "visited", sessionId }),
        headers: { ...headers, "x-automated-qa": "1" },
        method: "POST",
      },
      qa.bindings,
    );
    expect(telemetry.status).toBe(204);
    expect(qa.calls.some((call) => call.sql.includes("INSERT OR IGNORE"))).toBe(false);
  });

  it("通常の匿名イベントだけを30日以内保存する", async () => {
    const { bindings, calls } = makeBindings();
    const response = await app.request(
      "/api/telemetry",
      {
        body: JSON.stringify({ context: "json", name: "export_saved", sessionId }),
        headers,
        method: "POST",
      },
      bindings,
    );
    expect(response.status).toBe(204);
    expect(calls.some((call) => call.sql.includes("INSERT OR IGNORE"))).toBe(true);
    expect(
      calls.some(
        (call) => call.sql.includes("DELETE FROM product_events") && call.sql.includes("30"),
      ),
    ).toBe(true);
    expect(JSON.stringify(calls)).not.toContain("amebaownd.com");
  });

  it("ヘルスと未定義APIをJSONで返す", async () => {
    const { bindings } = makeBindings();
    const health = await app.request("/healthz", undefined, bindings);
    expect(await health.json()).toMatchObject({ healthy: true, service: "site-hodoki" });
    const missing = await app.request("/api/missing", undefined, bindings);
    const body = await missing.json<{ error: string; requestId: string }>();
    expect(missing.status).toBe(404);
    expect(body.error).toBe("not_found");
    expect(body.requestId).toBeTruthy();
  });
});
