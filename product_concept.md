# Product Concept: Script

## 1. Product Vision
**"Follow the Script."**
既存のToDoリストが抱える「管理するだけで実行されない」という課題を、生成AIによる「タスク分解」と「実行支援」で解決する。
ユーザーの「やりたい」という曖昧な意図を、AIが具体的な「行動可能なアクション」に変換し、実行のハードルを極限まで下げる。

## 2. Target User & Philosophy
- **Target**: やりたいことは多いが、タスク管理自体が手間になり、結局行動に移せていない人。
- **Philosophy**: 生成AI時代において重要なのは「実行力」。AIは単なる整理役ではなく、実行のパートナーとなる。

## 3. User Stories (Based on User's Examples)

### Story 1: "Handmade Udon" (Lifestyle/Hobby)
**User Input**: "うどんを手作りしてみたい"
**Current Pain**: 漠然としていて、材料調べや手順確認が面倒。休日にやろうと思っても腰が重い。
**AI Solution**:
1.  **Auto-Breakdown**: AIが即座にタスクを分解。
    -   [ ] レシピ動画を3つ提案（リンク付き）
    -   [ ] 必要な道具リスト（麺棒、こね鉢など）と購入リンク提示
    -   [ ] 材料リスト（中力粉、塩、水）
    -   [ ] 所要時間の見積もり（「寝かせる時間含めて3時間かかります」）
2.  **Scheduling**: "今週末の土曜日、10時から3時間空いてますか？カレンダーに入れますか？"と提案。
3.  **Execution Support**: 買い物リストをAmazonカートに入れる（API連携等の将来像）、またはスーパー用チェックリストを作成。

### Story 2: "Wine Learning App" (Development/Project)
**User Input**: "ワイン学習アプリを作りたい"
**Current Pain**: 機能の妄想で止まってしまい、最初の一歩（DB設計や環境構築）が踏み出せない。
**AI Solution**:
1.  **Contextual Breakdown**: 開発者であることを認識し、技術的なタスクに分解。
    -   [ ] 要件定義のたたき台作成（AIがドラフト作成）
    -   [ ] Next.jsプロジェクトのセットアップコマンド提示
    -   [ ] DBスキーマ案（User, Wine, Reviewテーブル等）の提示
2.  **Co-Pilot Mode**: "まずは `npx create-next-app` しましょうか？" とコマンドを提示・実行支援。

## 4. Core Features

### 1. Magic Breakdown (タスクの具体化)
- ユーザーの入力（1行）を「親タスク」とし、実行可能な粒度（サブタスク）まで自動分解してネスト構造で管理する。
- **Actionable**: 単なるリストではなく、URL、コマンド、購入リンクなど「すぐに行動できる情報」を付加する。
- **Progress Visualization**: 親タスクにはサブタスクの進捗状況を示す「プログレスリング」が表示され、達成度を視覚的に把握できる。
- **Dual View**: 「プロジェクト（全体像）」と「今日（実行）」の視点を切り替え、管理と実行を両立させる。

### 2. Execution Agent (実行代行・支援)
- **For Digital Tasks**: コード生成、メール下書き作成、検索・調査の代行。
- **For Physical Tasks**: 手順の提示、必要なリソース（物・時間）の確保支援。

### 3. Smart Nudge & Context Awareness (文脈理解)
- "いつかやる" を放置させない。
- ユーザーの空き時間や状況に合わせて「今ならこれだけ出来ますよ」と提案（例：「今15分あるなら、うどんのレシピ動画だけ見ませんか？」）。

### 4. Frictionless Input (入力の簡略化)
- 音声入力や雑なメモ書きでも、AIが意図を汲み取って構造化する。

## 5. Tech Stack (Proposed)
- **Frontend**: Next.js (App Router), React
- **Styling**: Tailwind CSS (for rapid & premium UI)
- **AI**: Vercel AI SDK, OpenAI API (GPT-4o) or Gemini Pro
- **Database**: Supabase or PostgreSQL (Prisma)
- **Deployment**: Vercel

## 6. Next Steps for Development
1.  **Prototype**: "Magic Breakdown" 機能（入力→AI分解）のみを実装したMVPを作成。
2.  **UI/UX Design**: "Premium & Dynamic" なインターフェース設計。やる気を削がない美しいデザイン。
