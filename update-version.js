#!/usr/bin/env node
/**
 * 版本同步脚本 - 读取 version.json 并更新所有文件中的版本号
 * 
 * 使用方法：
 *   node update-version.js           # 自动递增 patch 版本号并更新所有文件
 *   node update-version.js --major   # 递增 major 版本号
 *   node update-version.js --minor   # 递增 minor 版本号
 *   node update-version.js --patch   # 递增 patch 版本号（默认）
 *   node update-version.js --build   # 仅更新 build 时间戳
 *   node update-version.js --set v3.3.1-build20260531a  # 设置指定版本号
 */

const fs = require('fs');
const path = require('path');

const VERSION_FILE = path.join(__dirname, 'version.json');
const HTML_FILE = path.join(__dirname, 'index.html');
const MAIN_JS_FILE = path.join(__dirname, 'code', 'js', 'main.js');
const CONFIG_JS_FILE = path.join(__dirname, 'code', 'js', 'config.js');
const STYLE_CSS_FILE = path.join(__dirname, 'code', 'css', 'style.css');

// 读取版本文件
function readVersion() {
    const data = fs.readFileSync(VERSION_FILE, 'utf8');
    return JSON.parse(data);
}

// 写入版本文件
function writeVersion(version) {
    fs.writeFileSync(VERSION_FILE, JSON.stringify(version, null, 2), 'utf8');
    console.log(`[Version] 已更新 ${VERSION_FILE}`);
}

// 递增版本号
function incrementVersion(version, type = 'patch') {
    if (type === 'major') {
        version.major++;
        version.minor = 0;
        version.patch = 0;
    } else if (type === 'minor') {
        version.minor++;
        version.patch = 0;
    } else if (type === 'patch') {
        version.patch++;
    }
    
    // 更新 build 时间戳
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const randomChar = String.fromCharCode(97 + Math.floor(Math.random() * 26)); // a-z
    version.build = `${dateStr}${randomChar}`;
    version.date = now.toISOString().split('T')[0];
    
    // 更新完整版本字符串
    version.full = `v${version.major}.${version.minor}.${version.patch}-build${version.build}`;
    version.cache = version.build;
    
    return version;
}

// 设置指定版本号
function setVersion(version, versionStr) {
    // 解析版本字符串：v3.3.1-build20260531a
    const match = versionStr.match(/v(\d+)\.(\d+)\.(\d+)-build(.+)/);
    if (!match) {
        console.error('[Version] 版本字符串格式错误，应为 v3.3.1-build20260531a');
        process.exit(1);
    }
    
    version.major = parseInt(match[1]);
    version.minor = parseInt(match[2]);
    version.patch = parseInt(match[3]);
    version.build = match[4];
    version.full = versionStr;
    version.cache = match[4];
    version.date = new Date().toISOString().split('T')[0];
    
    return version;
}

// 更新 HTML 文件中的版本号
function updateHTML(version) {
    let content = fs.readFileSync(HTML_FILE, 'utf8');
    
    // 更新 CSS 版本号
    content = content.replace(/(style\.css\?v=)[^\s'"]+/g, `$1${version.cache}`);
    
    // 更新 JS 版本号
    content = content.replace(/(js\/\w+\.js\?v=)[^\s'"]+/g, `$1${version.cache}`);
    
    // 更新 HTML 中的版本日志
    content = content.replace(/(console\.log\('%c\[HTML\] ).*? - /g, `$1${version.full} - `);
    
    fs.writeFileSync(HTML_FILE, content, 'utf8');
    console.log(`[Version] 已更新 ${HTML_FILE}`);
}

// 更新 main.js 中的版本号
function updateMainJS(version) {
    let content = fs.readFileSync(MAIN_JS_FILE, 'utf8');
    
    // 更新版本日志注释
    content = content.replace(/(console\.log\('%c\[Main\] ).*? - /g, `$1${version.full} - `);
    
    // 更新初始化日志
    content = content.replace(/(\[Main\] 初始化抓娃娃机 ).*?(?=\.\.\.)/g, `$1${version.full}`);
    
    fs.writeFileSync(MAIN_JS_FILE, content, 'utf8');
    console.log(`[Version] 已更新 ${MAIN_JS_FILE}`);
}

// 更新 config.js 中的版本号（如有）
function updateConfigJS(version) {
    if (!fs.existsSync(CONFIG_JS_FILE)) return;
    
    let content = fs.readFileSync(CONFIG_JS_FILE, 'utf8');
    
    // 如果有版本日志，则更新
    content = content.replace(/(console\.log\('%c\[Config\] ).*? - /g, `$1${version.full} - `);
    
    fs.writeFileSync(CONFIG_JS_FILE, content, 'utf8');
    console.log(`[Version] 已更新 ${CONFIG_JS_FILE}`);
}

// 更新 style.css 中的版本号（如有）
function updateStyleCSS(version) {
    if (!fs.existsSync(STYLE_CSS_FILE)) return;
    
    let content = fs.readFileSync(STYLE_CSS_FILE, 'utf8');
    
    // 如果有版本日志，则更新
    content = content.replace(/(console\.log\('%c\[CSS\] ).*? - /g, `$1${version.full} - `);
    
    fs.writeFileSync(STYLE_CSS_FILE, content, 'utf8');
    console.log(`[Version] 已更新 ${STYLE_CSS_FILE}`);
}

// 主函数
function main() {
    const args = process.argv.slice(2);
    
    let version = readVersion();
    const oldVersion = version.full;
    
    if (args.includes('--set')) {
        const idx = args.indexOf('--set');
        const versionStr = args[idx + 1];
        version = setVersion(version, versionStr);
    } else if (args.includes('--major')) {
        version = incrementVersion(version, 'major');
    } else if (args.includes('--minor')) {
        version = incrementVersion(version, 'minor');
    } else if (args.includes('--build')) {
        const now = new Date();
        const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
        const randomChar = String.fromCharCode(97 + Math.floor(Math.random() * 26));
        version.build = `${dateStr}${randomChar}`;
        version.cache = version.build;
        version.full = `v${version.major}.${version.minor}.${version.patch}-build${version.build}`;
    } else {
        // 默认递增 patch
        version = incrementVersion(version, 'patch');
    }
    
    writeVersion(version);
    updateHTML(version);
    updateMainJS(version);
    updateConfigJS(version);
    updateStyleCSS(version);
    
    console.log(`\n[Version] 版本更新完成：${oldVersion} → ${version.full}`);
    console.log(`[Version] 请编辑 ${VERSION_FILE} 中的 changes 字段，记录本次变更内容`);
}

main();
