// dolls.js - 娃娃管理（创建/更新/释放）
// 依赖: THREE, window.CONFIG, window.currentConfig, window.PhysicsEngine, window.Claw
// 版本: v3.2.1-build20260526-1452 FORCE REFRESH

window.DollManager = {
    dolls: [],          // 娃娃数组
    dollModels: [],     // 娃娃模型数组（Three.js对象）
    
    // ==================== 初始化娃娃 ====================
    init() {
        const CONFIG = window.CONFIG || {};
        const colors = [0xff6b6b, 0x4ecdc4, 0xffe66d, 0xa8e6cf, 0xff8b94];
        const names = ['小熊', '兔子', '猫咪', '狗狗', '企鹅'];
        
        const sizeFactor = ((window.currentConfig && window.currentConfig.dollSizeFactor) || 100) / 100;
        const dollSize = (CONFIG.DOLL_SIZE || 0.5) * sizeFactor;
        log(LOG_LEVEL.INFO, 'DollManager', `创建娃娃 sizeFactor=${sizeFactor}, dollSize=${dollSize}`);
        
        this.dolls = [];
        this.dollModels = [];
        
        for (let i = 0; i < (CONFIG.DOLL_COUNT || 5); i++) {
            const doll = new THREE.Group();
            
            // 身体
            const bodyMaterial = new THREE.MeshPhongMaterial({
                color: colors[i],
                shininess: 30
            });
            const body = new THREE.Mesh(
                new THREE.BoxGeometry(dollSize, dollSize * 1.2, dollSize),
                bodyMaterial
            );
            body.position.set(0, dollSize * 0.5, 0);
            body.castShadow = true;
            doll.add(body);
            
            // 头
            const head = new THREE.Mesh(
                new THREE.SphereGeometry(dollSize * 0.4, 16, 16),
                bodyMaterial
            );
            head.position.set(0, dollSize * 1.4, 0);
            head.castShadow = true;
            doll.add(head);
            
            // 眼睛
            const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
            const leftEye = new THREE.Mesh(
                new THREE.SphereGeometry(0.05 * sizeFactor, 8, 8),
                eyeMaterial
            );
            leftEye.position.set(-0.12 * sizeFactor, dollSize * 1.45, dollSize * 0.35);
            doll.add(leftEye);
            
            const rightEye = new THREE.Mesh(
                new THREE.SphereGeometry(0.05 * sizeFactor, 8, 8),
                eyeMaterial
            );
            rightEye.position.set(0.12 * sizeFactor, dollSize * 1.45, dollSize * 0.35);
            doll.add(rightEye);
            
            // 手臂
            const armMaterial = new THREE.MeshPhongMaterial({
                color: colors[i],
                shininess: 20
            });
            
            const leftArm = new THREE.Mesh(
                new THREE.CylinderGeometry(0.06 * sizeFactor, 0.06 * sizeFactor, dollSize * 0.8, 8),
                armMaterial
            );
            leftArm.position.set(-dollSize * 0.5, dollSize * 0.7, 0);
            leftArm.rotation.z = Math.PI / 6;
            leftArm.castShadow = true;
            doll.add(leftArm);
            
            const rightArm = new THREE.Mesh(
                new THREE.CylinderGeometry(0.06 * sizeFactor, 0.06 * sizeFactor, dollSize * 0.8, 8),
                armMaterial
            );
            rightArm.position.set(dollSize * 0.5, dollSize * 0.7, 0);
            rightArm.rotation.z = -Math.PI / 6;
            rightArm.castShadow = true;
            doll.add(rightArm);
            
            // 随机位置（在机箱范围内，且位于地面上）
            const halfWidth = (CONFIG.CABINET_WIDTH || 3.2) / 2 - 0.5;
            const halfDepth = (CONFIG.CABINET_DEPTH || 3.2) / 2 - 0.5;
            const x = (Math.random() - 0.5) * 2 * halfWidth;
            const z = (Math.random() - 0.5) * 2 * halfDepth;
            const groundY = CONFIG.GROUND_Y || 0.5;
            doll.position.set(x, groundY + dollSize * 0.5, z);
            
            // 用户数据
            doll.userData = {
                id: i,
                name: names[i],
                color: colors[i],
                isGrabbed: false
            };
            
            this.dolls.push(doll);
            this.dollModels.push(doll);
            window.scene.add(doll);
            
            // 创建名称标签
            createDollLabel(doll, names[i]);
            
            // 注册到物理引擎
            if (window.PhysicsEngine) {
                window.PhysicsEngine.registerDoll(doll, i);
            }
            
            log(LOG_LEVEL.INFO, 'DollManager', `已创建娃娃: ${names[i]}`);
        }
        
        log(LOG_LEVEL.INFO, 'DollManager', `已创建 ${this.dolls.length} 个娃娃`);
        log(LOG_LEVEL.INFO, 'DollManager', '初始化完成');
    },
    
    // ==================== 更新娃娃（每帧调用） ====================
    updateDolls(deltaTime) {
        // 物理引擎会负责更新娃娃位置
        // 这里只做额外逻辑（如：检测娃娃是否掉出机箱）
        if (!window.PhysicsEngine) return;
        
        this.dolls.forEach((doll, index) => {
            if (!doll || !doll.userData) return;
            
            // 检测娃娃是否掉出机箱（加0.5的余量）
            const CONFIG = window.CONFIG || {};
            const halfWidth = (CONFIG.CABINET_WIDTH || 3.2) / 2;
            const halfDepth = (CONFIG.CABINET_DEPTH || 3.2) / 2;
            const margin = 0.5;  // 超出机箱0.5个单位才判定为掉出
            
            if (Math.abs(doll.position.x) > halfWidth + margin ||
                Math.abs(doll.position.z) > halfDepth + margin) {
                // 娃娃掉出机箱：重置到机箱内地面上的随机位置
                const CONFIG = window.CONFIG || {};
                const groundY = CONFIG.GROUND_Y || 0.5;
                const dollSize = (CONFIG.DOLL_SIZE || 0.5) *
                    (((window.currentConfig && window.currentConfig.dollSizeFactor) || 100) / 100);
                const yPos = groundY + dollSize * 0.5;  // 站在地面上
                
                doll.position.set(
                    (Math.random() - 0.5) * (halfWidth - 0.5),
                    yPos,
                    (Math.random() - 0.5) * (halfDepth - 0.5)
                );
                
                // 重置物理状态
                const physicsObj = window.PhysicsEngine.getDollPhysics(index);
                if (physicsObj) {
                    physicsObj.position.copy(doll.position);
                    physicsObj.velocity.set(0, 0, 0);
                    physicsObj.state = 'resting';
                    physicsObj.onGround = true;
                    physicsObj.bounceCount = 0;
                }
                
                log(LOG_LEVEL.WARN, 'DollManager', `娃娃"${doll.userData.name}" 掉出机箱，已重置位置`);
            }
        });
    },
    
    // ==================== 释放娃娃 ====================
    releaseDoll(doll, reason) {
        /**
         * 释放娃娃
         * doll: THREE.Group 娃娃对象
         * reason: 'grab_fail' | 'weak_grab' | 'mid_move'
         */
        if (!doll || !doll.userData) return;
        
        doll.userData.isGrabbed = false;
        
        const physicsObj = window.PhysicsEngine ?
            window.PhysicsEngine.getDollPhysics(doll.userData.id) : null;
        
        if (!physicsObj) {
            log(LOG_LEVEL.WARN, 'DollManager', `娃娃 ${doll.userData.id} 没有物理对象`);
            return;
        }
        
        if (reason === 'grab_fail') {
            // 抓取失败：小范围跳动
            if (window.PhysicsEngine.applyGrabFailBounce) {
                window.PhysicsEngine.applyGrabFailBounce(physicsObj);
            }
            log(LOG_LEVEL.INFO, 'DollManager', `娃娃"${doll.userData.name}" 抓取失败跳动`);
            
        } else if (reason === 'weak_grab') {
            // 弱抓：抛物线掉落
            const clawVel = window.Claw && window.Claw.getVelocity ?
                window.Claw.getVelocity() : new THREE.Vector3(0, 2, 0);
            
            if (window.PhysicsEngine.applyWeakGrabDrop) {
                window.PhysicsEngine.applyWeakGrabDrop(physicsObj, clawVel);
            }
            log(LOG_LEVEL.INFO, 'DollManager', `娃娃"${doll.userData.name}" 弱抓掉落`);
            
        } else if (reason === 'mid_move') {
            // 移动中掉落：以爪子当前速度为初速度
            const clawVel = window.Claw && window.Claw.getVelocity ?
                window.Claw.getVelocity() : new THREE.Vector3(0, 0, 0);
            
            if (window.PhysicsEngine.applyParabolicDrop) {
                window.PhysicsEngine.applyParabolicDrop(physicsObj, clawVel);
            }
            log(LOG_LEVEL.INFO, 'DollManager', `娃娃"${doll.userData.name}" 移动中掉落`);
        }
    },
    
    // ==================== 获取娃娃 by ID ====================
    getDollById(id) {
        return this.dolls[id] || null;
    },
    
    // ==================== 重置所有娃娃 ====================
    resetAllDolls() {
        const CONFIG = window.CONFIG || {};
        const halfWidth = (CONFIG.CABINET_WIDTH || 8) / 2;
        const halfDepth = (CONFIG.CABINET_DEPTH || 8) / 2;
        
        this.dolls.forEach((doll, index) => {
            if (!doll || !doll.userData) return;
            
            // 随机位置
            const x = (Math.random() - 0.5) * (halfWidth - 1);
            const z = (Math.random() - 0.5) * (halfDepth - 1);
            doll.position.set(x, 0.5, z);
            
            doll.userData.isGrabbed = false;
            
            // 重置物理状态
            const physicsObj = window.PhysicsEngine ?
                window.PhysicsEngine.getDollPhysics(index) : null;
            
            if (physicsObj) {
                physicsObj.position.copy(doll.position);
                physicsObj.velocity.set(0, 0, 0);
                physicsObj.state = 'resting';
                physicsObj.onGround = true;
                physicsObj.bounceCount = 0;
            }
        });
        
        log(LOG_LEVEL.INFO, 'DollManager', `已重置 ${this.dolls.length} 个娃娃`);
    }
};

// ==================== 娃娃标签系统 ====================
window.dollLabels = [];  // 存储所有娃娃的 Sprite 标签

function createDollLabel(doll, name) {
    /**
     * 为娃娃创建 Sprite 文字标签
     * doll: THREE.Group 娃娃对象
     * name: string 娃娃名称
     * 返回: THREE.Sprite 标签对象
     */
    // 创建离屏画布
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    // 绘制圆角矩形背景
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.beginPath();
    const r = 16;
    ctx.moveTo(r, 8);
    ctx.lineTo(248 - r, 8);
    ctx.quadraticCurveTo(248, 8, 248, 8 + r);
    ctx.lineTo(248, 120 - r);
    ctx.quadraticCurveTo(248, 120, 248 - r, 120);
    ctx.lineTo(r, 120);
    ctx.quadraticCurveTo(8, 120, 8, 120 - r);
    ctx.lineTo(8, 8 + r);
    ctx.quadraticCurveTo(8, 8, r, 8);
    ctx.closePath();
    ctx.fill();

    // 绘制文字
    ctx.font = 'bold 52px "Microsoft YaHei", "PingFang SC", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(name, 128, 64);

    // 创建纹理
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;

    const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        opacity: 0.95,
        depthTest: false  // 标签始终显示，不被遮挡
    });

    const sprite = new THREE.Sprite(material);
    // 标签作为娃娃的子对象，跟随娃娃移动
    sprite.position.set(0, 2.2, 0);
    sprite.scale.set(2.0, 1.0, 1.0);

    doll.add(sprite);
    window.dollLabels.push(sprite);

    // 初始状态：隐藏
    sprite.visible = false;

    log(LOG_LEVEL.INFO, 'DollManager', `创建标签: ${name}`);
    return sprite;
}

// ==================== 切换娃娃标签显示 ====================
window.toggleLabels = function() {
    window.labelsVisible = !window.labelsVisible;
    console.log('[Dolls] 标签显示:', window.labelsVisible ? '开启' : '关闭');

    window.dollLabels.forEach((label, idx) => {
        if (label && label.visible !== undefined) {
            label.visible = window.labelsVisible;
        }
    });

    // 提示用户
    const floatText = document.getElementById('floatText');
    if (floatText) {
        floatText.textContent = window.labelsVisible ? '🏷️ 标签已开启' : '🏷️ 标签已关闭';
        floatText.style.opacity = 1;
        setTimeout(() => { floatText.style.opacity = 0; }, 1200);
    }
};
window.labelsVisible = false;

console.log('[Dolls] dolls.js v3.2.1-build20260526-1452 加载完成');
