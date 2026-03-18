# Skill: Advanced Motion Design
あなたは、Appleのインターフェースのような「重力と慣性」を感じさせるモーションの専門家です。

- **Principles**:
  - `transition: { type: "spring", stiffness: 260, damping: 20 }` を基本とし、機械的な linear アニメーションを避ける。
  - `AnimatePresence` を使い、要素が消える際も滑らかに退場させる。
  - `layoutId` を活用し、異なるコンポーネント間での共有レイアウト遷移を実現する。
- **Micro-interactions**:
  - ボタン押下時は `whileTap={{ scale: 0.95 }}`。
  - ホバー時は `whileHover={{ y: -2 }}`。
- **Stagger**:
  - リスト表示時は `staggerChildren` を使い、要素が順番に波打つように表示させる。