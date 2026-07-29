# Security

## Controls

- `https://*.amebaownd.com`だけを許可し、公式・案内用の予約済みホストを除外
- 利用者自身または所属先が管理する公開サイトであることを送信前に確認
- `robots.txt`を取得して`SiteHodoki`または`*`の規則を尊重し、確認不能時はfail closed
- 転送は同じホストのHTTPSへ3回まで。別ホスト、資格情報、非標準portを拒否
- robots 100KB、HTML 1MB、取得8秒の上限
- HTML以外を拒否し、script、style、noscript、template内を抽出対象から除外
- same-origin POST、JSON content type、body size、UUID、honeypotを検証
- 一匿名端末につき成功解析10回/日。自動QAを業務計測から除外
- CSP、HSTS、nosniff、frame deny、厳格な権限ポリシー
- JSXとDOM `textContent`で表示し、ダウンロードHTMLへ値を埋める前にescape
- 入力URLと解析結果をD1へ保存せず、匿名イベントを30日以内に削除

## Boundary

公開トップページの棚卸しだけを行います。ログイン、管理画面、非公開ページ、画像や記事本文の取得・保存、サイト所有権の自動検証、移転先への書き込みは行いません。

Cloudflare Workersの実行環境に加えて、ホストallowlist、HTTPS限定、同一ホスト転送制限でserver-side fetchの到達先を絞ります。DNSや上流サービスが異常な場合は取得を中止します。

## Reporting

脆弱性や意図しない情報取得を見つけた場合は、公開issueへ対象URLや内容を貼らず、GitHub Security Advisoryのprivate reportを利用してください。
