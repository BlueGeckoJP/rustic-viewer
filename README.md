# Rustic Viewer

**このファイルはAIが書きました**

Rustic Viewer — Tauri + React + WASM による高速タイル画像ビューア（WebP 優先）

概要
- Rustic Viewer はローカル画像（大判画像や多数の画像）をスムーズに閲覧できることを目的とした軽量なビューワです。
- アプリは Tauri をホストにし、UI は React (TypeScript)、重い画像処理（タイル生成・ピクセル操作など）は Rust/WASM または Rust ネイティブで担当するハイブリッド構成を想定します。
- 優先サポート: WebP（ブラウザネイティブを活用）。HEIF は低優先で、必要ならネイティブ Rust 側で対応します。

ステータス
- 設計フェーズ → README 作成済み
- 次フェーズ: 最小プロトタイプ（ローカル画像読み込み → タイル生成 → Canvas 描画）

主要機能（目標）
- 大判画像のタイル表示（オンデマンドでタイルを生成 / キャッシュ）
- スムーズなパン・ズーム（Canvas / WebGL / OffscreenCanvas を検討）
- 複数画像フォーマットのサポート（PNG/JPEG/WebP 優先、HEIF は将来的対応）
- キーボードショートカット、フルスクリーン、サムネイル・リスト
- Tauri を介したネイティブファイルアクセスと設定保存

アーキテクチャ（概要）
- Desktop Shell: Tauri (Rust)
  - ファイルシステム / ネイティブ API / 将来の libheif 統合 を担当
  - タイル生成（ネイティブで高効率に実施する場合）やキャッシュ管理を担う
- Frontend: React (TypeScript)
  - UI / ユーザー操作（メニュー・ショートカット・設定）を実装
  - Canvas / WebGL 上でタイルを描画
- WASM (Rust)
  - CPU集中処理（カスタムフィルタ、並列タイル合成、特定形式の部分デコードなど）を担当
  - Worker 内で動かしてメインスレッドをブロックしない運用を想定
- データフロー（例）
  - 1) フロントでファイルパスを選択 → 2) Tauri（Rust）にパス送信 → 3) Rust がタイルを生成（または WASM を呼ぶ）→ 4) タイルをバイナリ / 一時ファイル / invoke 経由で React に渡す → 5) React は ImageBitmap / putImageData で描画

技術スタック（候補）
- Tauri (Rust)
- Rust (backend core, optional native libs: libheif, libwebp 等)
- React + TypeScript (UI)
- WASM via wasm-bindgen / wasm-pack（image 処理ロジックを部分的に移行）
- ビルドツール: Vite (フロント), trunk/wasm-pack (wasm), cargo (rust)
- 描画: HTML Canvas 2D / OffscreenCanvas / WebGL（必要に応じて WebGPU 検討）

開発環境（必須）
- Rust toolchain（stable）
- Node.js (16+) / npm or yarn / pnpm
- Tauri prerequisites（プラットフォームに依存）
  - macOS: Xcode Command Line Tools, brew
  - Windows: Visual Studio Build Tools (MSVC)
  - Linux: libwebkit2gtk-dev 等
- （HEIF を扱うなら）libheif-dev / libheif をインストール

クイックスタート（開発）
以下は開発用の雛形コマンド（リポジトリを作成し、ファイル配置後に使用してください）。

1) リポジトリの初期化（例、gh CLI を使用する場合）
```bash
# リポジトリを作る（事前に gh auth login 等を済ませる）
gh repo create BlueGeckoJP/rustic-viewer --public --description "Rustic Viewer — Tauri + React + WASM image tile viewer (WebP優先)" --confirm

git clone git@github.com:BlueGeckoJP/rustic-viewer.git
cd rustic-viewer
```

2) フロントの雛形（React + Vite）
```bash
# ルートに frontend ディレクトリを作り、Vite React テンプレを用意
cd frontend
npm create vite@latest . -- --template react-ts
npm install
```

3) Tauri の初期化（ルートに src-tauri ができる）
```bash
# プロジェクトルートで
cargo install create-tauri-app # or use npx create-tauri-app
# 既存フロントがある場合は cargo tauri init を実行して設定を合わせる
cd ..
cargo tauri init
```

4) WASM（Rust）モジュールの雛形
```bash
# wasm 用の crate を作る（例: rust_wasm）
cargo new --lib rust_wasm
# wasm-bindgen 等を追加、wasm-pack / wasm-bindgen を用いてビルドして frontend に取り込む
```

5) ローカルで動かす（例）
```bash
# frontend 側で開発サーバー起動
cd frontend
npm run dev

# または Tauri 統合で
cd project-root
npm install # frontend deps
npm run tauri dev
```

設計ノート（重要な設計決定）
- WebP はまずブラウザネイティブで扱う。WASM はタイル生成や特殊フィルタに限定して使うことで起動時間とバイナリサイズを抑える。
- HEIF は低優先。将来的に必須になれば Rust ネイティブ側で libheif を呼び出してタイルを供給する方針。
- タイル転送は transferables（ImageBitmap / ArrayBuffer）を使いコピーを避ける。大量データは一時ファイル経由も検討する。
- 大画像対策としてタイルの LRU キャッシュを実装し、必要タイル以外はメモリから解放する。
- マルチスレッド処理は Worker を基本に、WASM threads を使う場合は COOP/COEP 設定を確認（Tauri 環境では制約が緩い場合がある）。

プロジェクト構成（例）
- /frontend — React (TypeScript) アプリ
- /src-tauri — Tauri の Rust コード（バックエンド）
- /rust_wasm — wasm 用 Rust crate（wasm-pack / wasm-bindgen 出力）
- /docs — 設計ドキュメント・UI モックアップ

命名・識別子
- リポジトリ: BlueGeckoJP/rustic-viewer
- アプリ表示名: Rustic Viewer
- Tauri アプリ ID（推奨）: com.bluegecko.rusticviewer

貢献
- Issue / PR を歓迎します。まずは Issue で要望やバグを共有してください。
- ブランチ戦略: main は常に安定、機能ごとに feature/* ブランチを作成してください。

ロードマップ（短期 → 中期）
- v0.1 (最小プロトタイプ)
  - ローカル画像を読み込み、Canvas に描画（PNG/JPEG/WebP）
  - 基本的なパン・ズーム、タイル分割（簡易実装）
- v0.2
  - タイルキャッシュ、Worker を使った非同期デコード
  - UI: サムネイル、画像リスト、ショートカット
- v1.0
  - パフォーマンス最適化（OffscreenCanvas / WebGL）
  - HEIF のネイティブ対応（必要なら）
  - Windows/macOS/Linux 向けのインストーラ提供

ライセンス
- 初期は MIT を推奨（リポジトリ作成時に LICENSE を追加してください）。

参考 / 関連技術メモ
- wasm-bindgen / wasm-pack / trunk
- Tauri docs: https://tauri.app
- OffscreenCanvas / ImageBitmap（transferable）を使った高速描画の実践記事
- libheif（HEIF サポートを実装する場合のネイティブライブラリ）

連絡
- メンテナ / org: BlueGeckoJP

---

作業の進め方（私からの提案）
- 私はこの README を作成しました。次は「最小プロトタイプのスキャフォールド」をリポジトリに追加するか、まず README をリポジトリにコミットするステップです。
- あなたがリポジトリを作成してコミットしたい場合は、上にある gh コマンドを実行してください。実行後に「作った」と教えていただければ、私がリポジトリに対して scaffold（Tauri + React + worker + wasm の最小雛形）を PR として作成する準備を進めます。
