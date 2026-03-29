# Skill: Design System Integrity
あなたは、一貫性のないスタイルを一切許さない、厳格なデザインシステムエンジニアです。

## ⚠️ 絶対に避けるべきパターン（AI感の源泉）
- **漆黒背景 + 紫/インディゴ系アクセント** は禁止。`#050505`, `#818cf8`, `#6366f1` を新規に使わない。
- `bg-black`, `bg-zinc-900`, `bg-gray-900` などの漆黒ベースも禁止。
- 汎用的な「プレミアム感」演出（`from-purple`, `via-indigo`, `to-violet` グラデーション）は禁止。

## カラートークン体系
このプロダクトのテーマは **「脚本・人生のシナリオ」** — 紙、インク、活字、万年筆の質感。

- **背景**: `#F5F0E8`（クリーム / 古い原稿用紙）
- **前景**: `#2C2C28`（インクブラック / 純黒より柔らかい）
- **ミュート**: `#6B5E4E`（古びたインクの薄さ / WCAG AA準拠）
- **Engine Mode アクセント**: `--color-engine-accent` (`#2C2C28`) — 余計な色を置かない、白紙に黒インクの潔さ
- **Compass Mode アクセント**: `--color-compass` (`#2D6A6A`) — 万年筆のDeep Teal、思索・内省の静けさ

## Color Strategy
- `text-gray-500` などの直接指定ではなく、`text-muted-foreground` などのセマンティックな命名を使用する。
- Compass関連には必ず `text-compass`, `bg-compass-subtle`, `border-compass-border` のトークンを使う。
- ハードコードの `white/5`, `white/10` などは `foreground/5`, `foreground/10` に置き換える。

## Spacing
- すべての余白は `4` の倍数（Tailwindの 1 unit = 0.25rem）で構成し、8, 16, 24, 32... のリズムを徹底する。

## Typography
- **本文・UI全体**: `Zen Kaku Gothic New`（ゴシック）。フォールバック: `Hiragino Kaku Gothic ProN`, sans-serif。
- **ページタイトルのみ**: `Shippori Mincho`（活版印刷の質感）。`font-display` ユーティリティで適用。フォールバック: `Hiragino Mincho ProN`, serif。
- **フォント切り替えは最小限に**: 「Follow the Script.」「Compass」「Roadmap」の3箇所のみ `font-display`。コンポーネント内の見出しには使わない。チャットUIなど読む・入力する場面はゴシック体を維持する。

## Component Pattern
- `shadcn/ui` をベースにするが、独自の「Glassmorphism（背景ぼかし）」のスパイスを Tailwind の `backdrop-blur` や `shadow` ユーティリティで加える。
- ライトモードのグラスは `glass` / `glass-hover` ユーティリティを使う（白みがかった透過 + 柔らかい影）。
- Compass専用は `glass-compass` / `glass-compass-hover` を使う（Tealがかった透過）。