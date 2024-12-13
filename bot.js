const fs = require('fs');
const axios = require('axios');
const querystring = require('querystring');
const randomUseragent = require('random-useragent');
const chalk = require('chalk');

// 配置常量
const CONFIG = {
  BASE_URL: "https://memex-preorder.memecore.com",
  SLEEP_INTERVAL: 12 * 60 * 60 * 1000, // 每 12 小时
  QUERY_FILE: "hash.txt", // 存储 query_id 的文件
};

// 获取当前北京时间
function getCurrentTime() {
  const now = new Date(Date.now() + 8 * 60 * 60 * 1000); // 北京时间 UTC+8
  const [year, month, day, hours, minutes, seconds] = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
    String(now.getSeconds()).padStart(2, '0'),
  ];
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// 日志函数
function log(type, message) {
  const timestamp = getCurrentTime();
  let prefix = '';
  let color = chalk.white;

  switch (type) {
    case '信息':
      prefix = 'ℹ️';
      color = chalk.cyan;
      break;
    case '成功':
      prefix = '✅';
      color = chalk.green;
      break;
    case '错误':
      prefix = '❌';
      color = chalk.red;
      break;
    default:
      prefix = 'ℹ️';
      color = chalk.cyan;
  }

  console.log(color(`[${prefix} ${type} ${timestamp}]`) + ' ' + message);
}

// 分界线输出
function logSeparator() {
  const line = '─'.repeat(60);
  console.log(chalk.magenta(line));
}

// 标题输出
function printHeader() {
  const line = '─'.repeat(60);
  const title = "Memex-Bot 自动签到";
  const subtitle = "由脚本自动处理用户签到与SBT领取";

  console.log(chalk.blueBright(line));
  console.log(chalk.blueBright(title.padStart((60 - title.length) / 2 + title.length)));
  console.log(chalk.green(subtitle.padStart((60 - subtitle.length) / 2 + subtitle.length)));
  console.log(chalk.blueBright(line));
}

// 读取 query_id 文件
function getQueryIds() {
  try {
    const content = fs.readFileSync(CONFIG.QUERY_FILE, 'utf8');
    return content.split('\n').map(id => id.trim()).filter(Boolean);
  } catch (err) {
    log('错误', `无法读取 query_id 文件: ${err.message}`);
    return [];
  }
}

// 提取用户名
function extractUsername(queryId) {
  try {
    const params = querystring.parse(queryId);
    const user = JSON.parse(decodeURIComponent(params.user));
    return user.username || "未知用户";
  } catch (err) {
    log('错误', `提取用户名失败: ${err.message}`);
    return "未知用户";
  }
}

// 发送请求
async function sendRequest(url, method = 'GET', headers = {}, data = null) {
  try {
    const options = { method, url, headers };
    if (data) options.data = data;
    const response = await axios(options);
    return response.data;
  } catch (err) {
    log('错误', `请求失败: ${err.message}`);
    return null;
  }
}

// 获取用户信息
async function getUserInfo(queryId, encodedQueryId, userAgent) {
  const headers = {
    Cookie: `telegramInitData=${encodedQueryId}`,
    'x-telegram-init-data': queryId,
    'User-Agent': userAgent,
  };
  return await sendRequest(`${CONFIG.BASE_URL}/public/user`, 'GET', headers);
}

// 检查每日签到状态
async function checkDailyStatus(queryId, encodedQueryId, userAgent) {
  const headers = {
    Cookie: `telegramInitData=${encodedQueryId}`,
    'x-telegram-init-data': queryId,
    'User-Agent': userAgent,
  };
  return await sendRequest(`${CONFIG.BASE_URL}/public/user/daily`, 'GET', headers);
}

// 执行每日签到
async function performCheckIn(queryId, encodedQueryId, userAgent) {
  const headers = {
    Cookie: `telegramInitData=${encodedQueryId}`,
    'x-telegram-init-data': queryId,
    'User-Agent': userAgent,
  };
  const response = await sendRequest(`${CONFIG.BASE_URL}/public/user/daily`, 'POST', headers);
  if (response && response.success) {
    log('成功', `签到成功`);
  } else {
    log('错误', `签到失败`);
  }
}

// 领取 SBT
async function claimSBT(queryId, encodedQueryId, userAgent) {
  const headers = {
    Cookie: `telegramInitData=${encodedQueryId}`,
    'x-telegram-init-data': queryId,
    'User-Agent': userAgent,
  };
  const response = await sendRequest(`${CONFIG.BASE_URL}/schedule/public/user/claim`, 'POST', headers);
  if (response && response.success) {
    log('成功', `成功领取 SBT`);
  } else {
    log('错误', `领取 SBT 失败`);
  }
}

// 主处理函数
async function processUsers(queryIds) {
  for (const queryId of queryIds) {
    const encodedQueryId = querystring.escape(queryId);
    const userAgent = randomUseragent.getRandom();
    const username = extractUsername(queryId);

    logSeparator();
    log('信息', `正在处理用户：${username}`);
    logSeparator();

    const userInfo = await getUserInfo(queryId, encodedQueryId, userAgent);
    if (!userInfo) {
      log('错误', `获取用户 ${username} 信息失败，跳过此用户`);
      continue;
    }

    const { canClaimSBT } = userInfo.user;
    if (!canClaimSBT) {
      log('信息', `尝试为用户 ${username} 领取 SBT`);
      await claimSBT(queryId, encodedQueryId, userAgent);
    } else {
      log('成功', `用户 ${username} 已领取过 SBT`);
    }

    const dailyStatus = await checkDailyStatus(queryId, encodedQueryId, userAgent);
    if (!dailyStatus) {
      log('错误', `获取用户 ${username} 签到状态失败，跳过此用户`);
      continue;
    }

    const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const { fromTime, toTime, content } = dailyStatus;

    const needCheckIn = !content || (!content.includes(today) && today >= fromTime && today <= toTime);
    if (needCheckIn) {
      log('信息', `尝试为用户 ${username} 签到`);
      await performCheckIn(queryId, encodedQueryId, userAgent);
    } else {
      log('成功', `用户 ${username} 今日已完成签到`);
    }
  }
}

// 主入口函数
async function main() {
  printHeader();
  log('信息', `开始读取 query_id 列表...`);

  const queryIds = getQueryIds(CONFIG.QUERY_FILE);
  if (queryIds.length === 0) {
    log('错误', `没有找到任何 query_id，程序退出`);
    return;
  }

  while (true) {
    await processUsers(queryIds);
    log('信息', `所有用户处理完成，程序进入休眠，12小时后将继续运行。`);
    logSeparator();
    await new Promise(res => setTimeout(res, CONFIG.SLEEP_INTERVAL));
  }
}

// 启动主程序
main().catch(err => log('错误', `程序异常：${err.message}`));
