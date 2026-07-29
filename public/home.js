import { apiJson, sessionId, setStatus, track, trackVisit } from "./common.js";

const form = document.querySelector("#inspect-form");
const button = document.querySelector("#inspect-button");
const status = document.querySelector("#inspect-status");
const result = document.querySelector("#result");
const branches = document.querySelector("#map-branches");
const headingList = document.querySelector("#heading-list");
const checkList = document.querySelector("#check-list");
let model = null;

const sampleModel = {
  canonical: "https://atelier-morning.amebaownd.com/",
  counts: {
    externalLinks: 3,
    headings: 4,
    images: 7,
    internalLinks: 3,
    textCharacters: 1280,
  },
  description: "手仕事の教室と、小さな展示のお知らせ。",
  externalLinks: [
    { kind: "external", label: "Instagram", url: "https://www.instagram.com/" },
    { kind: "external", label: "note", url: "https://note.com/" },
    { kind: "external", label: "地図", url: "https://maps.google.com/" },
  ],
  headings: [
    { level: 1, text: "手仕事の朝をひらく場所" },
    { level: 2, text: "わたしたちについて" },
    { level: 2, text: "教室・お知らせ" },
    { level: 2, text: "アクセス" },
  ],
  internalLinks: [
    {
      kind: "internal",
      label: "わたしたちについて",
      url: "https://atelier-morning.amebaownd.com/pages/about",
    },
    {
      kind: "internal",
      label: "教室・お知らせ",
      url: "https://atelier-morning.amebaownd.com/pages/news",
    },
    {
      kind: "internal",
      label: "アクセス",
      url: "https://atelier-morning.amebaownd.com/pages/access",
    },
  ],
  signals: [
    {
      detail: "ページ名を下書きへ移せます",
      label: "ページタイトル",
      state: "ready",
    },
    {
      detail: "検索結果向けの説明があります",
      label: "ページ説明",
      state: "ready",
    },
    { detail: "主見出しが一つあります", label: "主見出し", state: "ready" },
    { detail: "3件のページ導線を見つけました", label: "内部ページ", state: "ready" },
    {
      detail: "7枚を元サイトと権利確認しながら手動で移してください",
      label: "画像",
      state: "check",
    },
  ],
  sourceUrl: "https://atelier-morning.amebaownd.com/",
  title: "ATELIER MORNING",
};

const text = (tag, value, className = "") => {
  const node = document.createElement(tag);
  node.textContent = value;
  if (className) node.className = className;
  return node;
};

const setText = (selector, value) => {
  const node = document.querySelector(selector);
  if (node) node.textContent = String(value);
};

const normalizedUrl = () => {
  const value = document.querySelector("#source-url")?.value?.trim() ?? "";
  return /^https:\/\//i.test(value) ? value : `https://${value.replace(/^\/+/, "")}`;
};

const hostLabel = (value) => {
  try {
    return new URL(value).hostname;
  } catch {
    return value;
  }
};

const renderBranches = () => {
  if (!(branches instanceof HTMLElement) || !model) return;
  branches.replaceChildren();
  if (model.internalLinks.length === 0) {
    branches.append(text("p", "トップ以外のページ導線は見つかりません。", "empty-state"));
    return;
  }
  model.internalLinks.forEach((link, index) => {
    const item = document.createElement("article");
    item.append(
      text("span", String(index + 1).padStart(2, "0")),
      text("b", link.label),
      text("small", new URL(link.url).pathname),
    );
    branches.append(item);
  });
};

const renderHeadings = () => {
  if (!(headingList instanceof HTMLOListElement) || !model) return;
  headingList.replaceChildren();
  if (model.headings.length === 0) {
    headingList.append(text("li", "見出しは見つかりませんでした。", "empty-state"));
    return;
  }
  model.headings.forEach((heading) => {
    const item = document.createElement("li");
    item.dataset.level = String(heading.level);
    item.append(text("span", `H${heading.level}`), text("b", heading.text));
    headingList.append(item);
  });
};

const renderChecks = () => {
  if (!(checkList instanceof HTMLElement) || !model) return;
  checkList.replaceChildren();
  model.signals.forEach((signal) => {
    const item = document.createElement("article");
    item.dataset.state = signal.state;
    item.append(
      text("i", signal.state === "ready" ? "✓" : signal.state === "missing" ? "＋" : "!"),
      text("b", signal.label),
      text("p", signal.detail),
    );
    checkList.append(item);
  });
};

const render = () => {
  if (!model || !(result instanceof HTMLElement)) return;
  setText("#result-title", model.title || "構成図");
  setText("#result-source", hostLabel(model.sourceUrl));
  setText("#map-title", model.title || hostLabel(model.sourceUrl));
  setText("#result-description", model.description || "ページ説明は見つかりませんでした。");
  setText("#page-count", `${model.internalLinks.length + 1} PAGES`);
  setText("#heading-count", `${model.headings.length} HEADINGS`);
  const ready = model.signals.filter((signal) => signal.state === "ready").length;
  setText("#check-score", `${ready} / ${model.signals.length}`);
  renderBranches();
  renderHeadings();
  renderChecks();
  result.hidden = false;
  result.scrollIntoView({ behavior: "smooth", block: "start" });
};

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (
    !(form instanceof HTMLFormElement) ||
    !(button instanceof HTMLButtonElement) ||
    !form.reportValidity()
  ) {
    return;
  }
  button.disabled = true;
  setStatus(status, "公開ページを読み解いています…");
  try {
    model = await apiJson("/api/inspect", {
      body: JSON.stringify({
        ownership: document.querySelector("#ownership")?.checked === true,
        sessionId,
        url: normalizedUrl(),
        website: document.querySelector("#website")?.value ?? "",
      }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    setStatus(status, "構成図を作りました。解析結果はサーバーへ保存していません。", "success");
    render();
  } catch (error) {
    const messages = {
      invalid_source: "管理中の `*.amebaownd.com` 公開URLと確認欄を見直してください。",
      not_html: "このURLはHTMLページではありません。",
      rate_limited: "今日は10回解析しています。明日もう一度お試しください。",
      redirect_denied: "別のホストへ転送されるため、安全のため読み取りませんでした。",
      robots_denied: "このサイトはrobots.txtで読み取りを許可していません。",
      robots_unavailable: "robots.txtを確認できないため、今回は読み取りませんでした。",
      source_timeout: "元サイトの応答に時間がかかっています。少し待ってお試しください。",
      source_too_large: "トップページが大きすぎるため読み取れませんでした。",
      source_unavailable: "元サイトを読み込めませんでした。公開状態とURLを確認してください。",
    };
    setStatus(
      status,
      messages[error.message] ?? "構成を読み取れませんでした。もう一度お試しください。",
      "error",
    );
  } finally {
    button.disabled = false;
  }
});

document.querySelector("#sample-button")?.addEventListener("click", () => {
  model = structuredClone(sampleModel);
  setStatus(status, "サンプルの構成図です。実際の入力時も同じ形で端末へ持ち出せます。", "success");
  render();
});

const download = (content, filename, type) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const safeFilename = (value) => {
  const normalized = String(value ?? "")
    .normalize("NFKC")
    .replaceAll(/[^\p{L}\p{N}-]+/gu, "-")
    .replaceAll(/^-+|-+$/g, "")
    .slice(0, 40);
  return normalized || "site-draft";
};

const createDraftHtml = () => {
  if (!model) return "";
  const title = escapeHtml(model.title);
  const description = escapeHtml(model.description || "このサイトについて");
  const h1 = model.headings.find((heading) => heading.level === 1)?.text || model.title;
  const sections = model.headings.filter((heading) => heading.level === 2).slice(0, 8);
  const navigation = model.internalLinks.slice(0, 8);
  const external = model.externalLinks.slice(0, 8);
  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="description" content="${description}">
  <meta name="generator" content="サイトほどき">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'">
  <title>${title}</title>
  <style>
    :root{font-family:system-ui,sans-serif;color:#29374f;background:#f4f1e9;line-height:1.7}
    *{box-sizing:border-box}body{margin:0}header,main,footer{max-width:920px;margin:auto;padding:24px}
    nav{display:flex;flex-wrap:wrap;gap:16px;border-bottom:1px solid #c9c4b8}a{color:inherit}
    .hero{padding:72px 24px;border-bottom:1px solid #c9c4b8}.hero h1{font-size:clamp(28px,5vw,42px);max-width:720px}
    section{padding:32px 0;border-bottom:1px solid #d8d3c8}section h2{font-size:22px}
    .links{display:flex;flex-wrap:wrap;gap:12px}.links a{border:1px solid #29374f;padding:8px 12px;text-decoration:none}
    .move-note{background:#fff7df;padding:16px;font-size:14px}footer{font-size:13px;color:#657087}
  </style>
</head>
<body>
  <header>
    <nav aria-label="メイン">
      ${navigation.map((link) => `<a href="${escapeHtml(link.url)}">${escapeHtml(link.label)}</a>`).join("\n      ")}
    </nav>
  </header>
  <main>
    <div class="hero">
      <p>ABOUT</p>
      <h1>${escapeHtml(h1)}</h1>
      <p>${description}</p>
    </div>
    ${
      sections.length > 0
        ? sections
            .map(
              (heading, index) => `<section>
      <small>${String(index + 1).padStart(2, "0")}</small>
      <h2>${escapeHtml(heading.text)}</h2>
      <p class="move-note">元サイトと権利を確認しながら、ここへ本文と画像を移してください。</p>
    </section>`,
            )
            .join("\n    ")
        : `<section><h2>このサイトについて</h2><p class="move-note">ここへ紹介文を移してください。</p></section>`
    }
    <section>
      <h2>外部リンク</h2>
      <div class="links">
        ${external.map((link) => `<a href="${escapeHtml(link.url)}" rel="noopener noreferrer">${escapeHtml(link.label)}</a>`).join("\n        ")}
      </div>
    </section>
  </main>
  <footer>
    <p>${title}</p>
    <p>移転前に本文・画像・リンク・法定表記・独自ドメインを確認してください。</p>
  </footer>
</body>
</html>`;
};

document.querySelector("#download-json")?.addEventListener("click", () => {
  if (!model) return;
  download(
    `${JSON.stringify(model, null, 2)}\n`,
    `${safeFilename(model.title)}-map.json`,
    "application/json;charset=utf-8",
  );
  track("export_saved", "json");
});

document.querySelector("#download-html")?.addEventListener("click", () => {
  if (!model) return;
  download(createDraftHtml(), `${safeFilename(model.title)}-draft.html`, "text/html;charset=utf-8");
  track("export_saved", "html");
});

trackVisit();
