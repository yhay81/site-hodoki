# サイトほどき

Ameba Owndの公開トップページを読み解き、持ち出せる構成図と静的HTMLの下書きにする日本語Webサービスです。

- サービス: <https://site-hodoki.yhay81.com>
- 使い方: <https://site-hodoki.yhay81.com/guide>
- プライバシー: <https://site-hodoki.yhay81.com/privacy>

## Product boundary

利用者自身または所属先が管理する公開中の`*.amebaownd.com`トップページを一度だけ読み取り、タイトル、説明、H1/H2、内部ページ導線、外部リンクと件数を構成図へ並べます。構成図JSONと、移転作業を始めるための静的HTMLはブラウザ内で生成します。

画像、記事本文、フォーム、予約、会員データ、独自ドメイン、検索評価はコピーしません。ホスティング、自動移行、非公開ページや管理画面へのアクセス、所有権の証明は行いません。入力URLと解析結果はD1へ保存しません。

## Development

Node.js 24 LTSとnpmを使います。

```powershell
npm ci
npx wrangler d1 migrations apply site-hodoki --local
npm run dev -- --host 127.0.0.1 --port 5175
```

検査:

```powershell
npm run release:check
npm run check
npm test
npm run build
npm audit --omit=dev
```

本番:

```powershell
npx wrangler d1 migrations apply site-hodoki --remote
npm run deploy
npm run indexnow
npm run metrics
```

## Stack

Cloudflare Workers / D1、Hono JSX、Vite+、TypeScript。アカウントを必要としない一回解析のためBetter Authは使いません。
