// cabinet.js - 机箱/地面创建
// 依赖: THREE, window.CONFIG, window.currentConfig

window.CabinetManager = {
    cabinetGroup: null,
    exitMarker: null,

    // 初始化机箱
    init() {
        this.createCabinet();
        this.createGround();
        window.log('CabinetManager 初始化完成');
    },

    // 创建机箱（透明玻璃）
    createCabinet() {
        const CONFIG = window.CONFIG;
        const group = new THREE.Group();

        const glassMaterial = new THREE.MeshPhongMaterial({
            color: 0x88CCEE,
            transparent: true,
            opacity: 0.2,
            side: THREE.DoubleSide,
            shininess: 100
        });

        // 前墙（Z轴负方向）
        const frontWall = new THREE.Mesh(
            new THREE.BoxGeometry(CONFIG.CABINET_WIDTH, CONFIG.CABINET_HEIGHT, 0.1),
            glassMaterial
        );
        frontWall.position.set(0, CONFIG.CABINET_HEIGHT/2, -CONFIG.CABINET_DEPTH/2);
        group.add(frontWall);

        // 后墙
        const backWall = new THREE.Mesh(
            new THREE.BoxGeometry(CONFIG.CABINET_WIDTH, CONFIG.CABINET_HEIGHT, 0.1),
            glassMaterial
        );
        backWall.position.set(0, CONFIG.CABINET_HEIGHT/2, CONFIG.CABINET_DEPTH/2);
        group.add(backWall);

        // 左墙
        const leftWall = new THREE.Mesh(
            new THREE.BoxGeometry(0.1, CONFIG.CABINET_HEIGHT, CONFIG.CABINET_DEPTH),
            glassMaterial
        );
        leftWall.position.set(-CONFIG.CABINET_WIDTH/2, CONFIG.CABINET_HEIGHT/2, 0);
        group.add(leftWall);

        // 右墙
        const rightWall = new THREE.Mesh(
            new THREE.BoxGeometry(0.1, CONFIG.CABINET_HEIGHT, CONFIG.CABINET_DEPTH),
            glassMaterial
        );
        rightWall.position.set(CONFIG.CABINET_WIDTH/2, CONFIG.CABINET_HEIGHT/2, 0);
        group.add(rightWall);

        // 顶部（不透明）
        const topMaterial = new THREE.MeshPhongMaterial({ color: 0x333333 });
        const top = new THREE.Mesh(
            new THREE.BoxGeometry(CONFIG.CABINET_WIDTH, 0.2, CONFIG.CABINET_DEPTH),
            topMaterial
        );
        top.position.set(0, CONFIG.CABINET_HEIGHT, 0);
        group.add(top);

        this.cabinetGroup = group;
        window.scene.add(group);
        window.log('[Cabinet] 机箱已创建');
    },

    // 创建地面
    createGround() {
        const groundMaterial = new THREE.MeshPhongMaterial({
            color: 0x90EE90,
            shininess: 10
        });
        const ground = new THREE.Mesh(
            new THREE.PlaneGeometry(50, 50),
            groundMaterial
        );
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -0.31;
        ground.receiveShadow = true;
        window.scene.add(ground);

        // 创建出口标记（红色半透明）
        const exitMarker = new THREE.Mesh(
            new THREE.PlaneGeometry(1, 1),
            new THREE.MeshBasicMaterial({
                color: 0xff0000,
                transparent: true,
                opacity: 0.6,
                side: THREE.DoubleSide
            })
        );
        exitMarker.position.set(CONFIG.CABINET_WIDTH/2 - 0.5, 0.01, CONFIG.CABINET_DEPTH/2 - 0.5);
        exitMarker.rotation.x = -Math.PI / 2;
        this.exitMarker = exitMarker;
        window.scene.add(exitMarker);

        window.log('[Cabinet] 地面已创建');
    },

    // 获取机箱尺寸
    getCabinetSize() {
        const CONFIG = window.CONFIG;
        return {
            width: CONFIG.CABINET_WIDTH,
            depth: CONFIG.CABINET_DEPTH,
            height: CONFIG.CABINET_HEIGHT
        };
    }
};

window.log('cabinet.js 加载完成');
