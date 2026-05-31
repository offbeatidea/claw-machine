// main.js - 主入口：初始化场景、启动游戏循环
// 依赖: utils.js, config.js, physics.js, cabinet.js, claw.js, dolls.js
// 注意：不使用Cannon.js，使用自研PhysicsEngine
// 所有依赖通过 window 全局对象访问

// ==================== 版本日志（强制刷新检查）====================
// 【重要】每次修改 index.html 或 code/ 下任何 JS/CSS 文件后，必须更新此时间戳！
// 格式：v3.2.0-buildYYYYMMDD-HHMM
console.log('%c[Main] v3.3.0-build20260530s - FORCE REFRESH CHECK', 'color: #00ff00; font-weight: bold;');
// ================================================================

// ==================== 从window对象获取管理类 ====================
const Utils = window.Utils || {};
const Config = window.ConfigManager || {};
const Physics = window.PhysicsEngine || {};
const Cabinet = window.CabinetManager || {};
const Claw = window.Claw || {};  // 注意：claw.js 挂载的是 window.Claw
const Dolls = window.DollManager || {};

// ==================== 全局变量 ====================
let scene, camera, renderer, clock;
let dolls = [];
// 注意：gameState 直接使用 window.gameState，不再维护局部副本
// claw.js 中所有状态切换都操作 window.gameState
// main.js 中也统一读 window.gameState
window.gameState = window.gameState || 'idle';
let score = 0;
let attempts = 0;
let maxAttempts = 10;
let isGrabbing = false;
let joystickInput = { x: 0, z: 0 };
let keys = { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false,
    w: false, a: false, s: false, d: false,
    W: false, A: false, S: false, D: false };
let clawVelocity = { x: 0, y: 0, z: 0 }; // 爪子当前速度

// ==================== 默认配置由 ConfigManager 初始化 ====================
// ConfigManager.init() 会优先从 localStorage 加载已保存配置
// 若无已保存配置，则使用 configDefinitions 中的 default 值
if (!window.currentConfig) window.currentConfig = {};

// ==================== 初始化 ====================
function init() {
    try {
        console.log('[Main] 初始化抓娃娃机 v3.3.0-build20260530s...');
        
        // 1. Three.js 场景
        scene = new THREE.Scene();
        window.scene = scene;
        scene.background = new THREE.Color(0x667eea);
        
        // 调试用：添加坐标系（红=X, 绿=Y, 蓝=Z），长度5单位
        const axesHelper = new THREE.AxesHelper(5);
        scene.add(axesHelper);
        console.log('[Debug] 坐标系已添加（红=X, 绿=Y, 蓝=Z）');
        
        // 调试用：添加网格，帮助判断地面位置和空间感
        const gridHelper = new THREE.GridHelper(10, 10, 0xff0000, 0x444444);
        gridHelper.position.y = 0.01; // 略高于地面，避免z-fighting
        scene.add(gridHelper);
        console.log('[Debug] 网格已添加（10x10，红线为主轴）');
        
        // 2. 相机（正面朝向娃娃机）
        camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        window.gameCamera = camera; // 挂到 window，供 showFloatText 使用
        camera.position.set(0, 5, 8);
        camera.lookAt(0, 2, 0);  // 正面看向娃娃机中心
        
        // 3. 渲染器（使用现有的 #gameCanvas）
        const canvas = document.getElementById('gameCanvas');
        renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        // 4. 时钟
        clock = new THREE.Clock();
        
        // 5. 物理引擎
        Physics.init();
        
        // 6. 灯光
        setupLights();
        
        // 7. 机箱 + 地面
        console.log('[Main] 开始创建机箱...');
        Cabinet.createCabinet();
        Cabinet.createGround();
        console.log('[Main] 机箱创建完成');
        
        // 8. 爪子
        console.log('[Main] 开始创建爪子...');
        Claw.init();
        console.log('[Main] 爪子创建完成');
        
        // 9. 娃娃
        console.log('[Main] 开始创建娃娃...');
        Dolls.init();
        dolls = Dolls.dolls;
        console.log('[Main] 娃娃创建完成，数量:', dolls.length);
        
        // 10. 事件监听
        setupEventListeners();
        
        // 11. 配置面板
        Config.init();
        
        console.log('[Main] 初始化完成！娃娃数量:', dolls.length);
        
        // 12. 打印相机位置与朝向
        console.log('%c[Camera] 位置:', 'color: #ff6b6b; font-weight: bold;', camera.position);
        console.log('%c[Camera] 朝向:', 'color: #ff6b6b; font-weight: bold;', camera.getWorldDirection(new THREE.Vector3()));
        console.log('%c[Camera] 场景物体数量:', 'color: #ff6b6b; font-weight: bold;', scene.children.length);
        console.log('%c[Debug] 调试用指令: setCamera(x, y, z, lookAtX, lookAtY, lookAtZ)', 'color: #00ff00; font-weight: bold;');
        
        // 13. 初始化游戏状态（使用 window.gameState 统一管理）
        window.gameState = window.gameState || 'idle';
        console.log(`[Main] 游戏状态初始化: ${window.gameState}`);
        
        // 14. 显示版本号
        displayVersion();
        
        // 15. 启动游戏循环
        animate();
    } catch (e) {
        console.error('[Main] 初始化失败:', e.message);
        console.error('[Main] 错误堆栈:', e.stack);
        alert('初始化失败: ' + e.message + '\n请按F12打开控制台查看详细信息');
    }
}

// ==================== 灯光设置 ====================
function setupLights() {
    // 环境光
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    // 方向光（模拟顶灯）
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 10, 5);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    scene.add(dirLight);
    
    // 点光源（机箱内部）
    const pointLight = new THREE.PointLight(0xffffff, 0.5, 20);
    pointLight.position.set(0, 8, 0);
    scene.add(pointLight);
}

// ==================== 事件监听 ====================
function setupEventListeners() {
    // 键盘
    document.addEventListener('keydown', (e) => {
        if (keys.hasOwnProperty(e.key)) {
            keys[e.key] = true;
        }
    });
    document.addEventListener('keyup', (e) => {
        if (keys.hasOwnProperty(e.key)) {
            keys[e.key] = false;
        }
    });
    
    // 虚拟摇杆（触摸）
    setupJoystick();
    
    // 抓取按钮
    document.getElementById('btnGrab').addEventListener('mousedown', startGrab);
    document.getElementById('btnGrab').addEventListener('touchstart', (e) => {
        e.preventDefault();
        startGrab();
    });
    
    // Debug 按钮
    const debugBtn = document.getElementById('debugBtn');
    if (debugBtn) {
        debugBtn.addEventListener('click', () => {
            if (window.debugDolls) window.debugDolls();
        });
    }
    
    // 模型标签按钮
    const labelBtn = document.getElementById('labelBtn');
    if (labelBtn) {
        labelBtn.addEventListener('click', () => {
            if (window.toggleLabels) window.toggleLabels();
        });
    }
    
    // 窗口缩放
    window.addEventListener('resize', onWindowResize);
}

// ==================== 虚拟摇杆 ====================
function setupJoystick() {
    const joystickArea = document.getElementById('joystickArea');
    const joystickBase = document.getElementById('joystickBase');
    const joystickThumb = document.getElementById('joystickThumb');
    
    // 初始化：确保摇杆拇指在底座中心
    joystickThumb.style.left = '50%';
    joystickThumb.style.top = '50%';
    joystickThumb.style.transform = 'translate(-50%, -50%)';
    
    let isDragging = false;
    
    const updateJoystick = (clientX, clientY) => {
        const rect = joystickBase.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const deltaX = clientX - centerX;
        const deltaY = clientY - centerY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const maxDistance = rect.width / 2 - joystickThumb.offsetWidth / 2;
        
        if (distance < maxDistance) {
            joystickThumb.style.left = (deltaX + rect.width / 2 - joystickThumb.offsetWidth / 2) + 'px';
            joystickThumb.style.top = (deltaY + rect.height / 2 - joystickThumb.offsetHeight / 2) + 'px';
        } else {
            const angle = Math.atan2(deltaY, deltaX);
            joystickThumb.style.left = (Math.cos(angle) * maxDistance + rect.width / 2 - joystickThumb.offsetWidth / 2) + 'px';
            joystickThumb.style.top = (Math.sin(angle) * maxDistance + rect.height / 2 - joystickThumb.offsetHeight / 2) + 'px';
        }
        
        joystickInput.x = clamp(deltaX / maxDistance, -1, 1);
        joystickInput.z = clamp(deltaY / maxDistance, -1, 1);
    };
    
    joystickArea.addEventListener('mousedown', (e) => {
        isDragging = true;
        updateJoystick(e.clientX, e.clientY);
    });
    
    document.addEventListener('mousemove', (e) => {
        if (isDragging) {
            updateJoystick(e.clientX, e.clientY);
        }
    });
    
    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            joystickThumb.style.left = '50%';
            joystickThumb.style.top = '50%';
            joystickThumb.style.transform = 'translate(-50%, -50%)';
            joystickInput.x = 0;
            joystickInput.z = 0;
        }
    });
    
    // 触摸事件
    joystickArea.addEventListener('touchstart', (e) => {
        e.preventDefault();
        isDragging = true;
        updateJoystick(e.touches[0].clientX, e.touches[0].clientY);
    });
    
    document.addEventListener('touchmove', (e) => {
        if (isDragging) {
            e.preventDefault();
            updateJoystick(e.touches[0].clientX, e.touches[0].clientY);
        }
    });
    
    document.addEventListener('touchend', () => {
        if (isDragging) {
            isDragging = false;
            joystickThumb.style.left = '50%';
            joystickThumb.style.top = '50%';
            joystickThumb.style.transform = 'translate(-50%, -50%)';
            joystickInput.x = 0;
            joystickInput.z = 0;
        }
    });
}

// ==================== 窗口缩放 ====================
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// ==================== 输入处理 ====================
function handleInput(deltaTime) {
    // 仅在 idle 状态接受输入
    // 非 idle 状态时，仅应用摩擦衰减（v330h 修复摆动消失问题）
    if (window.gameState !== 'idle') {
        // v330h 修复：非 idle 时也要衰减速度，否则摆动会突然停止
        const config = window.currentConfig || {};
        const friction = (config.clawFriction || 80) / 100;
        clawVelocity.x *= friction;
        clawVelocity.z *= friction;
        
        // 速度很小时直接归零
        if (Math.abs(clawVelocity.x) < 0.001) clawVelocity.x = 0;
        if (Math.abs(clawVelocity.z) < 0.001) clawVelocity.z = 0;
        return;
    }
    
    // 读取配置
    const config = window.currentConfig || {};
    const force = config.clawForce || 10.0;
    const maxSpeed = config.clawMaxSpeed || 5.0;
    const friction = (config.clawFriction || 80) / 100;
    
    // 计算输入方向（支持键盘 + 虚拟摇杆）
    let inputX = 0, inputZ = 0;
    if (keys.ArrowLeft || keys.a || keys.A) inputX -= 1;
    if (keys.ArrowRight || keys.d || keys.D) inputX += 1;
    if (keys.ArrowUp || keys.w || keys.W) inputZ -= 1;  // W = 向前（Z-）
    if (keys.ArrowDown || keys.s || keys.S) inputZ += 1;   // S = 向后（Z+）
    
    // 叠加虚拟摇杆输入
    inputX += joystickInput.x;
    inputZ += joystickInput.z;
    
    // 归一化
    const length = Math.sqrt(inputX * inputX + inputZ * inputZ);
    if (length > 1) {
        inputX /= length;
        inputZ /= length;
    }
    
    // 应用加速度（按时间增量缩放）
    const dt = deltaTime || (clock ? clock.getDelta() : 0.016);
    clawVelocity.x += inputX * force * dt;
    clawVelocity.z += inputZ * force * dt;
    
    // 限制最大速度
    const speed = Math.sqrt(clawVelocity.x * clawVelocity.x + clawVelocity.z * clawVelocity.z);
    if (speed > maxSpeed) {
        clawVelocity.x = (clawVelocity.x / speed) * maxSpeed;
        clawVelocity.z = (clawVelocity.z / speed) * maxSpeed;
    }
    
    // 应用摩擦力（速度衰减）
    clawVelocity.x *= friction;
    clawVelocity.z *= friction;
    
    // 速度很小时直接归零
    if (Math.abs(clawVelocity.x) < 0.001) clawVelocity.x = 0;
    if (Math.abs(clawVelocity.z) < 0.001) clawVelocity.z = 0;
    
    // 移动爪子基座
    if (Claw && Claw.move) {
        Claw.move(clawVelocity.x * dt, clawVelocity.z * dt);
    }
}

// ==================== 抓取控制 ====================
function startGrab() {
    if (isGrabbing) return;
    isGrabbing = true;
    
    if (Claw && Claw.grab) {
        Claw.grab();
    }
    
    // 0.5秒后重置抓取状态（防止连续触发）
    setTimeout(() => {
        isGrabbing = false;
    }, 500);
}

// ==================== 更新UI ====================
function updateUI() {
    // v330j 修复：使用 window.gameScore / window.gameAttempts，而非局部变量
    const scoreEl = document.getElementById('score');
    const attemptsEl = document.getElementById('attempts');
    if (scoreEl) scoreEl.textContent = `得分: ${window.gameScore || 0}`;
    if (attemptsEl) attemptsEl.textContent = `剩余次数: ${maxAttempts - (window.gameAttempts || 0)}`;
    
    // 游戏结束判定
    if (window.gameAttempts >= maxAttempts) {
        const gameOverEl = document.getElementById('gameOver');
        const finalScoreEl = document.getElementById('finalScore');
        if (gameOverEl) gameOverEl.style.display = 'block';
        if (finalScoreEl) finalScoreEl.textContent = `最终得分: ${window.gameScore || 0}`;
    }
}

// ==================== 返回出口上方 ====================
function returnToExit() {
    if (Claw && Claw.returnToExit) {
        Claw.returnToExit();
    }
}

// ==================== 检查中途掉落（返回值：是否掉落） ====================
function checkMidMoveDrop() {
    // v330j 修复：强抓娃娃不会在中途掉落，此函数留空
    // 弱抓娃娃已经在 claw.js 的 applyParabolicDropWithVelocity() 中处理
    return false;
}

// ==================== 游戏循环 ====================
function animate() {
    requestAnimationFrame(animate);
    
    const deltaTime = clock.getDelta();
    
    // 1. 输入处理
    handleInput(deltaTime);
    
    // 2. 更新爪子（含物理）
    if (Claw && Claw.update) {
        Claw.update(deltaTime);
    }
    
    // 3. 更新娃娃（物理引擎）
    if (Physics && Physics.update) {
        Physics.update(deltaTime);
    }
    
    // 4. 更新UI
    updateUI();
    
    // 5. 渲染
    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    }
}

// ==================== 工具函数 ====================
function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

// ==================== 全局调试函数 ====================
/**
 * setCamera() - 调试用：手动设置摄像机位置与朝向
 * 
 * @param {number} x - 相机X位置
 * @param {number} y - 相机Y位置
 * @param {number} z - 相机Z位置
 * @param {number} lookAtX - 看向点的X坐标（可选，默认0）
 * @param {number} lookAtY - 看向点的Y坐标（可选，默认4）
 * @param {number} lookAtZ - 看向点的Z坐标（可选，默认0）
 * 
 * 使用示例：
 * setCamera(5, 8, 12, 0, 4, 0)   // 默认视角
 * setCamera(0, 20, 0, 0, 0, 0)  // 俯瞰视角
 * setCamera(10, 5, 10, 0, 2, 0) // 斜侧视角
 */
window.setCamera = function(x, y, z, lookAtX, lookAtY, lookAtZ) {
    if (!camera) {
        console.error('[Debug] 相机尚未初始化，请等待页面加载完成');
        return;
    }
    
    camera.position.set(x, y, z);
    camera.lookAt(lookAtX || 0, lookAtY || 4, lookAtZ || 0);
    
    console.log('%c[Debug] 相机已调整', 'color: #00ff00; font-weight: bold;');
    console.log('  位置:', camera.position);
    console.log('  朝向:', camera.getWorldDirection(new THREE.Vector3()));
    console.log('  调用参数: setCamera(' + [x, y, z, lookAtX || 0, lookAtY || 4, lookAtZ || 0].join(', ') + ')');
};

/**
 * debugDolls() - 调试用：打印所有娃娃位置，并自动调整摄像机查看娃娃
 * 
 * 功能：
 * 1. 打印每个娃娃的名称和位置坐标
 * 2. 自动计算最佳摄像机位置（从侧面看娃娃）
 * 3. 自动调整摄像机并朝向娃娃中心
 * 
 * 使用示例：
 * debugDolls()  // 打印位置并自动调整摄像机
 */
window.debugDolls = function() {
    if (!window.DollManager || !window.DollManager.dolls || window.DollManager.dolls.length === 0) {
        console.error('[Debug] 娃娃尚未初始化或不存在');
        return;
    }
    
    const dolls = window.DollManager.dolls;
    console.log('%c[Debug] 娃娃位置信息:', 'color: #ff6b6b; font-weight: bold;');
    
    // 计算娃娃的中心位置
    let centerX = 0, centerY = 0, centerZ = 0;
    let maxY = -Infinity, minY = Infinity;
    
    dolls.forEach((doll, index) => {
        if (!doll) return;
        
        const pos = doll.position;
        const name = doll.userData.name || `娃娃${index}`;
        console.log(`  ${name}: (${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)})`);
        
        centerX += pos.x;
        centerY += pos.y;
        centerZ += pos.z;
        maxY = Math.max(maxY, pos.y);
        minY = Math.min(minY, pos.y);
    });
    
    centerX /= dolls.length;
    centerY /= dolls.length;
    centerZ /= dolls.length;
    
    console.log(`%c[Debug] 娃娃中心位置: (${centerX.toFixed(2)}, ${centerY.toFixed(2)}, ${centerZ.toFixed(2)})`, 'color: #ff6b6b;');
    console.log(`%c[Debug] 娃娃高度范围: ${minY.toFixed(2)} ~ ${maxY.toFixed(2)}`, 'color: #ff6b6b;');
    
    // 自动调整摄像机到侧面视角，看向娃娃中心
    const cameraX = centerX + 6;  // 在X轴方向偏移6个单位
    const cameraY = maxY + 2;     // 在最高娃娃上方2个单位
    const cameraZ = centerZ + 2;  // 在Z轴方向稍微偏移
    
    console.log(`%c[Debug] 自动调整摄像机到: (${cameraX.toFixed(2)}, ${cameraY.toFixed(2)}, ${cameraZ.toFixed(2)})`, 'color: #00ff00; font-weight: bold;');
    
    if (camera) {
        camera.position.set(cameraX, cameraY, cameraZ);
        camera.lookAt(centerX, centerY, centerZ);
        console.log('%c[Debug] 摄像机已自动调整，现在应该能看到娃娃了！', 'color: #00ff00; font-weight: bold;');
    } else {
        console.error('[Debug] 摄像机不存在，无法自动调整');
    }
};

/**
 * displayVersion() - 在UI中显示版本号
 * 
 * 功能：
 * 1. 从 version.json 读取版本信息（通过 AJAX 请求）
 * 2. 在 #version 元素中显示版本号
 * 3. 如果无法读取，则显示默认值
 * 
 * 注意：由于浏览器 CORS 限制，直接读取本地文件可能失败
 * 因此使用内联版本号作为后备方案
 */
window.displayVersion = function() {
    const versionEl = document.getElementById('version');
    if (!versionEl) {
        console.warn('[Version] #version 元素不存在');
        return;
    }
    
    // 方法1：从 version.json 读取（需要 HTTP 服务器）
    fetch('version.json?t=' + new Date().getTime())  // 添加时间戳防止缓存
        .then(response => {
            if (!response.ok) throw new Error('HTTP ' + response.status);
            return response.json();
        })
        .then(version => {
            versionEl.textContent = version.full;
            console.log('%c[Version] 版本号已显示: ' + version.full, 'color: #00ff00;');
        })
        .catch(err => {
            console.warn('[Version] 无法读取 version.json，使用内联版本号', err.message);
            // 方法2：使用内联版本号（后备方案）
            const inlineVersion = 'v3.3.0-build20260530j';
            versionEl.textContent = inlineVersion;
        });
};

// ==================== 启动游戏 ====================
// 等待 DOM 加载完成后初始化
window.addEventListener('DOMContentLoaded', () => {
    console.log('%c[Main] DOM 已加载，开始初始化...', 'color: #00ff00; font-weight: bold;');
    try {
        init();
    } catch (e) {
        console.error('[Main] 初始化异常:', e);
    }
});

// 备用：如果 DOMContentLoaded 已触发，直接执行
if (document.readyState !== 'loading') {
    console.log('%c[Main] DOM 已就绪（readyState=' + document.readyState + '），直接初始化', 'color: #ffaa00;');
    setTimeout(() => {
        if (!window.gameState || window.gameState === 'idle') {
            init();
        }
    }, 100);
}
