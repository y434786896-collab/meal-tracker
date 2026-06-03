<template>
  <view class="page-index">
    <view class="page-index-date-bar flex-between">
      <text class="page-index-date">{{ friendlyDate }}</text>
      <text class="page-index-weekday">{{ weekDay }}</text>
    </view>

    <view class="page-index-meals">
      <meal-card
        v-for="type in mealTypes"
        :key="type"
        :meal-type="type"
        :list="mealsByType[type].list"
        @edit="onEdit"
        @delete="onDelete"
      />
    </view>

    <view class="page-index-summary" v-if="todayRecordCount > 0">
      <text class="page-index-summary-text">今日已记录 {{ todayRecordCount }} 条，共 {{ todayDishCount }} 个菜品</text>
    </view>

    <view class="page-index-fab" @tap="showInput = true">
      <text class="page-index-fab-icon">+</text>
    </view>

    <meal-input :visible="showInput" :edit-record="editingRecord" @submit="onAdd" @update="onUpdate" @close="onCloseInput" />
  </view>
</template>

<script>
import MealCard from '../../components/MealCard.vue'
import MealInput from '../../components/MealInput.vue'
import { getToday, getWeekDay, getFriendlyDate } from '../../utils/date'

export default {
  name: 'PageIndex',
  components: { MealCard, MealInput },
  data() {
    return {
      mealTypes: ['breakfast', 'lunch', 'dinner', 'snack'],
      showInput: false,
      editingRecord: null
    }
  },
  computed: {
    currentDate() { return this.$store.state.currentDate },
    friendlyDate() { return getFriendlyDate(this.currentDate) },
    weekDay() { return getWeekDay(this.currentDate) },
    mealsByType() { return this.$store.getters.mealsByType },
    todayRecordCount() { return this.$store.getters.todayRecordCount },
    todayDishCount() { return this.$store.getters.todayDishCount }
  },
  onShow() {
    this.$store.dispatch('changeDate', getToday())
    this.$store.dispatch('loadRecords')
  },
  methods: {
    onAdd(data) { this.$store.dispatch('addMeal', data) },
    onEdit(record) {
      this.editingRecord = record
      this.showInput = true
    },
    onUpdate(payload) {
      this.$store.dispatch('updateMeal', payload)
      this.showInput = false
      this.editingRecord = null
    },
    onDelete(id) { this.$store.dispatch('removeMeal', id) },
    onCloseInput() {
      this.showInput = false
      this.editingRecord = null
    }
  }
}
</script>

<style lang="scss" scoped>
.page-index {
  min-height: 100vh; padding: 24rpx 30rpx;
  padding-bottom: calc(24rpx + 120rpx + env(safe-area-inset-bottom));
}
.page-index-date-bar { padding: 20rpx 0 30rpx; }
.page-index-date { font-size: 36rpx; font-weight: 600; color: #333; }
.page-index-weekday { font-size: 28rpx; color: #999; }
.page-index-summary { text-align: center; padding: 20rpx 0; }
.page-index-summary-text { font-size: 26rpx; color: #999; }
.page-index-fab {
  position: fixed; right: 40rpx; bottom: calc(140rpx + env(safe-area-inset-bottom));
  width: 100rpx; height: 100rpx; background: #4CAF50; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 6rpx 20rpx rgba(76,175,80,0.4); z-index: 100;
}
.page-index-fab-icon { font-size: 48rpx; color: #fff; font-weight: 300; }
</style>