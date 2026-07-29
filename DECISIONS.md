# Decisions

## 2026-07-30 — One public top page

- Decision: 初期版は利用者が管理する`*.amebaownd.com`の公開トップページ一枚だけを解析する
- Reason: 移転の最初に必要な棚卸しへ絞り、ログイン情報や非公開データを扱わない
- Boundary: 画像、記事本文、フォーム、予約、会員、独自ドメイン、SEO評価、自動公開を移さない

## 2026-07-30 — Structure, not content

- Decision: タイトル、説明、H1/H2、内部ページ導線、外部リンク、件数だけを構成図へ並べる
- Decision: JSONと静的HTMLの骨組みをブラウザ内で生成する
- Reason: 移転の見落としを減らしながら、著作物や利用者情報の複製を避ける

## 2026-07-30 — Restricted server fetch

- Decision: Owndサブドメインallowlist、予約済みホスト除外、robots尊重、同一ホストHTTPS転送、容量・時間上限を必須にする
- Decision: robotsを確認できない場合は取得しない
- Reason: server-side fetchの到達範囲と負荷を狭くし、公開者のクロール方針を優先する

## 2026-07-30 — No account, no result storage

- Decision: Better Authを使わず、入力URLと解析結果を保存しない
- Decision: 匿名の操作名と発生日だけを30日以内保存する
- Reason: 一回の棚卸しに登録を要求せず、移転元情報を継続保有しない

## 2026-07-30 — Canonical delivery

- Decision: 正規URLを`https://site-hodoki.yhay81.com`とし、`workers.dev`とpreview URLを無効にする
- Reason: 公開先と運用責任を一つに保つ
