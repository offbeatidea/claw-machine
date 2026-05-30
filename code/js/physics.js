// physics.js - 自研轻量级物理引擎（不依赖Cannon.js）
// 依赖: window.CONFIG, window.currentConfig
// 功能: 抛物线运动、娃娃碰撞检测、地面/堆叠碰撞、反弹
// 版本: v3.2.1-build20260527-1400 FORCE REFRESH
//
// 本次修复：
// 1. 娃娃落地后 rotationSpeed 清零，防止不停翻转
// 2. 娃娃落地后添加旋转阻尼，旋转逐渐停止
// 3. 修复 checkGroundCollision 中 onGround 重复设置问题

window.PhysicsEngine = {
    gravity: -9.8,           // 重力加速度 (m/s²)
    dolls: [],                // 娃娃物理对象数组
    groundY: 0.5,            // 地面高度
    dollRadius: 0.3,         // 娃娃碰撞半径
    maxBounces: 3,           // 最大反弹次数
    bounceDamping: 0.6,      // 反弹阻尼（0.6 = 保留60%能量）
    friction: 0.9,            // 地面摩擦力
    airResistance: 0.02,      // 空气阻力
    rotationDamping: 0.95,    // 旋转阻尼（每帧保留率，越小停得越快）

    // ==================== 初始化 ====================
    init() {
        this.dolls = [];
        this.gravity = -9.8;
        log(LOG_LEVEL.INFO, 'PhysicsEngine', '自研物理引擎初始化完成（无外部依赖）');
        return true;
    },

    // ==================== 注册娃娃 ====================
    registerDoll(dollMesh, index) {
        const dollRadius = ((window.currentConfig && window.currentConfig.dollRadius) || (this.dollRadius * 100)) / 100;
        const dollHeight = (window.currentConfig && window.currentConfig.dollHeight) || 0.6;

        const physicsObj = {
            index: index,
            mesh: dollMesh,
            position: new THREE.Vector3().copy(dollMesh.position),
            velocity: new THREE.Vector3(0, 0, 0),
            rotationSpeed: new THREE.Vector3(0, 0, 0),
            state: 'resting',      // resting, falling, bouncing, grabbed, settling
            bounceCount: 0,
            mass: 1.0,
            radius: dollRadius,
            height: dollHeight,
            onGround: true,             // 初始时在地面上，不受重力
            collidedWith: []      // 当前碰撞的娃娃索引列表
        };

        this.dolls[index] = physicsObj;
        log(LOG_LEVEL.INFO, 'PhysicsEngine', `娃娃 ${index} 已注册`);
        return physicsObj;
    },

    // ==================== 获取娃娃物理对象 ====================
    getDollPhysics(id) {
        return this.dolls[id] || null;
    },

    // ==================== 抛物线掉落（核心） ====================
    applyParabolicDrop(dollPhysics, initialVelocity) {
        dollPhysics.state = 'falling';
        dollPhysics.bounceCount = 0;
        dollPhysics.onGround = false;

        if (initialVelocity) {
            dollPhysics.velocity.copy(initialVelocity);
        }

        // 给予随机旋转速度（掉落时翻转）
        dollPhysics.rotationSpeed.set(
            (Math.random() - 0.5) * 3,
            (Math.random() - 0.5) * 3,
            (Math.random() - 0.5) * 3
        );

        log(LOG_LEVEL.DEBUG, 'PhysicsEngine', `娃娃 ${dollPhysics.index} 开始抛物线掉落, 初速度: ${dollPhysics.velocity.toArray()}`);
    },

    // ==================== 抓取失败跳动 ====================
    applyGrabFailBounce(dollPhysics) {
        const angle = Math.random() * Math.PI * 2;
        const elevationAngle = 60 * Math.PI / 180;
        const speed = 1.5 + Math.random() * 1.0;

        const vx = Math.cos(angle) * Math.cos(elevationAngle) * speed;
        const vy = Math.sin(elevationAngle) * speed;
        const vz = Math.sin(angle) * Math.cos(elevationAngle) * speed;

        dollPhysics.velocity.set(vx, vy, vz);
        dollPhysics.state = 'falling';
        dollPhysics.bounceCount = 0;
        dollPhysics.onGround = false;

        // 添加随机旋转
        dollPhysics.rotationSpeed.set(
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 2
        );

        log(LOG_LEVEL.INFO, 'PhysicsEngine', `娃娃 ${dollPhysics.index} 抓取失败跳动, 速度:(${vx.toFixed(2)}, ${vy.toFixed(2)}, ${vz.toFixed(2)})`);
    },

    // ==================== 弱抓触发水平抛物线 ====================
    applyWeakGrabDrop(dollPhysics, initialVelocity) {
        dollPhysics.state = 'falling';
        dollPhysics.bounceCount = 0;
        dollPhysics.onGround = false;

        if (initialVelocity) {
            dollPhysics.velocity.set(
                initialVelocity.x * 0.8,
                Math.max(initialVelocity.y, 2.0),
                initialVelocity.z * 0.8
            );
        } else {
            const angle = Math.random() * Math.PI * 2;
            dollPhysics.velocity.set(
                Math.cos(angle) * 2.0,
                3.0,
                Math.sin(angle) * 2.0
            );
        }

        // 弱抓掉落时也给旋转
        dollPhysics.rotationSpeed.set(
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 2
        );

        log(LOG_LEVEL.DEBUG, 'PhysicsEngine', `娃娃 ${dollPhysics.index} 弱抓掉落, 初速度: ${dollPhysics.velocity.toArray()}`);
    },

    // ==================== 应用重力 ====================
    applyGravity(dollPhysics, deltaTime) {
        if (dollPhysics.state === 'resting' || dollPhysics.state === 'grabbed') {
            return;
        }

        dollPhysics.velocity.y += this.gravity * deltaTime;

        // 空气阻力
        const airRes = (window.currentConfig && window.currentConfig.airResistance) || this.airResistance;
        dollPhysics.velocity.x *= (1.0 - airRes * deltaTime);
        dollPhysics.velocity.z *= (1.0 - airRes * deltaTime);
    },

    // ==================== 地面碰撞检测 ====================
    checkGroundCollision(dollPhysics) {
        const groundY = this.groundY;
        const dollBottom = dollPhysics.position.y - dollPhysics.radius;

        // 已在地面上且速度向下或为零 → 直接吸附到地面
        if (dollPhysics.onGround && dollPhysics.velocity.y <= 0) {
            dollPhysics.position.y = groundY + dollPhysics.radius;
            dollPhysics.velocity.y = 0;
            dollPhysics.state = 'resting';
            // 落地后停止旋转
            dollPhysics.rotationSpeed.set(0, 0, 0);
            return true;
        }

        if (dollBottom <= groundY && dollPhysics.velocity.y <= 0) {
            // 落地：将娃娃位置严格吸附到地面上
            dollPhysics.position.y = groundY + dollPhysics.radius;
            dollPhysics.velocity.y = -dollPhysics.velocity.y * this.bounceDamping;

            // XZ平面速度衰减（摩擦力）
            const friction = (window.currentConfig && window.currentConfig.friction) || this.friction;
            dollPhysics.velocity.x *= friction;
            dollPhysics.velocity.z *= friction;

            dollPhysics.bounceCount++;
            dollPhysics.onGround = true;

            // 反弹次数过多或速度过小 → 静止
            const maxBounces = (window.currentConfig && window.currentConfig.maxBounces) || this.maxBounces;
            if (dollPhysics.bounceCount >= maxBounces ||
                Math.abs(dollPhysics.velocity.y) < 0.5 ||
                (Math.abs(dollPhysics.velocity.x) < 0.01 && Math.abs(dollPhysics.velocity.z) < 0.01)) {
                dollPhysics.velocity.x = 0;
                dollPhysics.velocity.y = 0;
                dollPhysics.velocity.z = 0;
                dollPhysics.rotationSpeed.set(0, 0, 0); // 停止旋转
                dollPhysics.state = 'resting';
                dollPhysics.onGround = true;
            }

            log(LOG_LEVEL.WARN, 'PhysicsEngine', `娃娃 ${dollPhysics.index} 地面碰撞, 反弹次数:${dollPhysics.bounceCount}, 速度Y:${dollPhysics.velocity.y.toFixed(2)}`);
            return true;
        }
        return false;
    },

    // ==================== 娃娃-娃娃碰撞检测 ====================
    checkDollCollision(dollAPhysics, dollBPhysics) {
        if (dollAPhysics.state === 'grabbed' || dollBPhysics.state === 'grabbed') {
            return false;
        }

        const dx = dollAPhysics.position.x - dollBPhysics.position.x;
        const dy = dollAPhysics.position.y - dollBPhysics.position.y;
        const dz = dollAPhysics.position.z - dollBPhysics.position.z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const minDistance = dollAPhysics.radius + dollBPhysics.radius;

        if (distance < minDistance && distance > 0.001) {
            const nx = dx / distance;
            const ny = dy / distance;
            const nz = dz / distance;

            const dvx = dollAPhysics.velocity.x - dollBPhysics.velocity.x;
            const dvy = dollAPhysics.velocity.y - dollBPhysics.velocity.y;
            const dvz = dollAPhysics.velocity.z - dollBPhysics.velocity.z;

            const impulse = 2.0 * (dvx * nx + dvy * ny + dvz * nz) / 2.0;

            dollAPhysics.velocity.x -= impulse * nx * 0.5;
            dollAPhysics.velocity.y -= impulse * ny * 0.5;
            dollAPhysics.velocity.z -= impulse * nz * 0.5;
            dollBPhysics.velocity.x += impulse * nx * 0.5;
            dollBPhysics.velocity.y += impulse * ny * 0.5;
            dollBPhysics.velocity.z += impulse * nz * 0.5;

            // 分离重叠
            const overlap = minDistance - distance;
            dollAPhysics.position.x += nx * overlap * 0.5;
            dollAPhysics.position.y += ny * overlap * 0.5;
            dollAPhysics.position.z += nz * overlap * 0.5;
            dollBPhysics.position.x -= nx * overlap * 0.5;
            dollBPhysics.position.y -= ny * overlap * 0.5;
            dollBPhysics.position.z -= nz * overlap * 0.5;

            log(LOG_LEVEL.WARN, 'PhysicsEngine', `娃娃 ${dollAPhysics.index} 与娃娃 ${dollBPhysics.index} 碰撞`);
            return true;
        }
        return false;
    },

    // ==================== 更新所有娃娃物理 ====================
    update(deltaTime) {
        // 限制deltaTime，防止跳帧导致穿透
        const dt = Math.min(deltaTime, 0.033); // 最大33ms (30 FPS)

        this.dolls.forEach(dollPhysics => {
            if (!dollPhysics || dollPhysics.state === 'grabbed') {
                return;
            }

            // 1. 应用重力
            this.applyGravity(dollPhysics, dt);

            // 2. 更新位置
            dollPhysics.position.x += dollPhysics.velocity.x * dt;
            dollPhysics.position.y += dollPhysics.velocity.y * dt;
            dollPhysics.position.z += dollPhysics.velocity.z * dt;

            // 3. 更新旋转（带阻尼，逐渐停止）
            if (dollPhysics.mesh && dollPhysics.state !== 'resting') {
                dollPhysics.mesh.rotation.x += (dollPhysics.rotationSpeed.x || 0) * dt;
                dollPhysics.mesh.rotation.y += (dollPhysics.rotationSpeed.y || 0) * dt;
                dollPhysics.mesh.rotation.z += (dollPhysics.rotationSpeed.z || 0) * dt;

                // 旋转阻尼：每帧乘以阻尼系数
                const rotDamp = this.rotationDamping;
                dollPhysics.rotationSpeed.x *= rotDamp;
                dollPhysics.rotationSpeed.y *= rotDamp;
                dollPhysics.rotationSpeed.z *= rotDamp;

                // 旋转速度足够小时清零
                if (Math.abs(dollPhysics.rotationSpeed.x) < 0.01) dollPhysics.rotationSpeed.x = 0;
                if (Math.abs(dollPhysics.rotationSpeed.y) < 0.01) dollPhysics.rotationSpeed.y = 0;
                if (Math.abs(dollPhysics.rotationSpeed.z) < 0.01) dollPhysics.rotationSpeed.z = 0;
            }

            // 4. 地面碰撞检测
            this.checkGroundCollision(dollPhysics);

            // 5. 娃娃-娃娃碰撞检测【已关闭】
            // 原因：娃娃间碰撞导致连锁反应，所有娃娃被弹飞出机箱
            // 如需重新启用，取消下方注释即可
            // this.dolls.forEach(otherPhysics => {
            //     if (otherPhysics && otherPhysics !== dollPhysics) {
            //         this.checkDollCollision(dollPhysics, otherPhysics);
            //     }
            // });

            // 6. 同步Three.js网格位置
            if (dollPhysics.mesh) {
                dollPhysics.mesh.position.copy(dollPhysics.position);
            }
        });
    }
};

log(LOG_LEVEL.INFO, 'Physics', 'physics.js v3.2.1-build20260527-1400 加载完成');
