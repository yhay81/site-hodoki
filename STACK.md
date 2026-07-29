# Stack

- Runtime: Cloudflare Workers
- API / rendering: Hono / Hono JSX
- Build and quality: Vite+ / TypeScript / Oxlint / Oxfmt / Vitest
- Persistence: Cloudflare D1（匿名操作イベントのみ）
- Delivery: `site-hodoki.yhay81.com` custom domain; `workers.dev` and preview URLs disabled
- Authentication: なし

公開ページを一回読み取るだけで、アカウントに紐づくデータや復旧対象がありません。Better Authは導入せず、継続保存、チーム共有、移転代行を扱う段階で再評価します。
