// debug-visual.js - 调试可视化模块
// 功能: 出口范围可视化、地面可视化、娃娃碰撞范围、娃娃移动轨迹
// 版本: v3.3.2-build20260607a

// 本次更新：
// 1. groundY 默认值改为从 CONFIG.GROUND_Y 读取（支持0.0）
// 2. 统一地面Y值
//
// 使用方式:
//   window.toggleDebugVisuals()  - 切换显示/隐藏
//   window.clearDollTrajectories() - 清理所有轨迹点
//   window.debugVisualsVisible      - 当前是否显示

(function() {
    'use strict';

    // ==================== 配置 ====================
    const EXIT_COLOR = 0x00ff88;      // 出口范围颜色（绿色）
    const EXIT_OPACITY = 0.35;      // 出口范围透明度
    const GROUND_COLOR = 0x4488ff;   // 地面颜色（蓝色）
    const GROUND_OPACITY = 0.2;     // 地面透明度
    const DOLL_HITBOX_COLOR = 0xff8800; // 娃娃碰撞范围颜色（橙色）
    const TRAIL_SPHERE_RADIUS = 0.08;  // 轨迹点球体半径
    const TRAIL_MAX_POINTS = 100;       // 最多保留轨迹点数
    const TRAIL_FRAME_INTERVAL = 10;     // 每N帧记录一次

    // ==================== 状态 ====================
    let visualsCreated = false;
    let visualsVisible = false;

    // 可视化对象
    let exitVisual = null;       // 出口范围（圆形平面）
    let groundVisual = null;     // 地面（半透明平面）
    let dollHitboxVisuals = []; // 娃娃碰撞范围（SphereHelper数组）
    let trailPoints = [];        // 所有娃娃的轨迹点数组（每个元素是一个数组）

    // 帧计数器（用于轨迹记录）
    let frameCount = 0;

    // ==================== 创建调试可视化 ====================
    function createDebugVisuals() {
        if (visualsCreated) return;
        const scene = window.scene;
        if (!scene) {
            console.warn('[DebugVisual] scene not ready');
            return;
        }
        const CONFIG = window.CONFIG || {};
        const exitX = (CONFIG.CABINET_WIDTH || 3.2) / 2 - 0.5;
        const exitZ = (CONFIG.CABINET_DEPTH || 3.2) / 2 - 0.5;
        const groundY = (CONFIG.GROUND_Y != null) ? CONFIG.GROUND_Y : 0.0;
        const exitRadius = (window.currentConfig && window.currentConfig.exitRadius !== undefined)
            ? window.currentConfig.exitRadius : 1.0;

        // 1. 出口范围可视化（圆形平面）
        const exitGeo = new THREE.CircleGeometry(exitRadius, 32);
        const exitMat = new THREE.MeshBasicMaterial({
            color: EXIT_COLOR,
            transparent: true,
            opacity: EXIT_OPACITY,
            side: THREE.DoubleSide,
            depthWrite: false
        });
        exitVisual = new THREE.Mesh(exitGeo, exitMat);
        exitVisual.rotation.x = -Math.PI / 2; // 平铺在地面上
        exitVisual.position.set(exitX, groundY + 0.01, exitZ);
        exitVisual.visible = false;
        scene.add(exitVisual);

        // 2. 地面可视化（半透明平面，覆盖整个机箱地面）
        const groundSize = Math.max(CONFIG.CABINET_WIDTH || 3.2, CONFIG.CABINET_DEPTH || 3.2);
        const groundGeo = new THREE.PlaneGeometry(groundSize, groundSize);
        const groundMat = new THREE.MeshBasicMaterial({
            color: GROUND_COLOR,
            transparent: true,
            opacity: GROUND_OPACITY,
            side: THREE.DoubleSide,
            depthWrite: false
        });
        groundVisual = new THREE.Mesh(groundGeo, groundMat);
        groundVisual.rotation.x = -Math.PI / 2;
        groundVisual.position.set(0, groundY + 0.005, 0);
        groundVisual.visible = false;
        scene.add(groundVisual);

        // 3. 娃娃碰撞范围可视化（为每个已有娃娃创建 SphereHelper）
        updateDollHitboxVisuals();

        visualsCreated = true;
        console.log('[DebugVisual] 调试可视化已创建');
    }

    // ==================== 更新娃娃碰撞范围可视化 ====================
    function updateDollHitboxVisuals() {
        const scene = window.scene;
        if (!scene) return;

        // 移除旧的
        for (const h of dollHitboxVisuals) {
            if (h.parent) h.parent.remove(h);
            if (h.geometry) h.geometry.dispose();
            if (h.material) h.material.dispose();
        }
        dollHitboxVisuals = [];

        const dolls = (window.DollManager && window.DollManager.dolls) || [];
        const dollRadius = ((window.currentConfig && window.currentConfig.dollRadius) || 0.3);

        for (const doll of dolls) {
            if (!doll || !doll.userData) continue;
            // 使用 SphereGeometry + wireframe 模式
            const sphereGeo = new THREE.SphereGeometry(dollRadius, 12, 8);
            const sphereMat = new THREE.MeshBasicMaterial({
                color: DOLL_HITBOX_COLOR,
                wireframe: true,
                transparent: true,
                opacity: 0.6,
                depthWrite: false
            });
            const sphere = new THREE.Mesh(sphereGeo, sphereMat);
            sphere.visible = visualsVisible;
            doll.add(sphere);
            dollHitboxVisuals.push(sphere);
        }

        console.log('[DebugVisual] 娃娃碰撞范围可视化已更新，数量:', dollHitboxVisuals.length);
    }

    // ==================== 切换显示/隐藏 ====================
    function toggleDebugVisuals() {
        if (!visualsCreated) createDebugVisuals();

        visualsVisible = !visualsVisible;

        // 出口
        if (exitVisual) exitVisual.visible = visualsVisible;
        // 地面
        if (groundVisual) groundVisual.visible = visualsVisible;
        // 娃娃碰撞范围
        for (const h of dollHitboxVisuals) {
            if (h) h.visible = visualsVisible;
        }

        // 更新按钮状态
        const btn = document.getElementById('toggleDebugVisBtn');
        if (btn) {
            btn.classList.toggle('active', visualsVisible);
            btn.textContent = visualsVisible ? '🐛 调试可视化 ✓' : '🐛 调试可视化';
        }

        console.log('[DebugVisual] 调试可视化', visualsVisible ? '显示' : '隐藏');
    }

    // ==================== 记录轨迹点 ====================
    function recordTrailPoints() {
        frameCount++;
        if (frameCount % TRAIL_FRAME_INTERVAL !== 0) return;

        const dolls = (window.DollManager && window.DollManager.dolls) || [];
        const physicsEngine = window.PhysicsEngine;
        if (!physicsEngine) return;

        // 初始化轨迹数组（如果还没初始化）
        while (trailPoints.length < dolls.length) {
            trailPoints.push([]);
        }

        for (let i = 0; i < dolls.length; i++) {
            const doll = dolls[i];
            if (!doll || !doll.userData) continue;

            const physObj = physicsEngine.getDollPhysics(doll.userData.id);
            if (!physObj) continue;

            // 娃娃停留后（state === 'resting'），不再记录
            if (physObj.state === 'resting' || physObj.onGround) continue;

            // 记录当前位置
            const pos = doll.position.clone();
            const pointData = {
                position: pos,
                frame: frameCount,
                dollIndex: i
            };

            trailPoints[i].push(pointData);

            // 保留最近 TRAIL_MAX_POINTS 个
            if (trailPoints[i].length > TRAIL_MAX_POINTS) {
                const removed = trailPoints[i].shift(); // 移除最旧的
                // 移除对应的 Three.js 对象（如果有）
                // 注意：这里我们只管理数据，渲染对象在 updateTrailVisuals() 中管理
            }
        }

        updateTrailVisuals();
    }

    // ==================== 更新轨迹可视化 ====================
    function updateTrailVisuals() {
        const scene = window.scene;
        if (!scene) return;

        // 移除所有旧的轨迹点对象
        const oldPoints = scene.children.filter(c => c.userData && c.userData.isTrailPoint);
        for (const p of oldPoints) {
            scene.remove(p);
            if (p.geometry) p.geometry.dispose();
            if (p.material) p.material.dispose();
        }

        // 重新创建轨迹点可视化
        for (let i = 0; i < trailPoints.length; i++) {
            const points = trailPoints[i];
            if (!points || points.length === 0) continue;

            const newestFrame = points[points.length - 1].frame;

            for (let j = 0; j < points.length; j++) {
                const pd = points[j];
                const age = newestFrame - pd.frame; // 编号差异
                const alpha = Math.max(0.05, 1.0 - age / TRAIL_MAX_POINTS); // 透明度与编号差异相关

                const sphereGeo = new THREE.SphereGeometry(TRAIL_SPHERE_RADIUS, 6, 4);
                const sphereMat = new THREE.MeshBasicMaterial({
                    color: 0xffffff,
                    transparent: true,
                    opacity: alpha * 0.8,
                    depthWrite: false
                });
                const sphere = new THREE.Mesh(sphereGeo, sphereMat);
                sphere.position.copy(pd.position);
                sphere.userData.isTrailPoint = true;
                sphere.userData.dollIndex = pd.dollIndex;
                scene.add(sphere);
            }
        }
    }

    // ==================== 清理所有轨迹点 ====================
    function clearDollTrajectories() {
        // 清空数据
        trailPoints = [];
        frameCount = 0;

        // 移除场景中的轨迹点对象
        const scene = window.scene;
        if (scene) {
            const oldPoints = scene.children.filter(c => c.userData && c.userData.isTrailPoint);
            for (const p of oldPoints) {
                scene.remove(p);
                if (p.geometry) p.geometry.dispose();
                if (p.material) p.material.dispose();
            }
        }

        console.log('[DebugVisual] 所有轨迹点已清理');
    }

    // ==================== 每帧更新（由 main.js 的 animate() 调用） ====================
    function update() {
        if (!visualsCreated) return;
        if (!visualsVisible) return;

        recordTrailPoints();
    }

    // ==================== 公共接口 ====================
    window.toggleDebugVisuals = toggleDebugVisuals;
    window.clearDollTrajectories = clearDollTrajectories;
    window.debugVisualsVisible = false;
    window.debugVisualsUpdate = update;
    window.debugVisualsCreate = createDebugVisuals;
    window.debugVisualsUpdateDollHitboxes = updateDollHitboxVisuals;

    console.log('[DebugVisual] debug-visual.js 加载完成');
})();
