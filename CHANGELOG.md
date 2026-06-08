## v3.3.2-build20260608f (2026-06-08)

### 诊断日志清理
- 清理：删除 claw.js 中所有 [Claw][诊断] 日志块（5处，共74行）
- 清理：删除 physics.js 中 [Physics][调试] 日志行
- 保留：debugLog 基础设施（utils.js 中 log() 函数和 downloadDebugLog()），供后续调试使用

---

## v3.3.2-build20260608e (2026-06-08)

### Bug修复
- 修复：finishRemoveDoll() 中引用已删除的 gIdx 变量（ReferenceError: gIdx is not defined）
- 删除冗余的 gIdx 相关日志输出

---

## v3.3.2-build20260608d (2026-06-08)

### ID串味修复（根因：splice() 导致索引偏移）
- 修复：`getDollPhysics(id)` 改为遍历查找，不再依赖数组索引（解决 splice() 后 id 与索引不对应导致的【ID串味】问题）
- 修复：`physics.js update()` 先 `slice()` 复制数组再遍历，避免遍历中 splice() 导致跳过后续娃娃
- 新增：`physics.js registerDoll()` 增加 `isGrabbed: false` 属性（默认未被抓取过）
- 新增：`claw.js onCollisionDetected()` 中设置 `physObj.isGrabbed = true`（标记娃娃已被抓取过）
- 修复：`physics.js checkGroundCollision()` 增加 `isGrabbed` 检查，只有被抓过的娃娃才能判分（未被抓过的娃娃不判分）

---

## v3.3.2-build20260608d (2026-06-08)

### ID串味修复（根因：splice() 导致索引偏移）
- 修复：`getDollPhysics(id)` 改为遍历查找，不再依赖数组索引（解决 splice() 后 id 与索引不对应导致的【ID串味】问题）
- 修复：`physics.js update()` 先 `slice()` 复制数组再遍历，避免遍历中 splice() 导致跳过后续娃娃
- 新增：`physics.js registerDoll()` 增加 `isGrabbed: false` 属性（默认未被抓取过）
- 新增：`claw.js onCollisionDetected()` 中设置 `physObj.isGrabbed = true`（标记娃娃已被抓取过）
- 修复：`physics.js checkGroundCollision()` 增加 `isGrabbed` 检查，只有被抓过的娃娃才能判分（未被抓过的娃娃不判分）

---

## v3.3.2-build20260608d (2026-06-08)

### ID串味修复（根因：splice() 导致索引偏移）
- 修复： 改为遍历查找，不再依赖数组索引（解决 splice() 后 id 与索引不对应导致的【ID串味】问题）
- 修复： 先  复制数组再遍历，避免遍历中 splice() 导致跳过后续娃娃
- 新增： 增加  属性（默认未被抓取过）
- 新增： 中设置 （标记娃娃已被抓取过）
- 修复： 增加  检查，只有被抓过的娃娃才能判分

---

## v3.3.2-build20260608c (2026-06-08)

### 日志与状态修复
- 修复：[出口顶端松爪判断后] 日志时机错误（原在 releaseAllDolls() 之前，现移到之后，正确反映 releasedDolls 状态）
- 修复：releaseAllDolls() 中重复调用 animateClawOpen()（已删除，updateReturning() 中已调用）
- 修复：finishRemoveDoll() 中冗余的 gIdx 检查（已删除，娃娃此时已在 releasedDolls 中，gIdx 恒为 -1）

### 文档更新
- 更新 PRD/抓取流程与状态标记说明.md：
  - 新增【各个娃娃列表的含义】表格（第四节）
  - 新增【完整流程中的列表变化】章节（第五节，分阶段说明数组变化）

---

# 抓娃娃机版本历史

## v3.3.2-build20260608b (2026-06-08)

### 诊断增强：多节点全列表日志 + 独立日志文件
- 在以下关键节点输出 `releasedDolls`、`grabbedDolls`、`DollManager.dolls` 全列表：
  - 【按下抓取按钮】`grab()` 开头
  - 【抓到判断】`onCollisionDetected()` 开头
  - 【强弱抓判断前】`judgeStrongGrab()` 开头
  - 【强弱抓判断后】`judgeStrongGrab()` 结尾
  - 【出口顶端松爪判断前】`updateReturning()` 到达出口上方时
  - 【出口顶端松爪判断后】`releaseAllDolls()` 调用前
  - 【娃娃落地】`checkGroundCollision()` 落地时
  - 【得分前】`scoreDollOnLanding()` 开头
  - 【得分后】`finishRemoveDoll()` 结尾
- 在 `judgeStrongGrab()` 函数签名处添加注释：强/弱抓是爪子级别判定，不是每个娃娃单独判定
- 新增独立日志文件下载功能：
  - `utils.js`：新增 `window.debugLog = []` 数组，修改 `log()` 函数同时写入数组
  - `utils.js`：新增 `window.downloadDebugLog()` 函数，将 `debugLog` 数组下载为 `.txt` 文件
  - `main.js`：绑定 `Ctrl+Shift+D` 快捷键，触发日志下载
  - `index.html`：新增隐藏按钮 `#downloadLogBtn`（点击也可触发下载）
- 相关文档：`PRD/抓取流程与状态标记说明.md`（新建）

---

## v3.3.2-build20260608a (2026-06-08)

### 日志清理
- 删除 `physics.js` 中的周期性诊断日志（刷屏问题）
  - `update()` 中的 `[update诊断]` 日志（每60帧输出）
  - `checkCabinetCollision()` 中的 `[诊断]` 日志（每60帧输出）
- 保留 `claw.js` 中的一次性诊断日志（`onCollisionDetected`/`judgeStrongGrab`/`finishRemoveDoll`）
- 后续如需确认娃娃状态，日志只在4个时机输出一次：
  - 【按下抓取时】
  - 【抓取判断时】
  - 【强弱抓判定时】
  - 【娃娃落地时】

---

## v3.3.2-build20260607k (2026-06-07)

### 诊断构建（待用户测试反馈）
- 添加诊断日志，定位"抓到第一个娃娃后，再抓到后面的娃娃时，被抓中的娃娃没有跟随爪子"问题
- 怀疑根因：`grabbedDolls` 列表引用错乱（移除娃娃后对应关系异常）
- 诊断点：
  - `onCollisionDetected()`：记录传入的娃娃 name/id/obj 引用
  - `update()` 抓取娃娃跟随逻辑：每60帧输出 `grabbedDolls` 名单
  - `judgeStrongGrab()`：记录赋值前后的 `grabbedDolls` 名单
  - `finishRemoveDoll()`：记录从 `grabbedDolls` 移除的娃娃 name 和 `gIdx`
- 待用户测试后根据日志确认根因

---

## v3.3.2-build20260607j (2026-06-07)

### 修复
- `updateReturning()` 到达出口上方时逻辑错误
  - 根因：之前错误地在出口上方播放闭合动画（兜底逻辑）
  - 修复：到达出口上方时立即调用 `animateClawOpen()` 张开爪子
- 清理 `returnCloseAnimPlayed` 残留
  - 删除变量定义（第44行）
  - 删除 `resetPendulumState()` 中的重置逻辑

---

## v3.3.2-build20260607i (2026-06-07)

### 修复
- 抓取成功率超高（实际≈100%）
  - 根因：`checkCollision()` 每帧重复掷骰子，同一娃娃在0.5s内被判定约30次
  - 修复：添加 `grabAttempted` 标记，`grab()` 时清除，`checkCollision()` 中跳过已判定娃娃
- 爪子闭合/张开时机错误
  - 根因1：`onCollisionDetected()` 中抓到娃娃立即闭合（应在触底时闭合）
  - 根因2：`judgeStrongGrab()` 中弱抓判定时立即张开（应在回到顶部释放时张开）
  - 根因3：`updateReturning()` 中回到出口上方时重复播放闭合动画
  - 修复：触底时（`onGrabComplete()`）才闭合，回到顶部释放时（`releaseAllDolls()`）才张开

---

### 修复
- 爪子投影红圈（groundMarker）高度异常，悬在空中
- 根因：`claw.js` 中 `GROUND_Y` 兜底值为 `0.5`，而实际地面高度为 `0.0`
- 修复：两处 `(window.CONFIG.GROUND_Y || 0.5)` → `(window.CONFIG.GROUND_Y || 0.0)`

---

### 诊断
- `checkCabinetCollision()` 增加关键参数诊断日志（每60帧输出：位置、速度、radius、边界值）
- `update()` 增加物理更新入口诊断日志（确认每个娃娃的碰撞检测被执行）
- 目的：定位娃娃 X/Z 方向穿墙的根因

---

### 修复
- 修复：删除 checkExitZone() 不限高度检测，解决爪子抓取娃娃时空中误判得分问题
- 出口判定现在只在落地时进行（checkGroundCollision 中检测）
- 版本号统一：physics.js 第4行版本注释更新为 v3.3.2-build20260607f

---

## v3.3.0-build20260605e (2026-06-05)

### 修复
- U9-1：爪指 rotation.y 公式修正为 `-π/2 - angle`，使 rotation.x 旋转时爪指向内合拢（而非同向偏移）
- U9-3：增加 `returnCloseAnimPlayed` 标志位，防止回到出口上方时闭合动画每帧重置导致不可见
- U8-1：updateReturning 中逐渐拉长 `currentRopeLength` 到 `pendulumRopeLength`（返回过程中绳子逐渐伸长）
- U17-2：main.js 初始化顺序调整，`Config.init()` 移至 `Claw.init()` 之前，确保 `pendulumRopeLength` 正确读入
- U6-1：地面红色圆环在 idle/descending/grabbing 时显示（之前版本已修复，本版本确认）

---

## v3.3.0-build20260605d (2026-06-05)

### 修复
- U7 回归 bug：`createDollLabel` 中漏掉 `const canvas = document.createElement('canvas')` 导致 `canvas is not defined`

---

## v3.3.0-build20260605c (2026-06-05)

### 修复
- U6：重建 clawGroundMarker（爪子目标投影标记，红色圆环）
- U7：娃娃标签追加坐标显示（静态，创建时绘制）
- U8：retractRopeMode=zero 时不重置绳长（resetPendulumState 中跳过）

---

## v3.3.0-build20260605b (2026-06-05)

### 修复
- U9-1：爪指朝向圆心（fg.rotation.y = -angle，rotation.x 合拢）
- U9-2：下抓结束统一播放闭合动画（onGrabComplete 调用 animateClawClose）
- U9-3：张开动画改用 rotation.x（animateClawOpen 与闭合动画反向）
- U17-1：applyConfig() 中 idle 状态时实时更新 currentRopeLength
- U17-2：claw.init() 更健壮地读取 pendulumRopeLength 初始值

---

## v3.3.0-build20260605a (2026-06-05)

### 修复
- 强抓/弱抓判定改为爪子级别一次判定（U12/P0）
- 爪子闭合动画旋转轴修正（rotation.y → rotation.x）（U9/P1）
- 强抓提示去掉娃娃名（U15/P1）
- releaseAllDolls 去掉「松开！」前缀（U16/P1）
- 配置面板参数实时生效（input 事件触发 applyConfig，节流200ms）（U17/P1）
- judgeScore 中强制设置 state='resting' 并清零速度（U11/P1）
- 娃娃落地后持续平移修复（onGround 分支 XZ 速度清零）（U19/P1）

---
## v3.3.0-build20260602d (2026-06-02)

### 修复
- 娃娃初始 Y 坐标浮空（groundY + dollSize*0.6 → 正确计算为 groundY + radius）
- 爪子底座厚度调整（0.7→0.21，30%）
- 强抓/弱抓判定改为爪子级别（所有娃娃结果一致）
- 得分 UI 和剩余次数 UI 更新逻辑修复（统一使用 window.gameScore/window.gameAttempts）
- 爪子闭合动画旋转轴修正（rotation.y → rotation.x）
- 娃娃标签增加坐标信息
- 地面高度统一（cabinet.js groundY 与 physics.js groundY 一致）
- 爪子目标投影标记（clawGroundMarker）重建
- retractRopeMode=zero 时回出口过程中绳子恢复默认长度
- 配置面板参数实时生效（input 事件触发 applyConfig）
- 娃娃落地后持续平移问题修复（落地后速度清零）
- 移除不必要的「松开」浮动文字
- 强抓提示文字优化（不显示娃娃名）

---


### 修复
- 完整重建 `claw.js`（文件被截断至217行后恢复，现755行）
- 摆动效果在抓取时消失的问题（`handleInput` 摩擦衰减修复）
- `window.gameCamera` 未设置导致浮动文字不可见
- 弱抓掉落逻辑（`applyParabolicDropWithVelocity` 平抛初速度）

### 新增
- 多娃娃抓取支持（`grabbedDolls` 数组替代单一 `grabbedDoll`）
- 释放→掉落→计分流程（新增 `releasing` 状态等待娃娃落地）
- 浮动文字提示：
  - 抓到娃娃时显示 "抓到【娃娃名】"
  - 强抓/弱抓判定提示（"强抓！" / "没抓住/掉了/抓薄了"）
  - 弱抓掉落时随机提示（"没抓住" / "掉了" / "抓薄了"）
- 娃娃模型移除（计分成功后从场景/DollManager/PhysicsEngine 中删除）

### 技术细节
- `grabbedDolls: []` 数组管理多娃娃
- `weakGrabDolls: []` 数组管理弱抓娃娃
- `releasedDolls: []` 数组管理释放后等待落地的娃娃
- `releaseAllDolls()` 打开爪子，让物理引擎接管
- `checkDollsLanded()` 等待所有娃娃落地
- `judgeScore()` 判断娃娃是否在出口区域内

---

## v3.3.0-build20260530i (2026-05-30)

### 修复
- 抓取命中时显示 "抓到【娃娃名】"（多娃娃时全部展示）
- 强抓/弱抓判定添加对应提示
- 移回出口过程中触发掉落时提示（"没抓住"/"掉了"/"抓薄了"随机出1个）

---

## v3.3.0-build20260530h (2026-05-30)

### 修复
- 在摆动状态下按抓取，摆动效果消失（沿射线方向发射）
- 根因：`handleInput()` 中 `if (window.gameState !== 'idle') return;` 冻结 `clawVelocity`
- 修复：在非 idle 状态下也对 `clawVelocity` 应用摩擦衰减

### 新增
- 非惯性系钟摆公式：\(\ddot{\theta} = -(g/L)\sin\theta - (a/L)\cos\theta - \text{damping} \cdot \dot{\theta}\)

---

## v3.3.0-build20260530g (2026-05-29)

### 修复
- 浮动文字不可见（有日志但无视觉表现）
- 根因1：`this.clawGroup` 未定义，`showFloatText` 提前返回
- 根因2：`window.gameCamera` 未设置
- 修复：`showFloatText` 改用 `this.getSwingWorldPos()`，`main.js` 中添加 `window.gameCamera = camera`

---

## v3.3.0-build20260530f (2026-05-28)

### 新增
- 配置面板添加"恢复默认"按钮
- 配置面板添加"关闭"按钮
- 配置参数按5组分类（爪子移动、甩爪、娃娃掉落、反弹、其他）

---

## v3.3.0-build20260530e (2026-05-27)

### 新增
- `retractRopeMode: 'pendulum' | 'zero'` 配置项
- 爪子上升时绳子回收终点选择（保持摆动绳长 / 完全收回）
- 弱抓时给娃娃平抛初速度

---

## v3.3.0-build20260530d (2026-05-26)

### 修复
- 物理引擎与爪子抓取逻辑分离
- 娃娃掉落后再抓取时物理状态不一致

---

## v3.3.0-build20260530c (2026-05-25)

### 新增
- 自研物理引擎 `physics.js` 替代 Cannon.js
- 娃娃掉落反弹效果
- 地面摩擦力参数

---

## v3.3.0-build20260530b (2026-05-24)

### 新增
- 娃娃3D模型加载（GLTF格式）
- 娃娃随机摆放
- 抓取成功/失败判定

---

## v3.3.0-build20260530a (2026-05-23)

### 新增
- Three.js 基础场景
- 爪子基础移动（WASD/方向键）
- 机箱3D模型
- 抓取按钮交互

---

## v3.2.0 (2026-05-22)

### 新增
- 初始版本
- 基础爪子移动和抓取逻辑
