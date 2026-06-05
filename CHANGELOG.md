# 抓娃娃机版本历史

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
