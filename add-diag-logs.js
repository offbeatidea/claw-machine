// add-diag-logs.js - 在 setupJoystick 中插入诊断日志
const fs = require('fs');
const filePath = 'code/js/main.js';
let content = fs.readFileSync(filePath, 'utf8');

const oldCode = `    const joystickThumb = document.getElementById('joystickThumb');

    // 初始化：确保摇杆拇指在底座中心`;

const newCode = `    const joystickThumb = document.getElementById('joystickThumb');

    // ========== 诊断日志：摇杆布局检测 ==========
    const btnGrab = document.getElementById('btnGrab');
    const screenW = window.innerWidth;
    const screenH = window.innerHeight;
    const areaRect = joystickArea.getBoundingClientRect();
    const baseRect = joystickBase.getBoundingClientRect();
    const thumbRect = joystickThumb.getBoundingClientRect();
    const btnRect = btnGrab.getBoundingClientRect();

    console.group('%c[诊断] 摇杆 + 按钮布局', 'color: #ff0; font-weight: bold;');
    console.log('屏幕尺寸:', screenW, 'x', screenH);
    console.log('--- joystickArea (底座容器) ---');
    console.log('  CSS声明:', getComputedStyle(joystickArea).width, 'x', getComputedStyle(joystickArea).height);
    console.log('  getBoundingClientRect:', JSON.stringify({x:areaRect.x, y:areaRect.y, width:areaRect.width, height:areaRect.height, left:areaRect.left, top:areaRect.top, right:areaRect.right, bottom:areaRect.bottom}));
    console.log('  offsetLeft:', joystickArea.offsetLeft, 'offsetTop:', joystickArea.offsetTop);
    console.log('  computed position:', getComputedStyle(joystickArea).position);
    console.log('--- joystickBase (底座) ---');
    console.log('  CSS声明:', getComputedStyle(joystickBase).width, 'x', getComputedStyle(joystickBase).height);
    console.log('  getBoundingClientRect:', JSON.stringify({x:baseRect.x, y:baseRect.y, width:baseRect.width, height:baseRect.height, left:baseRect.left, top:baseRect.top, right:baseRect.right, bottom:baseRect.bottom}));
    console.log('  offsetLeft:', joystickBase.offsetLeft, 'offsetTop:', joystickBase.offsetTop);
    console.log('  computed position:', getComputedStyle(joystickBase).position);
    console.log('  computed left:', getComputedStyle(joystickBase).left);
    console.log('  computed top:', getComputedStyle(joystickBase).top);
    console.log('  computed transform:', getComputedStyle(joystickBase).transform);
    console.log('--- joystickThumb (拇指) ---');
    console.log('  CSS声明:', getComputedStyle(joystickThumb).width, 'x', getComputedStyle(joystickThumb).height);
    console.log('  getBoundingClientRect:', JSON.stringify({x:thumbRect.x, y:thumbRect.y, width:thumbRect.width, height:thumbRect.height, left:thumbRect.left, top:thumbRect.top}));
    console.log('  computed left:', getComputedStyle(joystickThumb).left);
    console.log('  computed top:', getComputedStyle(joystickThumb).top);
    console.log('  computed transform:', getComputedStyle(joystickThumb).transform);
    console.log('--- btnGrab (抓取按钮) ---');
    console.log('  CSS声明:', getComputedStyle(btnGrab).width, 'x', getComputedStyle(btnGrab).height);
    console.log('  getBoundingClientRect:', JSON.stringify({x:btnRect.x, y:btnRect.y, width:btnRect.width, height:btnRect.height, left:btnRect.left, top:btnRect.top, right:btnRect.right, bottom:btnRect.bottom}));
    console.log('  offsetLeft:', btnGrab.offsetLeft, 'offsetTop:', btnGrab.offsetTop);
    console.log('--- 对称性检查 ---');
    const areaCenterX = areaRect.left + areaRect.width / 2;
    const btnCenterX = btnRect.left + btnRect.width / 2;
    const distFromLeft = areaCenterX;
    const distFromRight = screenW - btnCenterX;
    console.log('  Area中心X:', areaCenterX, '  Button中心X:', btnCenterX);
    console.log('  Area距左边缘:', areaCenterX, '  Button距右边缘:', distFromRight);
    console.log('  底部对齐? Area bottom:', areaRect.bottom, '  Button bottom:', btnRect.bottom);
    const thumbCenterX = thumbRect.left + thumbRect.width / 2;
    const baseCenterX = baseRect.left + baseRect.width / 2;
    const thumbCenterY = thumbRect.top + thumbRect.height / 2;
    const baseCenterY = baseRect.top + baseRect.height / 2;
    console.log('  thumb是否在base中心? X偏移:', (thumbCenterX - baseCenterX).toFixed(1) + 'px', 'Y偏移:', (thumbCenterY - baseCenterY).toFixed(1) + 'px');
    console.log('  thumb活动范围(maxDistance):', (baseRect.width / 2 - thumbRect.width / 2).toFixed(1) + 'px');
    console.log('  摇杆底座是否等于摇杆容器?', areaRect.width === baseRect.width && areaRect.height === baseRect.height ? 'YES' : 'NO');
    console.groupEnd();
    // ========== 诊断日志结束 ==========

    // 初始化：确保摇杆拇指在底座中心`;

if (content.includes(oldCode)) {
    content = content.replace(oldCode, newCode);
    fs.writeFileSync(filePath, content);
    console.log('诊断日志插入成功');
} else {
    console.error('未找到目标代码，可能已存在日志或代码已变更');
    // 尝试模糊匹配
    const idx = content.indexOf("const joystickThumb = document.getElementById('joystickThumb');");
    if (idx !== -1) {
        console.log('找到 joystickThumb 声明在行:', content.substring(0, idx).split('\n').length);
        console.log('后面50个字符:', JSON.stringify(content.substring(idx, idx + 100)));
    }
}
