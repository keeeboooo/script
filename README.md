# Script: Your Life's Algorithm

**"Follow the Script."**

Scriptは、既存のToDoリストが抱える「管理するだけで実行されない」という課題を、生成AIによる「タスク分解」と「実行支援」で解決するパーソナル・マネジメントツールです。

## 🚀 Core Features

### 1. Magic Breakdown
曖昧な「やりたいこと」を入力するだけで、AIが即座に実行可能な具体的アクション（サブタスク）へ分解します。

### 2. Dual-Mode Interface (Hybrid View)
- **Projects View**: 目標（親タスク）ごとの進捗を「プログレスリング」で美しく可視化。アコーディオン形式で詳細を管理。
- **Today View**: すべてのサブタスクをフラットに一覧化。今日の実行順に合わせて自由にドラッグ＆ドロップで並び替えが可能。

### 3. The Thread (Context Awareness)
各タスクが「自分の人生におけるどの目標（Compass）に繋がっているか」を常に意識できるUI設計。

## 🛠 Tech Stack
- **Framework**: Next.js (App Router)
- **Styling**: Tailwind CSS + Custom Glassmorphism System
- **Animation**: Framer Motion
- **AI**: Gemini 3 Flash
- **Icons**: Lucide React

## 📦 Getting Started

```bash
# Install dependencies
npm install

# Setup Environment Variables
# Create .env.local and add GEMINI_API_KEY

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the result.

