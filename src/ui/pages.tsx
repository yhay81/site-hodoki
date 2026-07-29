import { product } from "../config/product";
import { Layout } from "./layout";

function ThreadBridge() {
  return (
    <div class="thread-bridge" aria-hidden="true">
      <svg viewBox="0 0 430 250">
        <path class="thread one" d="M18 40 C120 40 98 106 202 106 S300 46 410 46" />
        <path class="thread two" d="M18 104 C102 104 120 148 206 148 S320 102 410 112" />
        <path class="thread three" d="M18 178 C110 178 116 196 210 194 S326 176 410 188" />
        <circle cx="207" cy="126" r="39" />
        <path class="scissor" d="m184 105 47 45m0-45-47 45" />
        <circle class="handle" cx="177" cy="98" r="10" />
        <circle class="handle" cx="238" cy="98" r="10" />
      </svg>
      <span>READ</span>
      <b>ほどく</b>
      <small>端末へ</small>
    </div>
  );
}

function BeforeSite() {
  return (
    <div class="site-card before-site" aria-hidden="true">
      <div class="browser-bar">
        <i></i>
        <i></i>
        <i></i>
        <span>my-site.amebaownd.com</span>
      </div>
      <div class="before-canvas">
        <span class="old-nav"></span>
        <strong>
          ATELIER
          <br />
          MORNING
        </strong>
        <p></p>
        <p></p>
        <div class="old-grid">
          <i></i>
          <i></i>
          <i></i>
        </div>
        <div class="old-social">
          <i>in</i>
          <i>▶</i>
          <i>note</i>
        </div>
      </div>
      <div class="loose-thread t1"></div>
      <div class="loose-thread t2"></div>
      <div class="loose-thread t3"></div>
    </div>
  );
}

function AfterSite() {
  return (
    <div class="site-card after-site" aria-hidden="true">
      <div class="draft-label">
        <span>PORTABLE</span>
        <b>HTML</b>
      </div>
      <header>
        <i></i>
        <span>ATELIER MORNING</span>
      </header>
      <div class="after-hero">
        <small>ABOUT</small>
        <strong>
          手仕事の朝を
          <br />
          ひらく場所
        </strong>
      </div>
      <div class="after-sections">
        <article>
          <span>01</span>
          <b>わたしたちについて</b>
        </article>
        <article>
          <span>02</span>
          <b>教室・お知らせ</b>
        </article>
        <article>
          <span>03</span>
          <b>外部リンク</b>
        </article>
      </div>
      <footer>
        <i></i>
        <i></i>
        <i></i>
      </footer>
    </div>
  );
}

export function HomePage() {
  return (
    <Layout>
      <section class="unravel-stage" aria-label="既存サイトを持ち出せる構成にほどくイメージ">
        <div class="stage-caption">
          <span>CURRENT SITE</span>
          <b>公開中の一枚</b>
        </div>
        <BeforeSite />
        <ThreadBridge />
        <AfterSite />
        <div class="stage-caption right">
          <span>PORTABLE DRAFT</span>
          <b>構成図とHTML</b>
        </div>
      </section>

      <section class="inspect-shell" id="inspect">
        <div class="inspect-intro">
          <span class="eyebrow">UNRAVEL, THEN MOVE</span>
          <h1>{product.headline}</h1>
          <p>
            公開中のトップページから、名前・説明・見出し・ページ導線・外部リンクを読み取ります。
            画像や記事本文はコピーせず、移転の骨組みだけを端末へ渡します。
          </p>
          <dl>
            <div>
              <dt>01</dt>
              <dd>Owndの公開URLを入れる</dd>
            </div>
            <div>
              <dt>02</dt>
              <dd>残すものと要確認を分ける</dd>
            </div>
            <div>
              <dt>03</dt>
              <dd>構成図・HTMLを持ち出す</dd>
            </div>
          </dl>
        </div>
        <form class="inspect-form" id="inspect-form">
          <header>
            <span class="spool-icon" aria-hidden="true">
              <i></i>
              <b></b>
            </span>
            <div>
              <small>SOURCE PAGE</small>
              <h2>公開サイトを読み解く</h2>
            </div>
          </header>
          <label class="field">
            <span>Ameba Owndの公開URL</span>
            <div class="url-field">
              <span>https://</span>
              <input
                id="source-url"
                inputmode="url"
                placeholder="example.amebaownd.com/"
                required
              />
            </div>
            <small>初期版は `*.amebaownd.com` のトップページだけに対応します。</small>
          </label>
          <label class="ownership-check">
            <input id="ownership" required type="checkbox" />
            <span>この公開サイトを自分または所属先が管理しています</span>
          </label>
          <label class="honeypot" aria-hidden="true">
            Website
            <input id="website" tabindex={-1} />
          </label>
          <button class="button primary" id="inspect-button" type="submit">
            構成をほどく <span aria-hidden="true">→</span>
          </button>
          <button class="sample-button" id="sample-button" type="button">
            入力前にサンプルを見る
          </button>
          <p class="action-status" id="inspect-status" aria-live="polite"></p>
          <footer>
            <span>保存なし</span>
            <span>画像コピーなし</span>
            <span>robots尊重</span>
          </footer>
        </form>
      </section>

      <section class="result-shell" hidden id="result">
        <header class="result-header">
          <div>
            <span class="eyebrow">PORTABLE MAP</span>
            <h2 id="result-title">構成図</h2>
            <p id="result-source"></p>
          </div>
          <div class="result-actions">
            <button class="button compact" id="download-json" type="button">
              構成図 JSON
            </button>
            <button class="button compact accent" id="download-html" type="button">
              下書き HTML
            </button>
          </div>
        </header>
        <div class="result-board">
          <section class="map-panel">
            <header>
              <span>SITE MAP</span>
              <strong id="page-count">0 PAGES</strong>
            </header>
            <div class="map-root">
              <span class="root-dot"></span>
              <div>
                <small>TOP PAGE</small>
                <b id="map-title">---</b>
              </div>
            </div>
            <div class="map-branches" id="map-branches"></div>
          </section>
          <section class="content-panel">
            <header>
              <span>CONTENT</span>
              <strong id="heading-count">0 HEADINGS</strong>
            </header>
            <p class="content-lede" id="result-description"></p>
            <ol class="heading-list" id="heading-list"></ol>
          </section>
          <aside class="check-panel">
            <header>
              <span>MOVE CHECK</span>
              <strong id="check-score">0 / 0</strong>
            </header>
            <div class="check-list" id="check-list"></div>
          </aside>
        </div>
        <p class="result-note">
          出力は移転用の骨組みです。画像、記事本文、フォーム、予約、独自ドメインは元サイトと照合して移してください。
        </p>
      </section>
      <script src="/home.js?v=1" type="module"></script>
    </Layout>
  );
}

export function GuidePage() {
  return (
    <Layout canonical={`${product.url}/guide`} title={`使い方 | ${product.name}`}>
      <article class="guide-board">
        <header>
          <span class="eyebrow">HOW TO UNRAVEL</span>
          <h1>公開ページから、移転の設計図をつくる。</h1>
          <p>
            サイトほどきはホスティングや自動移行ではなく、移転前の棚卸しと静的HTMLの下書きを作る道具です。
          </p>
        </header>
        <ol class="guide-steps">
          <li>
            <span>01</span>
            <div class="guide-icon browser-mini">
              <i></i>
              <i></i>
              <i></i>
            </div>
            <h2>管理中のURLを入れる</h2>
            <p>
              初期版はAmeba
              Owndサブドメインの公開トップページだけを読みます。非公開ページや管理画面には入りません。
            </p>
          </li>
          <li>
            <span>02</span>
            <div class="guide-icon thread-mini">
              <i></i>
              <i></i>
              <i></i>
            </div>
            <h2>構造を分ける</h2>
            <p>
              タイトル、説明、見出し、内部ページ、外部リンクを構成図へ並べ、欠けている基本情報を示します。
            </p>
          </li>
          <li>
            <span>03</span>
            <div class="guide-icon file-mini">
              <i></i>
              <i></i>
              <i></i>
            </div>
            <h2>端末へ保存する</h2>
            <p>
              構成図JSONと、文章を移し始められる静的HTMLをダウンロードします。解析結果をサーバーへ保存しません。
            </p>
          </li>
        </ol>
        <section class="guide-note">
          <strong>自動移行ではありません</strong>
          <p>
            画像・記事本文・フォーム・予約・SEO評価・独自ドメイン設定は移りません。公開前に権利、表示、リンク、法定表記を必ず確認してください。
          </p>
        </section>
      </article>
    </Layout>
  );
}

export function PrivacyPage() {
  return (
    <Layout canonical={`${product.url}/privacy`} title={`プライバシー | ${product.name}`}>
      <article class="prose">
        <header>
          <span class="eyebrow">PRIVACY</span>
          <h1>読み取りは一回、結果は端末だけ。</h1>
        </header>
        <section>
          <h2>取得するもの</h2>
          <p>
            入力されたAmeba
            Ownd公開URLへ一度アクセスし、公開HTMLからタイトル、説明、見出し、内部ページリンク、外部リンク、件数情報を抽出します。画像ファイルや記事本文は複製しません。
          </p>
        </section>
        <section>
          <h2>保存しないもの</h2>
          <p>
            入力URLと解析結果はD1やログ用テーブルへ保存しません。Cookie、IPアドレス、User-Agentも製品データとして保存しません。構成図とHTMLはブラウザ内で生成します。
          </p>
        </section>
        <section>
          <h2>匿名計測</h2>
          <p>
            ブラウザ生成UUID、訪問・解析・書き出し・別日再訪の操作名、発生日だけを30日以内保存します。入力URL、サイト名、見出し、リンクを計測へ含めません。
          </p>
        </section>
      </article>
    </Layout>
  );
}

export function NotFoundPage() {
  return (
    <Layout noindex title={`見つかりません | ${product.name}`}>
      <section class="not-found">
        <span>404</span>
        <h1>このページは見つかりません。</h1>
        <p>URLを確認するか、トップページから公開サイトを読み解いてください。</p>
        <a class="button compact" href="/">
          トップへ戻る
        </a>
      </section>
    </Layout>
  );
}
