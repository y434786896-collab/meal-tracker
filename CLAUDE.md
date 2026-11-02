# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 在此仓库中工作时提供指引。

## 构建与开发命令

```bash
# 微信小程序开发模式（监听文件变化）
npm run dev:mp-weixin

# 微信小程序生产构建
npm run build:mp-weixin

# H5 浏览器开发模式（dev server）
npm run dev:h5

# H5 浏览器生产构建
npm run build:h5
```

构建产物输出到 `dist/dev/`（开发）或 `dist/build/`（生产）。微信小程序需用微信开发者工具打开 `dist/dev/mp-weixin` 目录预览。

项目未配置测试框架和代码检查工具。

## 架构

本项目基于 **uni-app Vue 2**，目标平台为微信小程序和 H5。三个 tabBar 页面定义在 `src/pages.json`：

- **index**（今日）— 当日饮食记录，使用 Vuex 管理状态
- **history**（历史）— 日历视图，支持单选/多选日期查看记录，直接调用 storage.js
- **stats**（统计）— 本周/本月饮食统计，直接调用 storage.js

### 数据流

```
用户操作 → 组件方法 → Vuex action（首页）或直接导入（历史/统计页）
  → storage.js → 微信云数据库（主）+ localStorage（降级/同步缓存）
```

只有首页使用 Vuex store。历史页和统计页直接导入 storage 函数，自行管理组件内状态。

### 双存储策略（`src/utils/storage.js`）

- **微信小程序**：同时写入云数据库（集合 `meal_records`，按 `_openid` 隔离）和 localStorage（写穿透缓存）。读取优先走云端；云端失败时降级到 localStorage。
- **H5 / 非微信环境**：仅使用 localStorage。图片存为临时路径（页面刷新后丢失 — 已知限制）。
- 云环境 ID：`cloudbase-d8gti2kuiecb16b90`
- 用户标识：通过云函数 `login` 获取 `_openid`；降级时使用 `'local_user'`

### 组件说明

- **Calendar.vue** — 月历组件，`multi` prop 控制单选/多选模式
- **MealCard.vue** — 按餐次（早/午/晚/加餐）分组展示记录
- **MealInput.vue** — 添加/编辑记录的弹窗表单；`editRecord` prop 控制编辑模式；处理图片上传至云存储

### 数据模型

```typescript
// 饮食记录
{
  id: string,           // 生成规则: Date.now().toString(36) + 随机字符
  date: string,         // "YYYY-MM-DD"
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack',
  dishes: string[],     // 菜品名称列表
  note: string,         // 备注，可选
  images: string[],     // 云存储 fileID（微信）或临时路径（H5），最多3张
  createdAt: number     // Date.now()
}
```

## 微信云开发配置

- **AppID**：`wx51a25666a6d80600`
- **云函数**：`cloudfunctions/login/` — 返回用户 openid，需通过微信开发者工具上传部署
- **数据库集合**：`meal_records` — 需在云开发控制台手动创建
- **云存储目录**：`meal-images/` — 存放上传的饮食照片
- 删除记录时会同步删除云存储中的图片（`wx.cloud.deleteFile`）

## 样式规范

- 所有 CSS 使用 `rpx` 单位（uni-app 响应式像素），不使用 `px` 或 `rem`
- 主色：`#4CAF50`（绿色）
- 所有样式使用 scoped（`<style lang="scss" scoped>`）
