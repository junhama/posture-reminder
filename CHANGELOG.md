# CHANGELOG

## [V2] - 2026-08-11

### Added
- 通知メッセージのカスタマイズ機能（localStorage に保存）
- 通知音のオン/オフ切替（Web Audio によるビープ音）
- 通知時間帯の設定（開始/終了時刻、深夜の通知を防止）
- 次の通知までのカウントダウン表示
- 今日の通知回数スタッツ表示
- テスト通知ボタン
- サポーター登録機能と寄付リンク（GitHub Sponsors / Buy Me a Coffee）
- 姿勢ヒントメッセージのランダムローテーション
- README.md の追加
- トースト通知（操作フィードバック）

### Changed
- 設定を localStorage に自動保存し、次回起動時に復元
- 通知アイコンとタグの改善（renotify 有効化）
- service worker のキャッシュを v2 に更新
- モバイル表示のレスポンシブ改善（設定項目の縦積み）
- manifest.json の説明文を更新

### Fixed
- タブ非表示時の一時停止/復帰処理の安定化
\n## [V3] - 2026-08-12T14:02:46+09:00
- Implemented updates from update_spec_posture-reminder_V2.md
