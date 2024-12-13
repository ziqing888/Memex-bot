const fs = require('fs');
const axios = require('axios');
const querystring = require('querystring');
const randomUseragent = require('random-useragent');

// 配置
const CONFIG = {
  BASE_URL: "https://memex-preorder.memecore.com",
  SLEEP_INTERVAL: 12 * 60 * 60 * 1000, // 每 12 小时
  QUERY_FILE: "hash.txt", // 存储 query_id 的文件
};

// 获取当前北京时间
const getCurrentTime = () => {
  const now = new Date();
  now.setTime(now.getTime() + 8 * 60 * 60 * 1000); // 调整为 UTC+8 时区
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

// 日志工具
const log = (type, message) => {
  const timestamp = getCurrentTime(); // 获取北京时间
  const logColors = {
    信息: '\x1b[34m', // 蓝色
    成功: '\x1b[32m', // 绿色
    错误: '\x1b[31m', // 红色
    重置: '\x1b[0m',  // 重置颜色
  };

  console.log(`${logColors[type] || logColors.信息}[${type} ${timestamp}] ${message}${logColors.重置}`);
};

// 读取 query_id 文件
const getQueryIds = () => {
  try {
    const content = fs.readFileSync(CONFIG.QUERY_FILE, 'utf8');
    return content.split('\n').map(id => id.trim()).filter(Boolean);
  } catch (err) {
    log('错误', `无法读取 query_id 文件: ${err.message}`);
    return [];
  }
};

// 提取用户名
const extractUsername = (queryId) => {
  try {
    const params = querystring.parse(queryId);
    const user = JSON.parse(decodeURIComponent(params.user));
    return user.username || "未知用户";
  } catch (err) {
    log('错误', `提取用户名失败: ${err.message}`);
    return "未知用户";
  }
};

// API 请求工具
const sendRequest = async (url, method = 'GET', headers = {}, data = {}) => {
  try {
    const options = { method, url, headers, data };
    const response = await axios(options);
    return response.data;
  } catch (err) {
    log('错误', `请求失败：${err.message}`);
    return null;
  }
};

// 获取用户信息
const getUserInfo = async (queryId, encodedQueryId, userAgent) => {
  const headers = {
    Cookie: `telegramInitData=${encodedQueryId}`,
    'x-telegram-init-data': queryId,
    'User-Agent': userAgent,
  };
  return await sendRequest(`${CONFIG.BASE_URL}/public/user`, 'GET', headers);
};

// 检查每日状态
const checkDailyStatus = async (queryId, encodedQueryId, userAgent) => {
  const headers = {
    Cookie: `telegramInitData=${encodedQueryId}`,
    'x-telegram-init-data': queryId,
    'User-Agent': userAgent,
  };
  return await sendRequest(`${CONFIG.BASE_URL}/public/user/daily`, 'GET', headers);
};

// 执行每日签到
const performCheckIn = async (queryId, encodedQueryId, userAgent) => {
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
};

// 领取 SBT
const claimSBT = async (queryId, encodedQueryId, userAgent) => {
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
};

// 主逻辑
const main = async () => {
  log('信息', `开始读取 query_id 列表...`);
  const queryIds = getQueryIds();

  if (queryIds.length === 0) {
    log('错误', `没有找到任何 query_id，程序退出`);
    return;
  }

  while (true) {
    for (const queryId of queryIds) {
      const encodedQueryId = querystring.escape(queryId);
      const userAgent = randomUseragent.getRandom();
      const username = extractUsername(queryId);

      log('信息', `正在处理用户：${username}`);

      const userInfo = await getUserInfo(queryId, encodedQueryId, userAgent);
      if (!userInfo) continue;

      const { canClaimSBT } = userInfo.user;

      if (!canClaimSBT) {
        log('信息', `尝试为用户 ${username} 领取 SBT`);
        await claimSBT(queryId, encodedQueryId, userAgent);
      } else {
        log('成功', `用户 ${username} 已领取过 SBT`);
      }

      const dailyStatus = await checkDailyStatus(queryId, encodedQueryId, userAgent);
      if (!dailyStatus) continue;

      const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const { fromTime, toTime, content } = dailyStatus;

      if (!content || (!content.includes(today) && today >= fromTime && today <= toTime)) {
        log('信息', `尝试为用户 ${username} 签到`);
        await performCheckIn(queryId, encodedQueryId, userAgent);
      } else {
        log('成功', `用户 ${username} 今日已完成签到`);
      }
    }

    log('信息', `所有用户处理完成，程序进入休眠，12小时后将继续运行。`);
    await new Promise(res => setTimeout(res, CONFIG.SLEEP_INTERVAL));
  }
};

// 启动主程序
main().catch(err => log('错误', `程序异常：${err.message}`));
