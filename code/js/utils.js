// utils.js - 常量定义和工具函数
// 依赖: 无
// 版本: v3.2.0-build20260527-1030 FORCE REFRESH

// ==================== 游戏常量 ====================
window.CONFIG = {
    CABINET_WIDTH: 3.2,      // 机柜宽度（内部有效空间）
    CABINET_DEPTH: 3.2,      // 机柜深度（内部有效空间）
    CABINET_HEIGHT: 4.5,     // 机柜高度
    DOLL_SIZE: 0.5,         // 娃娃默认大小
    DOLL_COUNT: 5,           // 娃娃数量
    CLAW_COLLISION_RADIUS: 0.8, // 爪子碰撞半径（爪子放大后同步增大）
    ROPE_LENGTH: 1.5,         // 绳子长度
    GROUND_Y: 0.0             // 地面高度（机箱底部 Y 坐标）
};

// 游戏状态枚举
window.GameState = {
    IDLE: 'idle',
    DESCENDING: 'descending',
    GRABBING: 'grabbing',
    ASCENDING: 'ascending',
    ASCEND_DONE: 'ascend_done',
    MOVING_TO_EXIT: 'moving_to_exit',
    DROPPING: 'dropping',
    GAME_OVER: 'game_over'
};

// ==================== 工具函数 ====================
// 限制数值范围
function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

// 线性插值
function lerp(a, b, t) {
    return a + (b - a) * t;
}

// 随机数
function randomRange(min, max) {
    return min + Math.random() * (max - min);
}

// 日志等级：0=无 1=错误 2=警告 3=信息 4=调试
const LOG_LEVEL = { NONE: 0, ERROR: 1, WARN: 2, INFO: 3, DEBUG: 4 };

// 全局调试日志数组（用于导出独立日志文件）
window.debugLog = [];

// 日志输出（支持等级）
// 用法：log(level, module, message) 或兼容旧格式 log(message)
function log(level, module, message) {
    // 兼容旧格式：log(message) 或 log(module, message)
    if (arguments.length === 1) {
        message = level;
        level = LOG_LEVEL.INFO;
        module = 'Utils';
    } else if (arguments.length === 2) {
        message = module;
        module = level;
        level = LOG_LEVEL.INFO;
    }

    // 从配置读取日志等级（默认INFO=3）
    const config = window.currentConfig || {};
    const currentLevel = config.logLevel != null ? config.logLevel : LOG_LEVEL.INFO;

    if (level <= currentLevel) {
        const prefix = level <= LOG_LEVEL.ERROR ? '❌' : level <= LOG_LEVEL.WARN ? '⚠️' : level <= LOG_LEVEL.INFO ? 'ℹ️' : '🔧';
        const fullMsg = `${prefix} [${module}] ${message}`;
        console.log(fullMsg);

        // 同时保存到 debugLog 数组
        const time = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        window.debugLog.push(`[${time}] ${fullMsg}`);
    }
}

// 下载调试日志为独立文件
window.downloadDebugLog = function() {
    if (!window.debugLog || window.debugLog.length === 0) {
        console.log('[Utils] 暂无调试日志可下载');
        return;
    }
    const content = window.debugLog.join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const now = new Date();
    const ts = `${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2,'0')}${now.getDate().toString().padStart(2,'0')}_${now.getHours().toString().padStart(2,'0')}${now.getMinutes().toString().padStart(2,'0')}${now.getSeconds().toString().padStart(2,'0')}`;
    a.download = `claw_machine_debug_${ts}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    console.log('[Utils] 调试日志已下载，共 ' + window.debugLog.length + ' 条');
};

window.LOG_LEVEL = LOG_LEVEL;
window.log = log;

window.log = log;
window.clamp = clamp;
window.lerp = lerp;

log('utils.js 加载完成');
