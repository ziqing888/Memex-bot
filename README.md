# Memex-bot
Memex 自动化签到工具

这是一个使用 Node.js 编写的自动化签到脚本，可用于 Memex 平台执行以下任务：
1. 自动签到。
2. 自动领取 SBT（如果账户符合条件）。
3. 定时循环，按固定间隔（12小时）重复任务。

---

## 功能特点

- **自动签到**：检查每日签到状态并自动完成签到。
- **SBT 领取**：判断账户是否符合领取条件，并自动领取 SBT。
- **定时循环**：每隔 12 小时重复任务，支持多账户处理。
- **彩色日志输出**：显示任务状态，便于监控。

---

## 使用要求

- Node.js (>= 14.0.0)
- 必要依赖：
  - `axios`
  - `chalk`
  - `random-useragent`

---

## 安装与运行

### 1. 克隆项目
```bash
git clone https://github.com/ziqing888/Memex-bot.git
cd Memex-bot
```
### 安装依赖
```
npm install
```
###  准备 hash.txt
将用户的 query_id 保存到项目根目录下的 hash.txt 文件中，每行一个，示例如下：
🔑 配置 QueryID
项目需要 queryIds（用户标识符）文件来模拟用户操作。请在项目目录中创建一个 queries.txt 文件

🔑 获取 QueryID
如果你在使用 Telegram WebApp，可以通过以下步骤获取 QueryID：

打开你的 Telegram WebApp。
按 F12 打开开发者工具，切换到 Console 面板。
输入以下命令以获取 initData：
```
copy(Telegram.WebApp.initData)
```
```
user=eyJ1c2VybmFtZSI6InVzZXIxMjMiLCJpZCI6MTIzfQ==
user=eyJ1c2VybmFtZSI6InVzZXIyMzQiLCJpZCI6MjM0fQ==
```
运行脚本
```
npm start
```
