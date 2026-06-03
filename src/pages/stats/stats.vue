<template>
  <view class="page-stats">
    <view class="page-stats-tabs">
      <view class="page-stats-tab" :class="{ 'page-stats-tab-active': range === 'week' }" @tap="switchRange('week')"><text>本周</text></view>
      <view class="page-stats-tab" :class="{ 'page-stats-tab-active': range === 'month' }" @tap="switchRange('month')"><text>本月</text></view>
    </view>

    <view class="page-stats-overview">
      <view class="page-stats-stat-card">
        <text class="page-stats-stat-value">{{ totalRecords }}</text>
        <text class="page-stats-stat-label">记录条数</text>
      </view>
      <view class="page-stats-stat-card">
        <text class="page-stats-stat-value">{{ totalDishes }}</text>
        <text class="page-stats-stat-label">菜品总数</text>
      </view>
      <view class="page-stats-stat-card">
        <text class="page-stats-stat-value">{{ uniqueDishes }}</text>
        <text class="page-stats-stat-label">不同菜品</text>
      </view>
    </view>

    <view class="page-stats-section">
      <text class="page-stats-section-title">餐次分布</text>
      <view class="page-stats-bars">
        <view class="page-stats-bar-item" v-for="item in mealDistribution" :key="item.type">
          <view class="page-stats-bar-label flex-between">
            <text>{{ item.label }}</text>
            <text>{{ item.count }}次</text>
          </view>
          <view class="page-stats-bar-track">
            <view class="page-stats-bar-fill" :style="{ width: item.percent + '%', background: item.color }" />
          </view>
        </view>
      </view>
    </view>

    <view class="page-stats-section">
      <text class="page-stats-section-title">常吃菜品 TOP10</text>
      <view class="page-stats-rank" v-if="topDishes.length > 0">
        <view class="page-stats-rank-item" v-for="(dish, idx) in topDishes" :key="dish.name">
          <text class="page-stats-rank-num" :class="{ 'page-stats-rank-num-top': idx < 3 }">{{ idx + 1 }}</text>
          <text class="page-stats-rank-name">{{ dish.name }}</text>
          <text class="page-stats-rank-count">{{ dish.count }}次</text>
        </view>
      </view>
      <view class="page-stats-empty" v-else>
        <text class="page-stats-empty-text">暂无数据，先去记录几天饮食吧</text>
      </view>
    </view>
  </view>
</template>

<script>
import { getRecords } from '../../utils/storage'
import { getToday, formatDate } from '../../utils/date'

export default {
  name: 'PageStats',
  data() {
    return {
      range: 'week',
      allRecords: []
    }
  },
  computed: {
    rangeRecords() {
      const days = this.range === 'week' ? 7 : 30
      const startDate = formatDate(new Date(Date.now() - (days - 1) * 86400000))
      return this.allRecords.filter(r => r.date >= startDate && r.date <= getToday())
    },
    totalRecords() { return this.rangeRecords.length },
    totalDishes() {
      let count = 0
      this.rangeRecords.forEach(r => { count += r.dishes.length })
      return count
    },
    uniqueDishes() {
      const set = new Set()
      this.rangeRecords.forEach(r => r.dishes.forEach(d => set.add(d)))
      return set.size
    },
    mealDistribution() {
      const types = [
        { type: 'breakfast', label: '🌅 早餐', color: '#FF9800' },
        { type: 'lunch', label: '☀️ 午餐', color: '#4CAF50' },
        { type: 'dinner', label: '🌙 晚餐', color: '#2196F3' },
        { type: 'snack', label: '🍪 加餐', color: '#9C27B0' }
      ]
      const total = this.rangeRecords.length || 1
      return types.map(t => {
        const count = this.rangeRecords.filter(r => r.mealType === t.type).length
        return { ...t, count, percent: Math.round((count / total) * 100) }
      })
    },
    topDishes() {
      const dishCount = {}
      this.rangeRecords.forEach(r => {
        r.dishes.forEach(d => { dishCount[d] = (dishCount[d] || 0) + 1 })
      })
      return Object.entries(dishCount)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
    }
  },
  onShow() { this.loadData() },
  methods: {
    async loadData() {
      this.allRecords = await getRecords()
    },
    switchRange(r) {
      this.range = r
    }
  }
}
</script>

<style lang="scss" scoped>
.page-stats { min-height: 100vh; padding: 24rpx 30rpx; }
.page-stats-tabs {
  display: flex; background: #fff; border-radius: 12rpx; padding: 6rpx;
  margin-bottom: 24rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.05);
}
.page-stats-tab {
  flex: 1; text-align: center; padding: 16rpx 0; border-radius: 8rpx;
  font-size: 28rpx; color: #666;
}
.page-stats-tab-active { background: #4CAF50; color: #fff; }
.page-stats-overview { display: flex; margin-bottom: 24rpx; }
.page-stats-stat-card {
  flex: 1; background: #fff; border-radius: 16rpx; padding: 24rpx;
  text-align: center; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.05); margin-right: 16rpx;
}
.page-stats-stat-card:last-child { margin-right: 0; }
.page-stats-stat-value { display: block; font-size: 44rpx; font-weight: 700; color: #4CAF50; }
.page-stats-stat-label { display: block; font-size: 24rpx; color: #999; margin-top: 8rpx; }
.page-stats-section {
  background: #fff; border-radius: 16rpx; padding: 24rpx 30rpx;
  margin-bottom: 24rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.05);
}
.page-stats-section-title { display: block; font-size: 30rpx; font-weight: 600; color: #333; margin-bottom: 20rpx; }
.page-stats-bar-item { margin-bottom: 16rpx; }
.page-stats-bar-item:last-child { margin-bottom: 0; }
.page-stats-bar-label { margin-bottom: 8rpx; font-size: 26rpx; color: #666; }
.page-stats-bar-track { height: 16rpx; background: #f0f0f0; border-radius: 8rpx; overflow: hidden; }
.page-stats-bar-fill { height: 100%; border-radius: 8rpx; }
.page-stats-rank-item {
  display: flex; align-items: center; padding: 12rpx 0; border-bottom: 1rpx solid #f5f5f5;
}
.page-stats-rank-item:last-child { border-bottom: none; }
.page-stats-rank-num {
  width: 48rpx; height: 48rpx; display: flex; align-items: center; justify-content: center;
  border-radius: 50%; font-size: 24rpx; color: #999; background: #f5f5f5; margin-right: 16rpx;
}
.page-stats-rank-num-top { background: #4CAF50; color: #fff; }
.page-stats-rank-name { flex: 1; font-size: 28rpx; color: #333; }
.page-stats-rank-count { font-size: 26rpx; color: #999; }
.page-stats-empty { padding: 40rpx 0; text-align: center; }
.page-stats-empty-text { font-size: 26rpx; color: #ccc; }
</style>