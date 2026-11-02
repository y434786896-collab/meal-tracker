<template>
  <view class="page-random">
    <view class="random-header">
      <text class="random-title">🎲 今天吃什么？</text>
      <text class="random-subtitle">从你的历史菜品里随机抽</text>
    </view>

    <view class="random-panel">
      <!-- 餐次选择 -->
      <text class="random-label">抽哪一餐</text>
      <view class="random-type-row">
        <view
          class="random-type-btn"
          :class="{ 'random-type-btn-active': mealType === t.value }"
          v-for="t in mealTypes"
          :key="t.value"
          @tap="onTypeChange(t.value)"
        >
          <text class="random-type-icon">{{ t.icon }}</text>
          <text class="random-type-text">{{ t.label }}</text>
        </view>
      </view>

      <!-- 数量选择 -->
      <text class="random-label random-label-gap">随机几道菜</text>
      <view class="random-count-row">
        <view
          class="random-count-btn"
          :class="{ 'random-count-btn-active': count === n }"
          v-for="n in [1, 2, 3, 4, 5]"
          :key="n"
          @tap="count = n"
        >
          <text>{{ n }}</text>
        </view>
      </view>
    </view>

    <!-- 结果区 -->
    <view class="random-results" v-if="results.length > 0">
      <view class="random-result-card" v-for="(dish, idx) in results" :key="idx">
        <text class="random-result-text">{{ dish }}</text>
      </view>
    </view>

    <!-- 空状态 -->
    <view class="random-empty" v-else-if="!loading && pool.length === 0">
      <text class="random-empty-icon">🍽️</text>
      <text class="random-empty-text">还没有「{{ currentTypeLabel }}」的历史菜品</text>
      <text class="random-empty-sub">先去「今日」记几顿饭再来吧</text>
    </view>

    <!-- 提示：可选菜品不足 -->
    <text class="random-pool-hint" v-if="pool.length > 0 && pool.length < count">
      「{{ currentTypeLabel }}」历史菜品共 {{ pool.length }} 道，不足时全部展示
    </text>

    <!-- 随机按钮 -->
    <view
      class="random-roll-btn"
      :class="{ 'random-roll-btn-disabled': pool.length === 0 }"
      @tap="roll"
    >
      <text>{{ rolling ? '抽取中...' : (results.length > 0 ? '换一批' : '开始随机') }}</text>
    </view>
  </view>
</template>

<script>
import { getRecords } from '../../utils/storage'

export default {
  name: 'PageRandom',
  data() {
    return {
      count: 2,          // 用户选择的随机数量（1~5）
      mealType: 'all',   // 当前选中的餐次
      mealTypes: [
        { value: 'all', label: '全部', icon: '🍽️' },
        { value: 'breakfast', label: '早餐', icon: '🌅' },
        { value: 'lunch', label: '午餐', icon: '☀️' },
        { value: 'dinner', label: '晚餐', icon: '🌙' },
        { value: 'snack', label: '加餐', icon: '🍪' }
      ],
      records: [],       // 全部历史记录（菜品池按餐次在 computed 中过滤）
      results: [],       // 当前展示的结果
      rolling: false,    // 滚动动画中
      loading: true
    }
  },
  computed: {
    /** 按选中餐次过滤、去重后的菜品池 */
    pool() {
      const set = new Set()
      this.records.forEach(r => {
        if (this.mealType !== 'all' && r.mealType !== this.mealType) return
        (r.dishes || []).forEach(d => {
          const name = (d || '').trim()
          if (name) set.add(name)
        })
      })
      return Array.from(set)
    },
    currentTypeLabel() {
      const t = this.mealTypes.find(m => m.value === this.mealType)
      return t ? t.label : '全部'
    }
  },
  onShow() { this.loadRecords() },
  methods: {
    async loadRecords() {
      this.loading = true
      try {
        this.records = await getRecords()
      } catch (e) {
        console.error('加载历史菜品失败', e)
      }
      this.loading = false
    },

    onTypeChange(value) {
      if (this.mealType === value) return
      this.mealType = value
      this.results = [] // 切换餐次后清空旧结果，避免误导
    },

    /** 带滚动动画的随机抽取 */
    roll() {
      if (this.rolling) return
      if (this.pool.length === 0) {
        uni.showToast({ title: '这个餐次还没有历史菜品', icon: 'none' })
        return
      }
      const n = Math.min(this.count, this.pool.length)
      this.rolling = true
      let ticks = 0
      const timer = setInterval(() => {
        this.results = this.sample(n)
        if (++ticks >= 10) {
          clearInterval(timer)
          this.rolling = false
        }
      }, 80)
    },

    /** 不放回随机抽样 n 道 */
    sample(n) {
      const arr = [...this.pool]
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp
      }
      return arr.slice(0, n)
    }
  }
}
</script>

<style lang="scss" scoped>
.page-random {
  min-height: 100vh; padding: 24rpx 30rpx;
  /* 给底部固定按钮留出空间（按钮高度 + 上下间距 + 安全区） */
  padding-bottom: calc(96rpx + 60rpx + env(safe-area-inset-bottom));
  display: flex; flex-direction: column;
}

.random-header { text-align: center; padding: 40rpx 0 30rpx; }
.random-title { display: block; font-size: 40rpx; font-weight: 600; color: #333; }
.random-subtitle { display: block; font-size: 24rpx; color: #999; margin-top: 10rpx; }

/* 面板 */
.random-panel {
  background: #fff; border-radius: 16rpx; padding: 24rpx 30rpx;
  box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.05); margin-bottom: 24rpx;
}
.random-label { display: block; font-size: 26rpx; color: #666; margin-bottom: 20rpx; }
.random-label-gap { margin-top: 28rpx; }

/* 餐次选择 */
.random-type-row { display: flex; }
.random-type-btn {
  flex: 1; display: flex; flex-direction: column; align-items: center;
  padding: 14rpx 0; margin-right: 12rpx;
  background: #f5f5f5; border-radius: 12rpx;
  border: 2rpx solid transparent;
}
.random-type-btn:last-child { margin-right: 0; }
.random-type-btn-active { background: #f0f9f0; border-color: #4CAF50; }
.random-type-icon { font-size: 36rpx; margin-bottom: 4rpx; }
.random-type-text { font-size: 22rpx; color: #666; }
.random-type-btn-active .random-type-text { color: #4CAF50; font-weight: 600; }

/* 数量选择 */
.random-count-row { display: flex; }
.random-count-btn {
  flex: 1; height: 72rpx; margin-right: 16rpx;
  display: flex; align-items: center; justify-content: center;
  background: #f5f5f5; border-radius: 12rpx; font-size: 30rpx; color: #666;
  border: 2rpx solid transparent;
}
.random-count-btn:last-child { margin-right: 0; }
.random-count-btn-active {
  background: #f0f9f0; border-color: #4CAF50; color: #4CAF50; font-weight: 600;
}

/* 结果卡片 */
.random-results { margin-bottom: 24rpx; }
.random-result-card {
  background: #fff; border-radius: 16rpx; padding: 36rpx 30rpx;
  margin-bottom: 16rpx; text-align: center;
  box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.05);
  border-left: 8rpx solid #4CAF50;
}
.random-result-text { font-size: 36rpx; font-weight: 600; color: #333; }

/* 空状态 */
.random-empty { padding: 100rpx 0; text-align: center; }
.random-empty-icon { display: block; font-size: 80rpx; margin-bottom: 20rpx; }
.random-empty-text { display: block; font-size: 30rpx; color: #666; }
.random-empty-sub { display: block; font-size: 24rpx; color: #bbb; margin-top: 10rpx; }

.random-pool-hint {
  display: block; text-align: center; font-size: 22rpx; color: #bbb; margin-bottom: 20rpx;
}

/* 随机按钮：固定在页面底部（原生 tabBar 上方） */
.random-roll-btn {
  position: fixed;
  left: 30rpx; right: 30rpx;
  bottom: calc(30rpx + env(safe-area-inset-bottom));
  height: 96rpx; border-radius: 48rpx;
  background: #4CAF50; display: flex; align-items: center; justify-content: center;
  color: #fff; font-size: 32rpx; font-weight: 600;
  box-shadow: 0 6rpx 20rpx rgba(76,175,80,0.4);
}
.random-roll-btn-disabled { background: #ccc; box-shadow: none; }
</style>
