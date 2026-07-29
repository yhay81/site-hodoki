# Metrics

入力URLや解析結果を保存せず、ブラウザ生成UUID、操作名、書き出し形式、発生日だけで利用状況を見ます。自動QAは`?qa=1`、WebDriver、`x-automated-qa`で除外します。サンプル表示は記録しません。

| Metric           | Source                          | Meaning                          |
| ---------------- | ------------------------------- | -------------------------------- |
| `users`          | distinct `visited` session      | 匿名訪問者                       |
| `inspectors`     | distinct `inspected` session    | 公開サイトの解析に成功した利用者 |
| `inspections`    | `inspected` events              | 日別に重複排除した成功解析       |
| `exporters`      | distinct `export_saved` session | JSONかHTMLを保存した利用者       |
| `json_exporters` | `export_saved/json`             | 構成図を保存した利用者           |
| `html_exporters` | `export_saved/html`             | HTML下書きを保存した利用者       |
| `returned`       | distinct `returned` session     | 別日に再訪した匿名利用者         |
| `users_7d`       | recent `visited`                | 直近7日の匿名訪問者              |
| `inspectors_7d`  | recent `inspected`              | 直近7日の成功解析利用者          |

`inspected`は成功時だけ記録します。同じセッション、操作名、形式、日付のイベントは一件へまとめ、30日以内に削除します。入力URL、サイト名、説明、見出し、リンク、IPアドレス、User-Agentはイベントへ記録しません。
