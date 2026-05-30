// config.js - 配置面板逻辑
// 依赖: window.currentConfig, window.CONFIG

const STORAGE_KEY = 'clawMachineConfig';

window.ConfigManager = {
    configDefinitions: [
        // ========== 分组 1：爪子移动（基础参数）==========
        { id: 'clawForce', label: '爪子推动力', group: '爪子移动', min: 5.0, max: 25.0, step: 2.5, default: 10.0, unit: '', explanation: '按键时爪子的加速度（单位/秒²）。值越大加速越快。建议范围 0.5~3，默认 1.0。注意：此参数与爪子最大速度、摩擦力协同作用。' },
        { id: 'clawMaxSpeed', label: '爪子最大速度', group: '爪子移动', min: 5.0, max: 25.0, step: 1.0, default: 5.0, unit: '', explanation: '爪子移动的速度上限（单位/秒）。机箱宽度仅8单位，建议范围 0.5~3，默认 1.5。' },
        { id: 'clawFriction', label: '爪子速度留存', group: '爪子移动', min: 70, max: 90, step: 1, default: 80, unit: '', explanation: '爪子停止输入后，速度衰减的速度。值越大衰减越快（0=无摩擦，100=立刻停止）。实际计算公式：每帧速度保留率 = friction/100。' },
        { id: 'descendSpeed', label: '下降速度', group: '爪子移动', min: 0.1, max: 2.0, step: 0.1, default: 0.5, unit: '', explanation: '爪子下降的速度。值越小下降越慢，甩动越明显。实际下降时间 ≈ 绳子长度 / 下降速度。' },
        { id: 'ascendSpeed', label: '上升速度', group: '爪子移动', min: 0.1, max: 2.0, step: 0.1, default: 0.5, unit: '', explanation: '爪子上升的速度。弱抓脱手时，娃娃获得爪子当前速度的一定比例作为初速度。' },
        { id: 'ropeLength', label: '最大下降深度', group: '爪子移动', min: 0.5, max: 3.0, step: 0.1, default: 1.5, unit: '', explanation: '爪子能下降的最大深度（绳子放出的最大长度）。实际下降距离 = ropeLength。' },

        // ========== 分组 2：甩爪（依赖爪子移动）==========
        { id: 'pendulumRopeLength', label: '甩爪绳长', group: '甩爪', min: 0.0, max: 1.0, step: 0.1, default: 0.2, unit: '', explanation: '爪子到基座的绳子长度（钟摆臂长）。值越大甩动幅度越大，下降时绳子逐渐放出。' },
        { id: 'pendulumGravity', label: '钟摆重力', group: '甩爪', min: 0.0, max: 20.0, step: 1.0, default: 10.0, unit: '', explanation: '爪子摆动时的重力强度。值越大摆动越快。注意：甩爪效果受爪子移动加速度影响。' },
        { id: 'pendulumDamping', label: '钟摆阻尼', group: '甩爪', min: 0.0, max: 10.0, step: 0.1, default: 1.0, unit: '', explanation: '爪子摆动的能量损耗。值越大摆动越快停止（0=永久摆动，100=立刻停止）。' },
        { id: 'retractRopeMode', label: '回收终点绳长', group: '甩爪', type: 'select', options: ['pendulum', 'zero'], optionLabels: ['甩爪绳长', '0'], default: 'pendulum', explanation: '爪子上升时绳子回收的终点长度。【甩爪绳长】：全程保持摆动效果，上升至甩爪绳长后判定；【0】：绳子完全收回（爪子贴近底座），弱抓时给娃娃一个向机箱后方随机方向的平抛初速度。' },

        // ========== 分组 3：娃娃掉落（依赖爪子位置和甩爪）==========
        { id: 'gravity', label: '重力加速度', group: '娃娃掉落', min: -20, max: 0, step: 0.1, default: -9.8, unit: '', explanation: '娃娃掉落时的重力加速度。值越负掉落越快。' },
        { id: 'airResistance', label: '空气阻力', group: '娃娃掉落', min: 0, max: 10, step: 0.1, default: 2, unit: '', explanation: '娃娃在空中移动时的速度衰减。值越大空中移动越慢。' },
        { id: 'friction', label: '地面摩擦力', group: '娃娃掉落', min: 0, max: 100, step: 1, default: 90, unit: '', explanation: '娃娃在地面滑动时的速度衰减。值越大滑动距离越短。实际计算公式：每帧速度保留率 = friction/100。' },
        { id: 'dropCheckCount', label: '掉落判断次数', group: '娃娃掉落', min: 1, max: 10, step: 1, default: 3, unit: '次', explanation: '爪子移动过程中，每帧检测娃娃是否掉落的次数。值越高掉落越频繁。' },
        { id: 'dropChance', label: '掉落率', group: '娃娃掉落', min: 0, max: 100, step: 1, default: 5, unit: '%', explanation: '每次掉落检测时，娃娃从爪子中掉落的概率。' },

        // ========== 分组 4：反弹（依赖娃娃掉落）==========
        { id: 'bounceDamping', label: '反弹阻尼', group: '反弹', min: 0, max: 100, step: 1, default: 60, unit: '', explanation: '娃娃落地反弹时保留的能量百分比。值越大反弹越高（0=不反弹，100=完全弹性碰撞）。' },
        { id: 'maxBounces', label: '最大反弹次数', group: '反弹', min: 1, max: 10, step: 1, default: 3, unit: '次', explanation: '娃娃落地后最多反弹几次。达到上限后直接静止。' },

        // ========== 分组 5：其他（独立参数）==========
        { id: 'grabSuccessRate', label: '抓取成功率', group: '其他', min: 0, max: 100, step: 1, default: 50, unit: '%', explanation: '爪子尝试抓取时，成功抓住娃娃的概率。值越高越容易抓到。' },
        { id: 'strongGrabRate', label: '强抓几率', group: '其他', min: 0, max: 100, step: 1, default: 20, unit: '%', explanation: '抓取成功时，触发"强抓"（牢牢抓住不放）的概率。强抓时娃娃不会在移动中掉落。' },
        { id: 'dollSizeFactor', label: '娃娃尺寸系数', group: '其他', min: 50, max: 200, step: 5, default: 100, unit: '%', explanation: '控制所有娃娃的显示大小。值越大娃娃越大，越难抓取。' },
        { id: 'clawSizeFactor', label: '爪子尺寸系数', group: '其他', min: 50, max: 200, step: 5, default: 100, unit: '%', explanation: '控制爪子的显示大小。值越大爪子越大，越容易抓到娃娃。' },
        { id: 'clawInitialPos', label: '爪子初始位置', group: '其他', type: 'select', options: ['center', 'exit'], default: 'exit', explanation: '游戏开始时爪子的位置。"center"为机箱中心，"exit"为出口上方。' },
        { id: 'dollRadius', label: '娃娃碰撞半径', group: '其他', min: 10, max: 100, step: 1, default: 30, unit: '', explanation: '娃娃物理碰撞的检测半径。值越大越容易与其他娃娃发生碰撞。' },
        { id: 'dollHeight', label: '娃娃高度', group: '其他', min: 20, max: 200, step: 5, default: 60, unit: '', explanation: '娃娃的显示高度。影响娃娃的视觉大小和碰撞盒高度。' },
        { id: 'logLevel', label: '日志等级', group: '其他', type: 'select', options: [0, 1, 2, 3, 4], optionLabels: ['无', '仅错误', '错误+警告', '错误+警告+信息', '全部(含调试)'], default: 2, explanation: '控制控制台日志输出等级。0=无日志，1=仅错误，2=错误+警告，3=错误+警告+信息（默认），4=全部（含调试）。' }
    ],

    init() {
        // 尝试从 localStorage 加载已保存的配置
        const loaded = this.loadConfig();
        if (!loaded) {
            // 未加载到已保存配置，用默认值初始化 window.currentConfig
            window.currentConfig = {};
            this.configDefinitions.forEach(def => {
                window.currentConfig[def.id] = def.default;
            });
            window.log('[Config] 已初始化默认配置');
        }
        this.generateConfigPanel();
        this.bindEvents();
        this.updateUI();
        window.log('ConfigManager 初始化完成');
    },

    // 从 localStorage 加载已保存的配置
    loadConfig() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (!saved) {
                window.log('[Config] 无已保存配置，使用默认值');
                return false;
            }
            const parsed = JSON.parse(saved);
            // 与默认值合并（防新增配置项缺失）
            this.configDefinitions.forEach(def => {
                window.currentConfig[def.id] = parsed.hasOwnProperty(def.id) ? parsed[def.id] : def.default;
            });
            window.log('[Config] 已从本地加载配置', parsed);
            return true;
        } catch (e) {
            window.log('[Config] 加载配置失败: ' + e.message);
            return false;
        }
    },

    // 将当前配置保存到 localStorage
    saveConfig() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(window.currentConfig));
            window.log('[Config] 配置已保存到本地', window.currentConfig);
        } catch (e) {
            window.log('[Config] 保存配置失败: ' + e.message);
        }
    },

    // 恢复所有配置为默认值
    resetToDefault() {
        this.configDefinitions.forEach(def => {
            window.currentConfig[def.id] = def.default;
        });
        this.updateUI();
        this.saveConfig();
        window.log('[Config] 已恢复为默认配置');
    },

    // 动态生成配置面板HTML
    generateConfigPanel() {
        const panel = document.getElementById('configPanel');
        if (!panel) {
            window.log('[Config] 错误: 找不到configPanel元素');
            return;
        }

        // 清空面板
        panel.innerHTML = '';

        // 标题（常驻顶部）
        const header = document.createElement('div');
        header.id = 'configHeader';
        const h2 = document.createElement('h2');
        h2.textContent = '游戏配置';
        header.appendChild(h2);
        panel.appendChild(header);

        // 可滚动内容区域
        const content = document.createElement('div');
        content.id = 'configContent';

        // 按分组生成内容
        let currentGroup = '';
        this.configDefinitions.forEach(def => {
            // 分组标题
            if (def.group !== currentGroup) {
                currentGroup = def.group;
                const groupTitle = document.createElement('h3');
                groupTitle.textContent = currentGroup;
                groupTitle.style.color = '#4ecdc4';
                groupTitle.style.marginTop = '20px';
                groupTitle.style.marginBottom = '10px';
                groupTitle.style.borderBottom = '1px solid #4ecdc4';
                groupTitle.style.paddingBottom = '5px';
                content.appendChild(groupTitle);
            }

            // 配置项
            const item = document.createElement('div');
            item.className = 'config-item';
            item.style.marginBottom = '15px';
            item.style.paddingBottom = '10px';
            item.style.borderBottom = '1px solid #444';

            // 标签
            const label = document.createElement('label');
            label.textContent = def.label;
            label.style.display = 'block';
            label.style.marginBottom = '5px';
            label.style.color = '#fff';
            label.style.fontWeight = 'bold';
            item.appendChild(label);

            // 解释文字
            const explanation = document.createElement('div');
            explanation.textContent = def.explanation;
            explanation.style.fontSize = '11px';
            explanation.style.color = '#aaa';
            explanation.style.marginBottom = '8px';
            explanation.style.lineHeight = '1.4';
            item.appendChild(explanation);

            // 输入控件
            let input;
            if (def.type === 'select') {
                input = document.createElement('select');
                input.id = def.id;
                def.options.forEach((opt, idx) => {
                    const option = document.createElement('option');
                    option.value = opt;
                    // 优先使用 optionLabels，否则使用默认映射
                    if (def.optionLabels && def.optionLabels[idx] !== undefined) {
                        option.textContent = def.optionLabels[idx];
                    } else {
                        option.textContent = opt === 'center' ? '中心' : opt === 'exit' ? '出口上方' : opt;
                    }
                    if (opt === def.default) option.selected = true;
                    input.appendChild(option);
                });
            } else {
                input = document.createElement('input');
                input.type = 'range';
                input.id = def.id;
                input.min = def.min;
                input.max = def.max;
                input.step = def.step;
                input.value = def.default;
            }
            input.style.width = '100%';
            item.appendChild(input);

            // 值显示（非select类型）
            if (def.type !== 'select') {
                const valueSpan = document.createElement('span');
                valueSpan.id = def.id + 'Value';
                valueSpan.textContent = def.default + def.unit;
                valueSpan.style.marginLeft = '10px';
                valueSpan.style.color = '#4ecdc4';
                valueSpan.style.fontWeight = 'bold';
                item.appendChild(valueSpan);
            }

            content.appendChild(item);
        });
        panel.appendChild(content);

        // 底部按钮区域（常驻底部）
        const footer = document.createElement('div');
        footer.id = 'configFooter';
        
        const resetBtn = document.createElement('button');
        resetBtn.id = 'resetConfig';
        resetBtn.textContent = '恢复默认';
        resetBtn.style.background = 'linear-gradient(135deg, #888 0%, #aaa 100%)';
        resetBtn.style.color = 'white';
        resetBtn.style.border = 'none';
        resetBtn.style.padding = '10px 20px';
        resetBtn.style.fontSize = '16px';
        resetBtn.style.borderRadius = '8px';
        resetBtn.style.cursor = 'pointer';
        footer.appendChild(resetBtn);

        const closeBtn = document.createElement('button');
        closeBtn.id = 'closeConfig';
        closeBtn.textContent = '关闭';
        closeBtn.style.background = 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';
        closeBtn.style.color = 'white';
        closeBtn.style.border = 'none';
        closeBtn.style.padding = '10px 20px';
        closeBtn.style.fontSize = '16px';
        closeBtn.style.borderRadius = '8px';
        closeBtn.style.cursor = 'pointer';
        footer.appendChild(closeBtn);

        panel.appendChild(footer);

        window.log('[Config] 配置面板已动态生成（按分组显示）');
    },

    bindEvents() {
        const configBtn = document.getElementById('configBtn');
        const configPanel = document.getElementById('configPanel');
        const closeConfig = document.getElementById('closeConfig');

        if (configBtn) {
            configBtn.addEventListener('click', () => {
                configPanel.style.display = 'block';
            });
        }

        if (closeConfig) {
            closeConfig.addEventListener('click', () => {
                configPanel.style.display = 'none';
                this.applyConfig();
            });
        }

        // 为所有range input绑定输入事件
        this.configDefinitions.forEach(def => {
            const input = document.getElementById(def.id);
            const valueSpan = document.getElementById(def.id + 'Value');
            if (input && valueSpan) {
                input.addEventListener('input', (e) => {
                    valueSpan.textContent = e.target.value + def.unit;
                });
            }
        });

        // 绑定"恢复默认"按钮
        const resetConfig = document.getElementById('resetConfig');
        if (resetConfig) {
            resetConfig.addEventListener('click', () => {
                if (confirm('确定恢复所有配置为默认值吗？')) {
                    this.resetToDefault();
                }
            });
        }

        window.log('[Config] 事件绑定完成');
    },

    updateUI() {
        let currentGroup = '';
        this.configDefinitions.forEach(def => {
            const input = document.getElementById(def.id);
            const valueSpan = document.getElementById(def.id + 'Value');
            if (input && window.currentConfig) {
                input.value = window.currentConfig[def.id] || def.default;
                if (valueSpan) {
                    valueSpan.textContent = input.value + def.unit;
                }
            }
        });
    },

    applyConfig() {
        if (!window.currentConfig) {
            window.currentConfig = {};
        }

        this.configDefinitions.forEach(def => {
            const input = document.getElementById(def.id);
            if (input) {
                const value = def.type === 'select' ? input.value : parseFloat(input.value);
                window.currentConfig[def.id] = value;
            }
        });

        window.log('[Config] 配置已应用', window.currentConfig);
        this.saveConfig();
    }
};

window.log('config.js 加载完成');
