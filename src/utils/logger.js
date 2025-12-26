import fs from 'fs';
import path from 'path';
import { getDataDir } from './paths.js';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

// 日志配置
const LOG_DIR = path.join(getDataDir(), 'logs');
const LOG_RETENTION_DAYS = 7;
const MAX_LOG_LINES = 10000; // 前端查看时最多返回的行数

// 确保日志目录存在
function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

// 获取当天日志文件路径
function getLogFilePath() {
  const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  return path.join(LOG_DIR, `${date}.log`);
}

// 写入日志到文件
function writeToFile(level, message) {
  try {
    ensureLogDir();
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;
    fs.appendFileSync(getLogFilePath(), logLine);
  } catch (error) {
    // 文件写入失败时静默处理，避免影响主程序
  }
}

// 清理过期日志文件
function cleanOldLogs() {
  try {
    ensureLogDir();
    const files = fs.readdirSync(LOG_DIR);
    const now = Date.now();
    const retentionMs = LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000;

    files.forEach(file => {
      if (!file.endsWith('.log')) return;

      const filePath = path.join(LOG_DIR, file);
      const stat = fs.statSync(filePath);

      if (now - stat.mtime.getTime() > retentionMs) {
        fs.unlinkSync(filePath);
        console.log(`已删除过期日志: ${file}`);
      }
    });
  } catch (error) {
    // 清理失败时静默处理
  }
}

// 读取日志文件（供API使用）
export function readLogs(date = null, lines = 500) {
  try {
    ensureLogDir();

    if (date) {
      // 读取指定日期的日志
      const filePath = path.join(LOG_DIR, `${date}.log`);
      if (!fs.existsSync(filePath)) {
        return { success: true, data: [], message: '该日期无日志' };
      }
      const content = fs.readFileSync(filePath, 'utf-8');
      const logLines = content.trim().split('\n').slice(-Math.min(lines, MAX_LOG_LINES));
      return { success: true, data: logLines };
    } else {
      // 读取今天的日志
      const filePath = getLogFilePath();
      if (!fs.existsSync(filePath)) {
        return { success: true, data: [], message: '今日暂无日志' };
      }
      const content = fs.readFileSync(filePath, 'utf-8');
      const logLines = content.trim().split('\n').slice(-Math.min(lines, MAX_LOG_LINES));
      return { success: true, data: logLines };
    }
  } catch (error) {
    return { success: false, message: error.message };
  }
}

// 获取可用的日志文件列表
export function getLogFiles() {
  try {
    ensureLogDir();
    const files = fs.readdirSync(LOG_DIR)
      .filter(f => f.endsWith('.log'))
      .sort()
      .reverse(); // 最新的在前
    return { success: true, data: files };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

function formatArgs(args) {
  return args.map(arg => {
    if (typeof arg === 'object') {
      try {
        return JSON.stringify(arg);
      } catch {
        return String(arg);
      }
    }
    return String(arg);
  }).join(' ');
}

function logMessage(level, ...args) {
  const timestamp = new Date().toLocaleTimeString('zh-CN', { hour12: false });
  const color = { info: colors.green, warn: colors.yellow, error: colors.red }[level];
  console.log(`${colors.gray}${timestamp}${colors.reset} ${color}[${level}]${colors.reset}`, ...args);

  // 写入文件
  writeToFile(level, formatArgs(args));
}

function logRequest(method, path, status, duration) {
  const statusColor = status >= 500 ? colors.red : status >= 400 ? colors.yellow : colors.green;
  console.log(`${colors.cyan}[${method}]${colors.reset} - ${path} ${statusColor}${status}${colors.reset} ${colors.gray}${duration}ms${colors.reset}`);

  // 写入文件
  writeToFile('request', `[${method}] ${path} ${status} ${duration}ms`);
}

// 启动时清理过期日志
cleanOldLogs();

// 每天定时清理（每24小时检查一次）
setInterval(cleanOldLogs, 24 * 60 * 60 * 1000);

export const log = {
  info: (...args) => logMessage('info', ...args),
  warn: (...args) => logMessage('warn', ...args),
  error: (...args) => logMessage('error', ...args),
  request: logRequest
};

export default log;
