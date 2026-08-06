# NotePlanner 写入规则（noteplanner.rules.md）

> 本文件是「agent 知识沉淀」的契约。任何能读写此目录的 agent，应在每次会话开始时读取本文件，
> 决定"回答用户问题的同时，把哪些知识点沉淀到哪里"。修改即时生效，无需重启 NotePlanner。
>
> 目录结构约定（由 NotePlanner 的 scan() 决定，不要违反）：
> - 顶层文件夹 = 主题（topic），如 `工作`、`生活`、`阅读`
> - 主题下的二级文件夹 = 笔记集（collection）
> - 任意 `.md` 文件 = 一条笔记，文件名即标题
> - `零散笔记/` = 零散笔记区（未归类知识的默认落点）
> - `回收站/` = 回收站，**禁止 agent 写入**
> - 根目录的 `.md` / `.yaml`（如本文件、`AGENTS.md`）不会被当成笔记，可放心放置配置

```yaml
version: 1

# 未命中任何路由规则时的默认落点：
#   loose = 写入「零散笔记/」
#   ask   = 反问用户该放哪（适合你希望完全掌控落点的场景）
default_destination: loose

# 路由表：按序匹配，首个命中生效（match 中任一关键词出现在用户问题里即算命中）
# 越具体的条目越靠前放。可自由增删。
routing:
  - match: [LLM, 大模型, Transformer, 注意力机制, GPT, 预训练, 微调]
    topic: 工作
    collection: AI 笔记
  - match: [React, Vue, 前端, 组件, CSS, 布局]
    topic: 工作
    collection: 前端
  - match: [读书, 作者, 书目, 读后感]
    topic: 阅读
    collection: 读书笔记
  - match: [理财, 基金, 股票, 资产配置, 定投]
    topic: 生活
    collection: 投资笔记

# 笔记集骨架（scaffold）：用户要求"生成关于 X 的笔记集 / 大纲 / 知识框架"时按此生成
# 触发语示例："帮我生成一个关于 X 的笔记集"、"给 X 列个大纲"
# 未命中 scaffolds 时退回 behavior.generate_collection.fallback（默认由 agent 按领域知识自拟子笔记）
scaffolds:
  # 可选：为固定学科写死骨架，命中即按 listed 子笔记生成，确定性最强；留空或按需增删
  # 以下「马克思主义」仅作格式示例，说明 notes 怎么列
  - match: [马克思主义, 马列主义, 马哲]
    topic: 政治理论
    collection: 马克思主义
    notes: [导论, 马克思主义哲学, 马克思主义政治经济学, 科学社会主义]

# 去重策略：写前先检索目标位置是否已有相似笔记
dedup:
  strategy: append        # append=追到同名笔记；skip=跳过不写；new=强制新建
  match_scope: topic      # topic=仅在目标笔记集内比对；global=全库比对
  title_similarity: exact # exact=标题完全一致；contains=含该标题即算命中

# 单条笔记的格式约束
note_format:
  include_source: true         # 末尾记录"来源：<原问题>"
  include_timestamp: true      # 末尾记录"时间：<ISO8601>"
  append_heading: "补充"       # 追加内容时的小标题前缀，避免一条笔记被无结构地越写越长
  max_body_chars: 1200         # 单条正文上限，超出则拆成多条或截断
  no_front_matter: true        # 不在笔记里写 `---` 包裹的 YAML front matter（会与 parseMd 的 `---` 分隔冲突，导致正文被误判为 front matter）

# 行为开关
behavior:
  capture: auto                # auto=回答时自动沉淀；ask=仅用户明确要求"记一下"时才写
  read_before_write: true      # 写前先检索已有笔记，用于去重并顺便把旧知识纳入回答（RAG）
  create_topic_if_missing: true    # 路由目标主题不存在时自动新建文件夹
  create_collection_if_missing: true  # 路由目标笔记集不存在时自动新建文件夹
  max_notes_per_answer: 5      # 单次回答最多沉淀条数，防止噪声
  preserve_user_content: true # 只追加/扩展用户笔记，绝不覆盖或删除用户已写正文（除非用户明确要求改写）
  atomic_writes: true         # 一次性写入完整文件内容，避免半截文件被文件监听读到导致界面刷新异常
  # 笔记集骨架生成（与 scaffolds 配合；核心机制是 fallback 由 agent 按领域知识自拟子笔记）
  generate_collection:
    enabled: true                    # 允许用户要求 agent 生成"一整个笔记集 + 若干空笔记"
    fallback: derive_from_knowledge # 未命中 scaffolds 时，agent 按领域知识自拟 4–6 个子笔记
    ask_topic: true                 # 生成前先问用户：该笔记集放到哪个主题下（不存在则新建）
    empty_note_body: heading        # heading=仅写一个 # 标题；empty=完全空白
    idempotent: true                # 笔记集已存在则只补建缺失子笔记，不重复创建
```

---

# 自然语言指引（agent 必须遵循）

1. **抽取知识点**：每次回答后，从内容中拆出 1–N 个相互独立的"知识点"（可单独检索的事实 / 结论 / 方法），不要整段对话塞进一条笔记。
2. **路由判断**：每个知识点先按 `routing` 匹配关键词。命中 → 落到对应 主题/笔记集；未命中 → 落到 `default_destination`（默认「零散笔记」）。
3. **写前去重**：先检索目标位置是否已有同名 / 高度相关笔记。有则在其下以 `## 补充 · <时间>` 追加，不要新建重复笔记；无则新建 `.md`。
4. **命名与正文**：标题用简短名词短语；正文用要点或 2–4 句话。标题 / 文件夹名**避开** `\ / : * ? " < > |` 九个字符（否则 NotePlanner 会自动替换成 `_`）。
5. **安全护栏**：禁止写入 `回收站/` 目录；不要把私密凭证、密钥写进笔记。
6. **无需回调**：写入 `.md` 文件后不用做任何其它操作，NotePlanner 通过文件监听会自动刷新界面。
7. **噪声控制**：开启 `capture: auto` 时，仍受 `max_notes_per_answer` 限制；泛泛而谈、无检索价值的内容不要写。
8. **生成笔记集骨架**：当用户要求"生成 / 建一个关于 X 的笔记集（或大纲 / 知识框架）"时：
   - 先按 `scaffolds` 关键词命中；命中则用 listed 子笔记；未命中则按 `fallback` 由 agent 用领域知识自拟 4–6 个合理子笔记标题。
   - 生成前按 `ask_topic` 询问用户：该笔记集放到哪个主题下（主题不存在则新建）。
   - 建 `主题 > 笔记集 > N 条空笔记`；空笔记正文按 `empty_note_body`（默认仅一个 `# 标题`）。
   - 按 `idempotent`：若笔记集已存在，只补建缺失的子笔记，不重复创建。
   - 同样遵守 `safeName` 九字符限制与"禁止写回收站"等护栏；写入后 NotePlanner 自动刷新。
9. **参照既有格式（格式对齐）**：无论是向已有笔记新增条项，还是在同一笔记集内新建笔记，都必须先读取该笔记集内已有的笔记，对照其既有排版来填充。需对齐的维度包括：标题层级（`#`/`##` 的用法）、列表标记（`-` 还是 `*`）、强调方式（`**粗体**` 还是 `_斜体_`）、来源/时间落款的写法与位置、正文语种与语气。若笔记集内已有其它笔记，新笔记须与其格式保持一致，**不要自创一套样式**；只有当该笔记集为空、无任何可参考样本时，才按本文件默认约定书写。
10. **禁止 YAML front matter**：笔记正文里不要使用 `---` 包裹的 front matter（如 `---\ntitle: x\n---`）。NotePlanner 的 `parseMd` 以 `---` 切分，会被误判成 front matter 而吞掉正文。来源/时间一律写在文末 footer（`来源：`/`时间：`），不要塞进 front matter。
11. **保护用户已有内容（不破坏式写入）**：agent 与用户共享同一工作目录。向笔记追加时只增不删；绝不整体覆盖、改写或删除用户已写的正文，除非用户明确说"改写/重写/替换"。新建笔记不会动到任何已有笔记。
12. **原子写入、不碰配置与侧车**：每次写 `.md` 时一次性写入完整内容（不要靠追加模式一行行写，避免文件监听在半截时刷新读到损坏内容）。严禁写入/覆盖根目录的配置文件（`noteplanner.rules.md`、`AGENTS.md`、`DESIGN.md` 等 `.md`/`.yaml`），也严禁手写 NotePlanner 的 `.meta.json` / `.collection-meta.json` / `.group-meta.json` 等侧车文件（由 app 管理，乱写会破坏元数据）。
13. **建文件前先校验安全名**：笔记/文件夹名会按 `safeName` 把 `\ / : * ? " < > |` 替换成 `_`。新建前用"替换后的名字"检查目标路径是否已存在同名文件，避免因为 `?` 等被替换而产生意料外的重复或落点（`dedup` 处理标题级去重，这里补的是文件系统层校验）。

---

# 示例

用户问："Transformer 的注意力机制到底解决了什么问题？"

agent 回答后，判定命中 `routing[0]`（关键词 注意力机制 / Transformer），于是：

- 新建（或追加到）`工作/AI 笔记/注意力机制.md`
- 正文：用 3–4 句话解释 Self-Attention 解决了 RNN 的长程依赖与并行问题
- 文末追加：`来源：Transformer 的注意力机制到底解决了什么问题？` 与 `时间：2026-08-04T16:00:00+08:00`

若用户问的是与任何路由都不相关的生活琐事，则写入 `零散笔记/那条琐事.md`。

---

# 示例：生成笔记集骨架

用户说："帮我生成一个「马克思主义」的笔记集，分成几个部分。"

agent 先按 `scaffolds` 命中 `match: [马克思主义]`，得到子笔记 `[导论, 马克思主义哲学, 马克思主义政治经济学, 科学社会主义]`；
按 `ask_topic: true` 询问父主题（用户答"政治理论"）；于是创建：

- `政治理论/马克思主义/导论.md`（正文仅 `# 导论`）
- `政治理论/马克思主义/马克思主义哲学.md`
- `政治理论/马克思主义/马克思主义政治经济学.md`
- `政治理论/马克思主义/科学社会主义.md`

若用户说"生成一个「量子力学」的笔记集"且未在 `scaffolds` 中定义，agent 按 `fallback` 自拟子笔记（如 导论 / 量子态 / 叠加与纠缠 / 测量问题 / 应用），同样先问父主题再建。已存在同名笔记集时按 `idempotent` 只补缺失子笔记。
