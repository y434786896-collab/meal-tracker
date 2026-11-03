<template>
  <view class="meal-card" :class="'meal-card--' + mealType">
    <view class="meal-card-header flex-between">
      <view class="meal-card-title">
        <text class="meal-card-icon">{{ iconMap[mealType] }}</text>
        <text class="meal-card-label">{{ labelMap[mealType] }}</text>
      </view>
      <text class="meal-card-count">{{ list.length }}条记录</text>
    </view>

    <view class="meal-card-body" v-if="list.length > 0">
      <view class="meal-card-item" v-for="record in list" :key="record.id" @tap="onEdit(record)">
        <view class="meal-card-dishes">
          <text class="meal-card-dish" v-for="(dish, idx) in record.dishes" :key="idx">{{ dish }}</text>
        </view>
        <view class="meal-card-images" v-if="record.images && record.images.length > 0">
          <image
            class="meal-card-img"
            v-for="(img, idx) in record.images"
            :key="idx"
            :src="img"
            mode="aspectFill"
            @tap.stop="previewImage(record.images, idx)"
          />
        </view>
        <text class="meal-card-note" v-if="record.note">{{ record.note }}</text>
        <view class="meal-card-actions">
          <text class="meal-card-delete" @tap.stop="onDelete(record.id)">删除</text>
        </view>
      </view>
    </view>

    <view class="meal-card-empty" v-else>
      <text class="meal-card-empty-text">还没有记录，点击下方 + 添加</text>
    </view>
  </view>
</template>

<script>
export default {
  name: 'MealCard',
  props: {
    mealType: { type: String, required: true },
    list: { type: Array, default: () => [] }
  },
  data() {
    return {
      iconMap: { breakfast: '🌅', lunch: '☀️', dinner: '🌙', snack: '🍪' },
      labelMap: { breakfast: '早餐', lunch: '午餐', dinner: '晚餐', snack: '加餐' }
    }
  },
  methods: {
    onEdit(record) {
      this.$emit('edit', record)
    },
    onDelete(id) {
      uni.showModal({
        title: '确认删除',
        content: '确定要删除这条记录吗？',
        success: (res) => {
          if (res.confirm) {
            this.$emit('delete', id)
          }
        }
      })
    },
    previewImage(urls, idx) {
      uni.previewImage({ current: urls[idx], urls })
    }
  }
}
</script>

<style lang="scss" scoped>
.meal-card {
  background: #fff;
  border-radius: 16rpx;
  margin-bottom: 24rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.05);
}
.meal-card-header {
  padding: 24rpx 30rpx;
  border-bottom: 1rpx solid #f0f0f0;
}
.meal-card-title { display: flex; align-items: center; }
.meal-card-icon { font-size: 36rpx; margin-right: 12rpx; }
.meal-card-label { font-size: 32rpx; font-weight: 600; color: #333; }
.meal-card-count { font-size: 24rpx; color: #999; }
.meal-card-body { padding: 20rpx 30rpx; }
.meal-card-item {
  padding: 16rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
}
.meal-card-item:last-child { border-bottom: none; }
.meal-card-dishes { display: flex; flex-wrap: wrap; }
.meal-card-dish {
  display: inline-block;
  padding: 6rpx 16rpx;
  background: #f0f9f0;
  color: #4CAF50;
  border-radius: 8rpx;
  font-size: 26rpx;
  margin-right: 12rpx;
  margin-bottom: 8rpx;
}
.meal-card-note { display: block; margin-top: 8rpx; font-size: 24rpx; color: #999; }
.meal-card-images { display: flex; flex-wrap: wrap; margin-top: 12rpx; }
.meal-card-img {
  width: 120rpx; height: 120rpx; border-radius: 8rpx; margin-right: 12rpx; margin-bottom: 8rpx;
}
.meal-card-actions { display: flex; justify-content: flex-end; margin-top: 8rpx; }
.meal-card-delete { font-size: 24rpx; color: #dd524d; padding: 4rpx 12rpx; }
.meal-card-empty { padding: 40rpx 30rpx; text-align: center; }
.meal-card-empty-text { font-size: 26rpx; color: #ccc; }
</style>