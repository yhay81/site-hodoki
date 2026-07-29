# サイトほどき public pilot

## Decision

- Status: 30-day public pilot
- Review deadline: 2026-08-29
- Investment decision: hold
- Target: Ameba Owndで公開サイトを管理し、移転前の棚卸しを始める日本語利用者
- Existing alternatives: 手作業のメモ、ブラウザ保存、WordPress等の移行代行、汎用スクレイパー

ホスティングや自動移行へ広げず、「公開トップページを一回読み、持ち出せる骨組みにする」という狭い入口に需要があるかを確かめます。

## Falsifiable outcome

- Continue: 実利用者10人以上、異なる管理サイト10件以上の成功解析、書き出し5人以上、別日再訪2人以上
- Hold: 30日後も成功解析3人未満、または書き出し1人未満
- Stop/reshape: 記事本文・画像の自動コピー、管理画面ログイン、移転先への自動公開がなければ利用価値が成立しない
- Automated QA、サンプル表示、訪問だけのセッションは実利用に数えない

獲得は検索、Tool Shelf、利用者自身による自然な共有に限定します。許可のないDM、メール、SNS投稿は行いません。

## Safety boundary

- 管理中であることを確認した公開Owndサブドメインだけを受け付ける
- robotsを尊重し、確認不能時は取得しない
- 入力URLと解析結果を保存しない
- 画像や記事本文をコピーしない
- 解析結果は移転の完全性、所有権、法令適合性を保証しない
