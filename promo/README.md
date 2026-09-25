# 宣伝動画（Remotion）

アプリを実際に操作した録画に、タイトル・キャプション・カーソルを重ねた約 36 秒の動画（1920x1080, 30fps）。

## 作り直す

```bash
npm install
npx playwright install --only-shell chromium   # 録画に使うブラウザ（初回だけ）

# 1. アプリを起動してから録画する（リポジトリ直下で npm run dev）
npm run record     # public/app.mp4 と src/recording.json を作り直す

# 2. プレビュー・書き出し
npm run studio     # ブラウザでプレビューして、タイミングや文言を確かめる
npm run render     # out/promo.mp4 に書き出す
```

アプリの画面を変えたら `npm run record` から、文言や演出だけなら `npm run render` だけでよい。

## 構成

| パス | 役割 |
|---|---|
| `scripts/record.mjs` | Playwright でアプリを操作して録画する。場面の区切り・カーソルの軌跡・クリックを `src/recording.json` に書く |
| `src/scenes/Intro.tsx` / `Outro.tsx` | 最初と最後のタイトル |
| `src/scenes/AppDemo.tsx` | 録画を場面ごとに切り出し、キャプションと画面の寄せ（camera）を付ける。文言はここの `CLIPS` |
| `src/components/Cursor.tsx` | 録画したマウスの軌跡に沿ってカーソルとクリックの波紋を描く |
| `.claude/skills/` | Remotion 公式の Agent Skills（`npx skills add remotion-dev/skills` で入れたもの） |

## メモ

- Remotion は個人や 3 人以下の会社なら無料。それより大きい会社で使うときは有料のライセンスが要る（<https://www.remotion.pro/license>）
- キャプションのフォント（Noto Sans JP）は書き出しのたびに Google Fonts から読み込むので、ネットにつながっている必要がある
- 音声は入れていない
