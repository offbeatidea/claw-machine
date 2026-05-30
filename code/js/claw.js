// claw.js - 爪子系统（3D钟摆物理 + 多抓模式 + 释放→掉落→判分流程）
// 版本: v3.3.0-build20260530j
// 依赖: THREE, window.CONFIG, window.currentConfig, window.PhysicsEngine, window.DollManager
//
// 游戏状态机:
//   idle → descending → grabbing → ascending → ascend_done → returning → releasing → scoring → idle
//
// v330j: 完整重建（前版文件因脚本替换事故被截断）
//   - 多娃娃抓取: grabbedDolls 数组，支持同时抓多个
//   - 强抓/弱抓: 逐个判定，浮动文字提示
//   - 弱抓掉落: weakGrabDolls 数组，物理引擎接管
//   - 释放流程: 松开爪子→自由掉落→等待落地→判定得分+删除模型
//   - 浮动文字: 抓到、强/弱抓、掉落、得分

window.Claw = {
    // ==================== 3D 组件 ====================
    base: null,        // 底座 Mesh（沿轨道移动）
    swing: null,       // 摆动 Group（含爪指）
    rope: null,        // 绳子 Mesh
    fingers: [],       // 爪指数组（3个 Group）

    // ==================== 钟摆物理状态 ====================
    currentRopeLength: 0.2,
    pendulumAngleX: 0,
    pendulumAngleZ: 0,
    pendulumVelX: 0,
    pendulumVelZ: 0,
    lastBaseVelX: 0,
    lastBaseVelZ: 0,

    // ==================== 抓取状态 ====================
    grabbedDolls: [],       // 已抓到的娃娃数组
    weakGrabDolls: [],     // 弱抓娃娃数组（待掉落）
    releasedDolls: [],     // 释放到出口的娃娃数组（待判分）
    dropTaunts: ['没抓住', '掉了', '抓薄了'],

    // ==================== 初始化 ====================
    init() {
        const config = window.currentConfig || {};
        const f = (config.clawSizeFactor || 100) / 100; // size factor

        // --- 底座（沿轨道移动的电机壳体）---
        const baseGeo = new THREE.CylinderGeometry(0.15 * f, 0.15 * f, 0.3 * f, 16);
        const baseMat = new THREE.MeshPhongMaterial({ color: 0x666666, shininess: 80 });
        this.base = new THREE.Mesh(baseGeo, baseMat);
        this.base.castShadow = true;

        // 初始位置：exit 或 center
        const initPos = config.clawInitialPos || 'exit';
        const exitX = window.CONFIG.CABINET_WIDTH / 2 - 0.5;
        const exitZ = window.CONFIG.CABINET_DEPTH / 2 - 0.5;
        if (initPos === 'center') {
            this.base.position.set(0, window.CONFIG.CABINET_HEIGHT, 0);
        } else {
            this.base.position.set(exitX, window.CONFIG.CABINET_HEIGHT, exitZ);
        }
        window.scene.add(this.base);

        // --- 绳子（连接底座和爪子）---
        const ropeGeo = new THREE.CylinderGeometry(0.015, 0.015, 1, 6);
        const ropeMat = new THREE.MeshPhongMaterial({ color: 0x444444 });
        this.rope = new THREE.Mesh(ropeGeo, ropeMat);
        window.scene.add(this.rope);

        // --- 摆动组（钟摆臂 + 爪指）---
        this.swing = new THREE.Group();
        window.scene.add(this.swing);

        // 中心柱
        const rodGeo = new THREE.CylinderGeometry(0.02 * f, 0.02 * f, 0.15 * f, 8);
        const rodMat = new THREE.MeshPhongMaterial({ color: 0x888888 });
        const rod = new THREE.Mesh(rodGeo, rodMat);
        rod.position.y = -0.075 * f;
        rod.castShadow = true;
        this.swing.add(rod);

        // 3 个爪指（Group，支持旋转开合）
        this.fingers = [];
        const fingerR = 0.06 * f;
        for (let i = 0; i < 3; i++) {
            const angle = (i / 3) * Math.PI * 2;
            const fg = new THREE.Group();
            fg.position.set(Math.cos(angle) * fingerR, 0, Math.sin(angle) * fingerR);

            const fGeo = new THREE.BoxGeometry(0.035 * f, 0.18 * f, 0.025 * f);
            const fMat = new THREE.MeshPhongMaterial({ color: 0xbbbbbb });
            const fMesh = new THREE.Mesh(fGeo, fMat);
            fMesh.position.y = -0.12 * f;
            fMesh.castShadow = true;
            fg.add(fMesh);

            this.swing.add(fg);
            this.fingers.push(fg);
        }

        // 初始绳长
        this.currentRopeLength = config.pendulumRopeLength || 0.2;
        this.updateSwingPosition();

        window.log('[Claw] 初始化完成（位置: ' + initPos + ', 绳长: ' + this.currentRopeLength.toFixed(2) + '）');
    },

    // ==================== 主更新函数（状态机）====================
    update(deltaTime) {
        if (!this.base || !this.swing) return;

        const config = window.currentConfig || {};
        const dt = Math.min(deltaTime, 0.033);

        // 1. 钟摆物理
        this.updatePendulum(dt);

        // 2. 更新摆动组位置
        this.updateSwingPosition();

        // 3. 更新绳子视觉
        this.updateRope();

        // 4. 已抓娃娃跟随爪子
        if (this.grabbedDolls.length > 0) {
            const swingWorldPos = this.getSwingWorldPos();
            for (const doll of this.grabbedDolls) {
                const offset = doll.userData.grabOffset;
                if (!offset) continue;
                doll.position.x = swingWorldPos.x + offset.x;
                doll.position.y = swingWorldPos.y + offset.y;
                doll.position.z = swingWorldPos.z + offset.z;

                // 同步物理对象位置
                const physObj = window.PhysicsEngine && window.PhysicsEngine.getDollPhysics
                    ? window.PhysicsEngine.getDollPhysics(doll.userData.id) : null;
                if (physObj) {
                    physObj.position.copy(doll.position);
                    physObj.state = 'grabbed';
                }
            }
        }

        // 5. 状态分支
        const state = window.gameState;
        if (state === 'descending') {
            this.updateDescending(dt, config);
        } else if (state === 'grabbing') {
            this.updateGrabbing(dt, config);
        } else if (state === 'ascending') {
            this.updateAscending(dt, config);
        } else if (state === 'returning') {
            this.updateReturning(dt, config);
        } else if (state === 'releasing') {
            this.checkDollsLanded();
        }
        // 'idle' / 'ascend_done' / 'scoring' 状态不在这里处理
    },

    // ==================== 钟摆物理更新 ====================
    updatePendulum(dt) {
        const config = window.currentConfig || {};
        const gravity = Math.abs(config.pendulumGravity || 10.0);
        const damping = (config.pendulumDamping || 1.0) / 10.0;
        const L = Math.max(this.currentRopeLength, 0.01);

        // 计算底座加速度
        const vel = window.clawVelocity || { x: 0, z: 0 };
        const safeDt = Math.max(dt, 0.001);
        const accelX = (vel.x - this.lastBaseVelX) / safeDt;
        const accelZ = (vel.z - this.lastBaseVelZ) / safeDt;
        this.lastBaseVelX = vel.x;
        this.lastBaseVelZ = vel.z;

        // 非惯性系钟摆方程：θ̈ = -(g/L)*sin(θ) - (a/L)*cos(θ) - damping*θ̇
        const angAccelX = -(gravity / L) * Math.sin(this.pendulumAngleX)
                          - (accelX / L) * Math.cos(this.pendulumAngleX)
                          - damping * this.pendulumVelX;
        const angAccelZ = -(gravity / L) * Math.sin(this.pendulumAngleZ)
                          - (accelZ / L) * Math.cos(this.pendulumAngleZ)
                          - damping * this.pendulumVelZ;

        this.pendulumVelX += angAccelX * dt;
        this.pendulumVelZ += angAccelZ * dt;
        this.pendulumAngleX += this.pendulumVelX * dt;
        this.pendulumAngleZ += this.pendulumVelZ * dt;

        // 限制摆角（±60度）
        const maxAngle = Math.PI / 3;
        this.pendulumAngleX = Math.max(-maxAngle, Math.min(maxAngle, this.pendulumAngleX));
        this.pendulumAngleZ = Math.max(-maxAngle, Math.min(maxAngle, this.pendulumAngleZ));
    },

    // ==================== 摆动组位置更新 ====================
    updateSwingPosition() {
        if (!this.base || !this.swing) return;
        const basePos = this.base.position;
        const L = Math.max(this.currentRopeLength, 0.01);

        const offsetX = Math.sin(this.pendulumAngleX) * L;
        const offsetZ = Math.sin(this.pendulumAngleZ) * L;
        const offsetY = -L * Math.cos(this.pendulumAngleX) * Math.cos(this.pendulumAngleZ);

        this.swing.position.set(
            basePos.x + offsetX,
            basePos.y + offsetY,
            basePos.z + offsetZ
        );
    },

    // ==================== 绳子视觉更新 ====================
    updateRope() {
        if (!this.base || !this.rope || !this.swing) return;

        const bp = this.base.position;
        const sp = this.swing.position;

        // 中点位置
        this.rope.position.set(
            (bp.x + sp.x) / 2,
            (bp.y + sp.y) / 2,
            (bp.z + sp.z) / 2
        );

        // 长度缩放
        const dx = sp.x - bp.x;
        const dy = sp.y - bp.y;
        const dz = sp.z - bp.z;
        const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
        this.rope.scale.y = Math.max(len, 0.01);

        // 方向对齐
        if (len > 0.001) {
            const dir = new THREE.Vector3(dx, dy, dz).normalize();
            this.rope.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
        }
    },

    // ==================== 获取爪子世界坐标 ====================
    getSwingWorldPos() {
        if (!this.swing) return null;
        const pos = new THREE.Vector3();
        this.swing.getWorldPosition(pos);
        return pos;
    },

    // ==================== 获取爪子合速度 ====================
    getSwingVelocity() {
        const vel = window.clawVelocity || { x: 0, z: 0 };
        const L = this.currentRopeLength;
        return new THREE.Vector3(
            vel.x + this.pendulumVelX * L,
            0,
            vel.z + this.pendulumVelZ * L
        );
    },

    // ==================== 抓取入口 ====================
    grab() {
        if (window.gameState !== 'idle') return;
        this.startDescend();
    },

    startDescend() {
        this.grabTimer = 0;
        const config = window.currentConfig || {};
        this.targetRopeLength = config.ropeLength || 1.5;
        window.gameState = 'descending';
        window.log('[Claw] 开始下降（最大深度: ' + this.targetRopeLength.toFixed(2) + '）');
    },

    // ==================== 下降逻辑 ====================
    updateDescending(dt, config) {
        const speed = config.descendSpeed || 0.5;
        this.currentRopeLength += speed * dt;

        if (this.currentRopeLength >= this.targetRopeLength) {
            this.currentRopeLength = this.targetRopeLength;
            window.gameState = 'grabbing';
            window.log('[Claw] 下降完成，开始抓取检测');
        }
    },

    // ==================== 抓取检测（计时+碰撞）====================
    updateGrabbing(dt, config) {
        this.grabTimer += dt;
        this.checkCollision();

        if (this.grabTimer >= 0.5) {
            this.onGrabComplete();
        }
    },

    // ==================== 碰撞检测 ====================
    checkCollision() {
        if (!window.DollManager || !window.DollManager.dolls) return;
        const swingPos = this.getSwingWorldPos();
        if (!swingPos) return;

        const radius = window.CONFIG.CLAW_COLLISION_RADIUS || 0.6;

        for (const doll of window.DollManager.dolls) {
            if (!doll || !doll.userData) continue;
            if (doll.userData.isGrabbed) continue; // 已抓到，跳过

            const dx = doll.position.x - swingPos.x;
            const dy = doll.position.y - swingPos.y;
            const dz = doll.position.z - swingPos.z;
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

            if (dist < radius) {
                this.onCollisionDetected(doll);
            }
        }
    },

    // ==================== 碰撞命中处理 ====================
    onCollisionDetected(doll) {
        const config = window.currentConfig || {};
        const successRate = (config.grabSuccessRate || 50) / 100;

        if (Math.random() < successRate) {
            // 抓取成功
            this.grabbedDolls.push(doll);
            doll.userData.isGrabbed = true;

            // 记录娃娃相对爪子的偏移量
            const swingPos = this.getSwingWorldPos();
            doll.userData.grabOffset = {
                x: doll.position.x - swingPos.x,
                y: doll.position.y - swingPos.y,
                z: doll.position.z - swingPos.z
            };

            // 同步物理引擎
            if (window.PhysicsEngine) {
                const physObj = window.PhysicsEngine.getDollPhysics(doll.userData.id);
                if (physObj) {
                    physObj.state = 'grabbed';
                    physObj.velocity.set(0, 0, 0);
                }
            }

            window.log('[Claw] 抓取成功：娃娃"' + doll.userData.name + '"（已抓' + this.grabbedDolls.length + '个）');
            this.showFloatText('抓到【' + doll.userData.name + '】');
            this.animateClawClose();
        } else {
            // 抓取失败
            window.log('[Claw] 抓取失败：娃娃"' + doll.userData.name + '"');
            this.animateGrabFail(doll);
        }
    },

    // ==================== 抓取完成 → 上升 ====================
    onGrabComplete() {
        const names = this.grabbedDolls.map(d => d.userData.name).join('、') || '无';
        window.log('[Claw] 抓取完成，开始上升。抓到: ' + names + '（共' + this.grabbedDolls.length + '个）');
        window.gameState = 'ascending';
    },

    // ==================== 上升逻辑 ====================
    updateAscending(dt, config) {
        const speed = config.ascendSpeed || 0.5;
        const retractMode = config.retractRopeMode || 'pendulum';
        const pendulumRope = config.pendulumRopeLength || 0.2;
        const target = (retractMode === 'pendulum') ? pendulumRope : 0;

        this.currentRopeLength -= speed * dt;

        if (this.currentRopeLength <= target) {
            this.currentRopeLength = Math.max(target, 0.01);
            window.log('[Claw] 上升到顶，开始判定强抓/弱抓');
            this.judgeStrongGrab();
        }
    },

    // ==================== 强抓/弱抓判定（上升到顶后调用）====================
    // 多娃娃模式：逐个判定每个娃娃的强抓/弱抓
    judgeStrongGrab() {
        const config = window.currentConfig || {};
        const strongGrabRate = (config.strongGrabRate || 20) / 100;
        const retractMode = config.retractRopeMode || 'pendulum';

        if (this.grabbedDolls.length === 0) {
            window.log('[Claw] 未抓到娃娃，爪子继续回到出口');
            window.gameState = 'returning';
            window.log('[Claw] 判定完毕，状态 -> returning');
            return;
        }

        // 逐个判断每个娃娃
        const weakDolls = [];
        const strongDolls = [];
        for (const doll of this.grabbedDolls) {
            if (Math.random() < strongGrabRate) {
                strongDolls.push(doll);
                window.log('[Claw] 强抓！娃娃"' + doll.userData.name + '"');
            } else {
                weakDolls.push(doll);
                window.log('[Claw] 弱抓：娃娃"' + doll.userData.name + '" 掉落');
            }
        }

        // 浮动文字提示
        if (strongDolls.length > 0) {
            this.showFloatText('强抓！' + strongDolls.map(d => d.userData.name).join('、'));
        }
        if (weakDolls.length > 0) {
            const taunt = this.dropTaunts[Math.floor(Math.random() * this.dropTaunts.length)];
            this.showFloatText(taunt + '！' + weakDolls.map(d => d.userData.name).join('、'));
        }

        // 处理弱抓娃娃掉落
        this.weakGrabDolls = weakDolls;
        if (weakDolls.length > 0) {
            if (retractMode === 'zero') {
                this.applyParabolicDropRandom();
            } else {
                this.applyParabolicDropWithVelocity();
            }
            this.animateClawOpen();
        }

        // 只保留强抓娃娃
        this.grabbedDolls = strongDolls;

        // 爪子回到出口
        window.gameState = 'returning';
        window.log('[Claw] 判定完毕（强' + strongDolls.length + '弱' + weakDolls.length + '），状态 -> returning');
    },

    // ==================== 弱抓掉落（沿用爪子当前速度）====================
    applyParabolicDropWithVelocity() {
        if (!this.weakGrabDolls || this.weakGrabDolls.length === 0) return;

        const clawWorldVel = this.getSwingVelocity();

        for (const doll of this.weakGrabDolls) {
            if (window.PhysicsEngine) {
                const physicsObj = window.PhysicsEngine.getDollPhysics(doll.userData.id);
                if (physicsObj) {
                    window.PhysicsEngine.applyParabolicDrop(physicsObj, clawWorldVel);
                }
            }
            window.log('[Claw] 弱抓掉落 "' + doll.userData.name + '"，初速度:('
                + clawWorldVel.x.toFixed(2) + ', ' + clawWorldVel.y.toFixed(2) + ', ' + clawWorldVel.z.toFixed(2) + ')');
            doll.userData.isGrabbed = false;
        }

        this.weakGrabDolls = [];
    },

    // ==================== 弱抓掉落（模式0：随机后方方向）====================
    applyParabolicDropRandom() {
        if (!this.weakGrabDolls || this.weakGrabDolls.length === 0) return;

        for (const doll of this.weakGrabDolls) {
            // 后方基准角：+Z 方向 = 90度
            const baseAngle = Math.PI / 2;
            const spread = Math.PI / 3;  // 60度
            const randomOffset = (Math.random() - 0.5) * 2 * spread;
            const angle = baseAngle + randomOffset;
            const speed = 0.5 + Math.random() * 1.0;

            const vel = new THREE.Vector3(
                Math.cos(angle) * speed,
                0,
                Math.sin(angle) * speed
            );

            window.log('[Claw] 弱抓掉落（模式0）："' + doll.userData.name
                + '"，方向=' + (angle * 180 / Math.PI).toFixed(1) + '度，速度=' + speed.toFixed(2));

            if (window.PhysicsEngine) {
                const physicsObj = window.PhysicsEngine.getDollPhysics(doll.userData.id);
                if (physicsObj) {
                    window.PhysicsEngine.applyParabolicDrop(physicsObj, vel);
                }
            }
            doll.userData.isGrabbed = false;
        }

        this.weakGrabDolls = [];
    },

    // ==================== 返回出口逻辑 ====================
    updateReturning(dt, config) {
        const exitX = window.CONFIG.CABINET_WIDTH / 2 - 0.5;
        const exitZ = window.CONFIG.CABINET_DEPTH / 2 - 0.5;
        const returnSpeed = 2.0;

        const dx = exitX - this.base.position.x;
        const dz = exitZ - this.base.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        if (dist < 0.1) {
            // 到达出口
            this.base.position.x = exitX;
            this.base.position.z = exitZ;
            window.log('[Claw] 已到达出口上方');

            if (this.grabbedDolls.length > 0) {
                this.releaseAllDolls();
            } else {
                // 没有娃娃，直接进入得分判定（会显示"未抓到"）
                window.gameState = 'scoring';
                this.judgeScore();
            }
        } else {
            // 向出口移动
            this.base.position.x += (dx / dist) * returnSpeed * dt;
            this.base.position.z += (dz / dist) * returnSpeed * dt;
        }
    },

    // ==================== 检查释放的娃娃是否全部落地 ====================
    checkDollsLanded() {
        if (!this.releasedDolls || this.releasedDolls.length === 0) {
            window.gameState = 'scoring';
            this.judgeScore();
            return;
        }

        let allLanded = true;
        for (const doll of this.releasedDolls) {
            if (!doll || !doll.userData) continue;
            const physObj = window.PhysicsEngine && window.PhysicsEngine.getDollPhysics
                ? window.PhysicsEngine.getDollPhysics(doll.userData.id) : null;
            if (physObj) {
                if (physObj.state !== 'resting' || !physObj.onGround) {
                    allLanded = false;
                    break;
                }
            }
        }

        if (allLanded) {
            window.log('[Claw] 所有娃娃已落地静止，进入得分判定');
            window.gameState = 'scoring';
            this.judgeScore();
        }
    },

    // ==================== 释放所有娃娃（松开爪子→自由掉落）====================
    releaseAllDolls() {
        if (this.grabbedDolls.length === 0) return;

        // 松开爪子（视觉）
        this.animateClawOpen();

        // 逐个释放娃娃：解除抓取标记，让物理引擎接管
        for (const doll of this.grabbedDolls) {
            doll.userData.isGrabbed = false;

            const dollWorldPos = new THREE.Vector3();
            doll.getWorldPosition(dollWorldPos);

            // 微小随机水平速度，让掉落更自然
            const vx = (Math.random() - 0.5) * 0.3;
            const vz = (Math.random() - 0.5) * 0.3;

            if (window.PhysicsEngine) {
                const physObj = window.PhysicsEngine.getDollPhysics(doll.userData.id);
                if (physObj) {
                    physObj.position.copy(dollWorldPos);
                    physObj.velocity.set(vx, 0, vz);
                    physObj.state = 'falling';
                    physObj.onGround = false;
                    physObj.bounceCount = 0;
                    physObj.rotationSpeed.set(
                        (Math.random() - 0.5) * 2,
                        (Math.random() - 0.5) * 2,
                        (Math.random() - 0.5) * 2
                    );
                }
            }

            window.log('[Claw] 松开爪子，"' + doll.userData.name + '" 自由掉落（y=' + dollWorldPos.y.toFixed(2) + '）');
        }

        // 保存释放的娃娃列表，供后续得分判定
        this.releasedDolls = this.grabbedDolls.slice();
        this.grabbedDolls = [];

        // 浮动文字
        const names = this.releasedDolls.map(d => d.userData.name).join('、');
        this.showFloatText('松开！' + names + ' 掉落中...');

        // 进入 releasing 状态，等待娃娃落地
        window.gameState = 'releasing';
        window.log('[Claw] 进入 releasing 状态（等待娃娃落地）');
    },

    // ==================== 得分判定 ====================
    judgeScore() {
        if (window.gameState !== 'scoring') return;

        // 只统计本轮释放的娃娃中在出口区域的
        let successCount = 0;
        const exitX = window.CONFIG.CABINET_WIDTH / 2 - 0.5;
        const exitZ = window.CONFIG.CABINET_DEPTH / 2 - 0.5;
        const exitRadius = 1.0;

        if (this.releasedDolls && this.releasedDolls.length > 0) {
            for (const doll of this.releasedDolls) {
                if (!doll || !doll.userData) continue;
                const dx = doll.position.x - exitX;
                const dz = doll.position.z - exitZ;
                const dist = Math.sqrt(dx * dx + dz * dz);

                if (dist < exitRadius) {
                    successCount++;
                    window.log('[Claw] "' + doll.userData.name + '" 在出口区域，得分！（距离: ' + dist.toFixed(2) + '）');

                    // 从场景中删除娃娃模型
                    if (doll.parent) doll.parent.remove(doll);

                    // 从 DollManager 中移除
                    if (window.DollManager && window.DollManager.dolls) {
                        const idx = window.DollManager.dolls.indexOf(doll);
                        if (idx !== -1) window.DollManager.dolls.splice(idx, 1);
                    }

                    // 从物理引擎中移除
                    if (window.PhysicsEngine && window.PhysicsEngine.dolls) {
                        const physObj = window.PhysicsEngine.getDollPhysics(doll.userData.id);
                        if (physObj) {
                            const pidx = window.PhysicsEngine.dolls.indexOf(physObj);
                            if (pidx !== -1) window.PhysicsEngine.dolls.splice(pidx, 1);
                        }
                    }
                } else {
                    window.log('[Claw] "' + doll.userData.name + '" 不在出口区域（距离: ' + dist.toFixed(2) + '）');
                }
            }
        }

        // 更新分数
        if (successCount > 0) {
            if (typeof window.score !== 'undefined') {
                window.score += successCount;
            }
            window.log('[Claw] 得分！+' + successCount + '，总分: ' + window.score);
            this.showFloatText('得分 +' + successCount + '！');
        } else {
            window.log('[Claw] 未成功抓到娃娃');
            this.showFloatText('未抓到...');
        }

        // 更新次数
        if (typeof window.attempts !== 'undefined') {
            window.attempts++;
        }

        // 清理 releasedDolls
        this.releasedDolls = [];

        // 回到 idle，解锁输入
        this.resetPendulumState();
        window.gameState = 'idle';
        window.log('[Claw] 得分判定完毕，状态 -> idle（解锁输入）');
    },

    // ==================== 显示浮动文字 ====================
    showFloatText(text) {
        window.log('[Claw] 浮动文字: ' + text);

        const clawWorldPos = this.getSwingWorldPos();
        if (!clawWorldPos) return;

        const camera = window.gameCamera;
        if (!camera) return;

        const vec = clawWorldPos.clone().project(camera);
        const x = (vec.x * 0.5 + 0.5) * window.innerWidth;
        const y = (-vec.y * 0.5 + 0.5) * window.innerHeight;

        const div = document.createElement('div');
        div.textContent = text;
        div.style.cssText =
            'position:fixed;' +
            'left:' + x + 'px;' +
            'top:' + y + 'px;' +
            'transform:translate(-50%,-50%);' +
            'color:' + (text.includes('+') ? '#0f0' : '#fff') + ';' +
            'font-size:28px;font-weight:bold;' +
            'text-shadow:0 0 10px rgba(0,0,0,0.8);' +
            'pointer-events:none;z-index:9999;' +
            'transition:all 1.5s ease-out;opacity:1;';
        document.body.appendChild(div);

        // 向上浮动并淡出
        requestAnimationFrame(function() {
            div.style.top = (y - 80) + 'px';
            div.style.opacity = '0';
        });
        setTimeout(function() { div.remove(); }, 2000);
    },

    // ==================== 爪子动画 ====================
    animateClawOpen() {
        window.log('[Claw] 爪子张开');
        this.fingers.forEach(function(f) { f.rotation.y = 0; });
    },

    animateClawClose() {
        window.log('[Claw] 爪子闭合');
        this.fingers.forEach(function(f) { f.rotation.y = 0.3; });
    },

    animateGrabFail(doll) {
        window.log('[Claw] 抓取失败："' + doll.userData.name + '"');
        if (window.PhysicsEngine) {
            const physObj = window.PhysicsEngine.getDollPhysics(doll.userData.id);
            if (physObj) {
                window.PhysicsEngine.applyGrabFailBounce(physObj);
            }
        }
    },

    // ==================== 获取爪子速度（兼容旧接口）====================
    getVelocity() {
        return new THREE.Vector3(
            window.clawVelocity ? window.clawVelocity.x : 0,
            0,
            window.clawVelocity ? window.clawVelocity.z : 0
        );
    },

    // ==================== 重置钟摆物理状态（确保每轮首尾一致）====================
    resetPendulumState() {
        const config = window.currentConfig || {};
        const fullRope = config.pendulumRopeLength || 0.2;
        this.currentRopeLength = fullRope;
        this.pendulumAngleX = 0;
        this.pendulumAngleZ = 0;
        this.pendulumVelX = 0;
        this.pendulumVelZ = 0;
        this.lastBaseVelX = 0;
        this.lastBaseVelZ = 0;

        // 清理所有抓取状态
        for (var i = 0; i < this.grabbedDolls.length; i++) {
            if (this.grabbedDolls[i]) this.grabbedDolls[i].userData.isGrabbed = false;
        }
        this.grabbedDolls = [];
        this.weakGrabDolls = [];
        this.releasedDolls = [];

        if (this.swing) {
            this.swing.rotation.set(0, 0, 0);
            this.swing.quaternion.set(0, 0, 0, 1);
        }

        window.log('[Claw] 钟摆状态已重置: ropeLen=' + fullRope.toFixed(2));
    }
};

window.log('claw.js v3.3.0-build20260530j 加载完成（三维钟摆物理 + 多抓 + 释放掉落判分 + 浮动文字）');
