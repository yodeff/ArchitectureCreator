# Architecture Workspace

開発を始める前に、アプリのデータの流れと、実装しないといけないものをざっと描いて整理する Web アプリ（MVP）。
要素の種類はクリーンアーキテクチャの層に対応させてある。

## 実行

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # 型検査（tsc -b）とビルド
npm run lint     # oxlint
```

## 使い方

- 大きなコンポーネント（例: 注文・会員）ごとに **Page** を分けて描く。Canvas の下のタブで切り替え、**+** で追加、ダブルクリックで名前を変え、× で削除する。Page どうしは Edge でつながない
- **+ Add Node** で Node を追加し、Node の右の点から別の Node の左の点へドラッグして Edge を作る
  - Node の種類と層: Requirement（層の外）・API（Interface Adapters: Controller）・UseCase（Use Cases: Interactor）・Entity（Entities）・Database / External（Frameworks & Drivers: Repository / Gateway の実装）
  - 矢印は「使う側 → 使われる側」。データを読む・書く線は、Edge のパネルで「読む」「書く」にすると色が変わる（Canvas 右上の「凡例」）
- Node / Edge をクリックすると右のパネルで編集・削除できる（Delete / Backspace キーでも削除できる）。Entity と Database は項目名を書ける
- **Delete All** ですべての Page を削除し、空の Page を1つ残す（Project 名は残る。Undo で戻せる）
- Node を選ぶと、その Node を通る流れ（矢印をさかのぼった上流と、たどった下流）を強調する。UseCase を選べば、その機能で使うものが分かる
- **Undo / Redo**（Ctrl+Z / Ctrl+Shift+Z・Ctrl+Y）で編集・移動・整列・Import・Page の追加や削除を戻せる。文字の入力は欄ごとにまとめて戻る。別の Page で行った変更を戻すと、その Page に切り替わる
- 上の検索欄（Ctrl+K）で、すべての Page から名前・説明・項目名で Node を探す（表示中の Page の結果が先、ほかの Page の結果には Page 名が付く）。一致した Node は Canvas とミニマップで強調され、選ぶとその Page とその Node へ移動する
- 左の View で、表示中の Page の表示を切り替える。どの View も同じデータから作る
- **Auto Layout** で表示中のグラフを左から右へ整列する
- データはブラウザの localStorage に保存される。**Export JSON** はすべての Page を1つのファイルに書き出す
- **Import JSON** は、選んだファイル（複数選べる）の Page を後ろに追加する。Page を持たないファイル（Page を入れる前の書き出しなど）は、その name（なければファイル名）の Page になる。空の Page が1つだけのとき（Delete All の直後など）は、それと置き換える。読めないファイルがあっても、読めたファイルは取り込む
- 以前の形式（Component や、関係をラベルで持つ JSON）も読み替えて読み込む

## 構成

| パス | 役割 |
|---|---|
| `src/graph/types.ts` | Node・Edge・Page・Project の型と、種類ごとのクリーンアーキテクチャの層 |
| `src/graph/nodes.ts` | Node の表示名・項目・検索 |
| `src/graph/flow.ts` | 選んだ Node を通る流れ（上流と下流）の追跡 |
| `src/graph/filters.ts` | View の定義と、Page の Graph から View に表示する部分を取り出す処理 |
| `src/graph/layout.ts` | ELK による自動整列と、Node の座標の決め方 |
| `src/graph/io.ts` | Import する JSON（以前の形式を含む）の検証と読み替え、Export する JSON、ファイルのダウンロード |
| `src/store/projectStore.ts` | 唯一のデータ（Project）と Page ごとの表示用の座標、表示中の Page、Undo / Redo の履歴。localStorage に保存する |
| `src/components/` | Canvas・Page のタブ・サイドバー・編集パネルの画面 |
| `src/data/sampleProject.ts` | 初回起動時のサンプル |
