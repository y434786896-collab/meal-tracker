# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 在此仓库中工作时提供指引。

## 项目简介

「咕咕饭记」—— 每日饮食记录微信小程序。记录三餐、拍照、补记历史、统计、随机抽菜推荐。

## 构建与开发命令

```bash
# 微信小程序开发模式（监听文件变化，日常开发用这个）
npm run dev:mp-weixin

# 微信小程序生产构建（上传发布前必须跑一次）
npm run build:mp-weixin

# H5 浏览器开发/构建
npm run dev:h5
npm run build:h5
```

**两个产物目录的分工（重要）：**

| 目录 | 用途 |
|---|---|
| `dist/dev/mp-weixin` | 日常开发，微信开发者工具打开这个目录，watch 模式自动编译 |
| `dist/build/mp-weixin` | 仅供上传发布，**每次上传前必须重新 `npm run build:mp-weixin`**，否则传的是旧代码 |

**注意事项：**
- 同时只能跑**一个** `dev:mp-weixin` 进程——两个 watch 进程同时写 dist 会导致文件竞争损坏（渲染层报错），踩过这个坑
- `vue.config.js` 配置了 copy-webpack-plugin，编译时自动把 `cloudfunctions/` 复制进产物目录，开发者工具才能识别并上传云函数
- 项目未配置测试框架和代码检查工具

## 架构

基于 **uni-app Vue 2**，目标平台为微信小程序和 H5。四个 tabBar 页面定义在 `src/pages.json`：

| 页面 | 功能 | 状态管理 |
|---|---|---|
| **index**（今日） | 当日饮食记录 | Vuex store |
| **random**（吃什么） | 按餐次（全部/早/午/晚/加餐）从历史菜品随机抽 1~5 道 | 直接调 storage.js，本地 computed 过滤 |
| **history**（历史） | 日历查看 + **补记过去日期**（单选日期后点「＋补记」） | 直接调 storage.js |
| **stats**（统计） | 本周/本月统计 | 直接调 storage.js |

### 数据流

```
用户操作 → 组件方法 → Vuex action（首页）或直接导入（其他页）
  → storage.js → 微信云数据库（主）+ localStorage（降级/同步缓存）
```

### 双存储策略（`src/utils/storage.js`）

- **微信小程序**：同时写入云数据库（集合 `meal_records`，按 `_openid` 隔离）和 localStorage（写穿透缓存）。读取优先走云端；云端失败时降级到 localStorage
- **H5 / 非微信环境**：仅使用 localStorage。图片存为临时路径（页面刷新后丢失 — 已知限制）
- 用户标识：通过云函数 `login` 获取 `_openid`（微信静默身份，无需登录页/授权）；降级时使用 `'local_user'`
- **已知限制**：`getRecords()` 有 `limit(1000)` 上限；云端写失败仅 console 记录、用户无感知；常用菜品 `meal_frequent` 只存本地不同步

## 组件说明

- **Calendar.vue** — 月历组件，`multi` prop 控制单选/多选；**未来日期置灰不可选**（`isFuture` 用 YYYY-MM-DD 字符串字典序比较）
- **MealCard.vue** — 按餐次（早/午/晚/加餐）分组展示记录
- **MealInput.vue** — 添加/编辑弹窗；`editRecord` prop 控制编辑模式；`date` prop 用于补记（非编辑模式下顶部显示"补记：日期"提示）；图片选择用 `wx.chooseMedia`（chooseImage 已废弃，勿回退），带 fail 错误提示

## 数据模型

```typescript
// 饮食记录
{
  id: string,           // 生成规则: Date.now().toString(36) + 随机字符
  date: string,         // "YYYY-MM-DD"，必须补零（日历匹配依赖此前缀格式）
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack',
  dishes: string[],     // 菜品名称列表
  note: string,         // 备注，可选
  images: string[],     // 云存储 fileID（微信）或临时路径（H5），最多3张
  createdAt: number     // Date.now()
}
```

## 微信云开发配置

- **AppID**：`wx51a25666a6d80600`
- **云环境 ID**：`cloudbase-d8gti2kuiecb16b90`（付费套餐，过期会停服）
- **云函数**：`cloudfunctions/login/` — 返回用户 openid；在开发者工具中右键「上传并部署：云端安装依赖」
- **数据库集合**：`meal_records` — 权限必须为「仅创建者可读写」（openid 隔离的前提）
- **云存储目录**：`meal-images/`
- 删除记录时会同步删除云存储中的图片（`wx.cloud.deleteFile`）

## 平台合规备忘

- **隐私指引已声明**：摄像头权限、选中的照片或视频信息（chooseMedia 必需，否则报 `api scope is not declared`）；**用多少声明多少，勿多加**
- 所有用户内容仅本人可见，**不属于** UGC 场景，无需做用户生成内容声明
- 若将来加 AI 图片识别（热量估算），需：① 隐私指引补第三方 SDK/信息共享声明 ② 调用密钥必须放云函数环境变量
- 若将来加分享/社区功能，需补 UGC 声明并接入 `msgSecCheck` / `mediaCheckAsync` 内容安全接口

## 已踩过的坑（勿重蹈）

1. **数字 v-for 在小程序端从 0 开始**：`v-for="day in 30"` 会渲染 0~29。Calendar 已改用显式数组（`dayList`/`emptyList` computed），新代码禁止用数字 v-for
2. **改完 src 没重新编译**：开发者工具跑的是 dist 产物，不编译不生效
3. **云函数/集合不在代码里创建**：控制台手动建集合、开发者工具右键部署云函数
4. tab 图标由 `node scripts/gen-tab-icons.js` 生成（纯 Node PNG 编码器，无依赖）

## 样式规范

- 所有 CSS 使用 `rpx` 单位（uni-app 响应式像素），不使用 `px` 或 `rem`
- 主色：`#4CAF50`（绿色）
- 所有样式使用 scoped（`<style lang="scss" scoped>`）
