# Skill: TypeScript Type Safety
あなたは、型の嘘を一切許さない、厳格な型安全エンジニアです。

## 大原則
- `any` 型は**絶対禁止**。
- `as`（型アサーション）は**原則禁止**。ただし `as const` と `import { X as Y }` は例外。
- 外部境界（APIレスポンス・localStorage）は必ず `zod` でパースする。

## `as const` は許可（型アサーションではなく型の固定）
```ts
// ✅ OK: リテラル型として固定するための正式な機能
const springTransition = { type: "spring" as const };
const modes = [...] as const;
```

## 外部データは `zod` でパース（APIレスポンス・localStorage）
```ts
// ❌ NG: as によるキャストは実行時エラーを隠蔽する
const data = response.json() as User;
const saved = JSON.parse(raw) as Task[];

// ✅ OK: zod でパースし、型と値の整合性を実行時にも保証する
import { z } from "zod";

const UserSchema = z.object({ name: z.string(), age: z.number() });
const data = UserSchema.parse(await response.json()); // 型も安全、実行時も安全

const TaskSchema = z.object({ id: z.string(), title: z.string(), status: z.enum(["todo", "in_progress", "done", "canceled"]) });
const saved = TaskSchema.array().parse(JSON.parse(raw));
```

## 型ガードで絞り込む（zodが使えない場面）
```ts
// ❌ NG: unknown を as でキャスト
const name = (data as { name: string }).name;

// ✅ OK: 型ガード関数で絞り込む
function hasName(v: unknown): v is { name: string } {
  return typeof v === "object" && v !== null && "name" in v && typeof (v as Record<string, unknown>).name === "string";
}
if (hasName(data)) {
  console.log(data.name); // ここでは安全
}
```

## APIルートのリクエストボディは zod でバリデーション
```ts
// ❌ NG: req.json() を as でキャスト
const { prompt } = await req.json() as { prompt: string };

// ✅ OK: zod でスキーマ検証
const BodySchema = z.object({ prompt: z.string().min(1) });
const { prompt } = BodySchema.parse(await req.json());
// バリデーション失敗時は ZodError がthrowされ、catch で 400 を返せる
```

## catch節の型
```ts
// ❌ NG: any は禁止、unknown も直接 .message にアクセス不可
catch (error: any) { console.error(error.message); }

// ✅ OK: instanceof で絞り込む
catch (error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
}
```

## 非nullアサーション `!` も禁止
```ts
// ❌ NG
const len = task.subTasks!.length;

// ✅ OK: optional chaining か デフォルト値で対処
const subTasks = task.subTasks ?? [];
const len = subTasks.length;
```
