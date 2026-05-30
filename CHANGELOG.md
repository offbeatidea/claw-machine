# 抓娃娃机版本历史

## v3.3.0-build20260530j (2026-05-30)

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
