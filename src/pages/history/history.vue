<template>
  <view class="page-history">
    <calendar
      :record-dates="recordDates"
      :selected-dates="selectedDates"
      :multi="multiMode"
      @select="onSelectDays"
      @month-change="onMonthChange"
    />

    <!-- 模式切换 + 选中标签栏 -->
    <view class="page-history-toolbar" v-if="selectedDates.length > 0 || multiMode">
      <view class="page-history-mode-btn" :class="{ 'page-history-mode-btn-active': multiMode }" @tap="toggleMode">
        <text>{{ multiMode ? '☑ 多选' : '☐ 多选' }}</text>
      </view>
      <scroll-view scroll-x class="page-history-tags-scroll" v-if="selectedDates.length > 0">
        <view class="page-history-tag" v-for="date in selectedDates" :key="date">
          <text class="page-history-tag-text">{{ shortDate(date) }}</text>
          <text class="page-history-tag-remove" v-if="multiMode" @tap="removeDate(date)">✕</text>
        </view>
      </scroll-view>
      <view class="page-history-tag-clear" v-if="multiMode && selectedDates.length > 0" @tap="clearDates">
        <text>清空</text>
      </view>
    </view>

    <!-- 记录列表：按日期分组 -->
    <view class="page-history-detail" v-if="selectedDates.length > 0">
      <view class="page-history-detail-header flex-between">
        <text class="page-history-detail-date">
          {{ selectedDates.length === 1 ? (friendlyDate(selectedDates[0]) + ' ' + getWeekDay(selectedDates[0])) : '已选 ' + selectedDates.length + ' 天' }}
        </text>
        <view class="page-history-header-right">
          <text class="page-history-detail-count">{{ multiRecords.length }}条记录</text>
          <view class="page-history-add-btn" v-if="!multiMode" @tap="onAdd"><text>＋补记</text></view>
        </view>
      </view>

      <view v-for="date in selectedDates" :key="date">
        <!-- 多选时显示日期分割线，单选时不显示 -->
        <view class="page-history-date-divider" v-if="multiMode || selectedDates.length > 1">
          <text class="page-history-date-label">{{ friendlyDate(date) }} {{ getWeekDay(date) }}</text>
          <text class="page-history-date-count">{{ dateRecords(date).length }}条</text>
        </view>

        <view class="page-history-records" v-if="dateRecords(date).length > 0">
          <view class="page-history-record" v-for="record in dateRecords(date)" :key="record.id">
            <view class="page-history-record-header flex-between">
              <text class="page-history-record-type">{{ labelMap[record.mealType] }}</text>
              <view class="page-history-record-actions">
                <text class="page-history-edit" @tap="onEdit(record)">编辑</text>
                <text class="page-history-delete" @tap="onDelete(record.id)">删除</text>
              </view>
            </view>
            <view class="page-history-record-dishes">
              <text class="page-history-dish" v-for="(dish, idx) in record.dishes" :key="idx">{{ dish }}</text>
            </view>
            <view class="page-history-record-images" v-if="record.images && record.images.length > 0">
              <image
                class="page-history-img"
                v-for="(img, idx) in record.images"
                :key="idx"
                :src="img"
                mode="aspectFill"
                @tap="previewImage(record.images, idx)"
              />
            </view>
            <text class="page-history-record-note" v-if="record.note">{{ record.note }}</text>
          </view>
        </view>

        <view class="page-history-date-empty" v-else>
          <text class="page-history-date-empty-text">这天没有记录</text>
        </view>
      </view>
    </view>

    <view class="page-history-hint" v-else>
      <text class="page-history-hint-text">点击日历选择日期查看记录</text>
    </view>

    <meal-input
      :visible="showEdit"
      :edit-record="editingRecord"
      :date="editingRecord ? '' : (selectedDates[0] || '')"
      @submit="onSubmitAdd"
      @update="onUpdate"
      @close="showEdit = false"
    />
  </view>
</template>

<script>
import Calendar from '../../components/Calendar.vue'
import MealInput from '../../components/MealInput.vue'
import { getRecords, deleteRecord, updateRecord, addRecord, generateId } from '../../utils/storage'
import { getToday, getWeekDay, getFriendlyDate } from '../../utils/date'

export default {
  name: 'PageHistory',
  components: { Calendar, MealInput },
  data() {
    return {
      multiMode: false,
      selectedDates: [],
      recordDates: [],
      allRecords: [],
      showEdit: false,
      editingRecord: null,
      labelMap: { breakfast: '🌅 早餐', lunch: '☀️ 午餐', dinner: '🌙 晚餐', snack: '🍪 加餐' }
    }
  },
  computed: {
    multiRecords() {
      return this.allRecords.filter(r => this.selectedDates.includes(r.date))
    }
  },
  onShow() { this.loadData() },
  methods: {
    async loadData() {
      this.allRecords = await getRecords()
      this.loadMonthData()
    },
    loadMonthData() {
      const ref = this.selectedDates.length > 0 ? this.selectedDates[0] : getToday()
      const now = new Date(ref)
      const year = now.getFullYear()
      const month = now.getMonth()
      const prefix = `${year}-${String(month + 1).padStart(2, '0')}-`
      const dates = new Set()
      this.allRecords.forEach(r => {
        if (r.date.startsWith(prefix)) dates.add(r.date)
      })
      this.recordDates = Array.from(dates)
    },
    dateRecords(date) {
      return this.allRecords.filter(r => r.date === date)
    },
    shortDate(dateStr) {
      const parts = dateStr.split('-')
      return parseInt(parts[1]) + '/' + parseInt(parts[2])
    },
    friendlyDate(dateStr) { return getFriendlyDate(dateStr) },
    getWeekDay(dateStr) { return getWeekDay(dateStr) },
    toggleMode() {
      this.multiMode = !this.multiMode
      // 切换到单选模式时，只保留最后一个选中日期
      if (!this.multiMode && this.selectedDates.length > 1) {
        this.selectedDates = [this.selectedDates[this.selectedDates.length - 1]]
      }
    },
    onSelectDays(dates) { this.selectedDates = dates },
    removeDate(date) {
      this.selectedDates = this.selectedDates.filter(d => d !== date)
    },
    clearDates() { this.selectedDates = [] },
    previewImage(urls, idx) {
      uni.previewImage({ current: urls[idx], urls })
    },
    onEdit(record) {
      this.editingRecord = record
      this.showEdit = true
    },
    /** 补记：以选中日期新增一条记录 */
    onAdd() {
      const date = this.selectedDates[0]
      if (!date || date > getToday()) {
        uni.showToast({ title: '未来日期不能补记', icon: 'none' })
        return
      }
      this.editingRecord = null
      this.showEdit = true
    },
    async onSubmitAdd(payload) {
      const date = this.selectedDates[0]
      if (!date || date > getToday()) return
      await addRecord({
        id: generateId(),
        date,
        mealType: payload.mealType,
        dishes: payload.dishes,
        note: payload.note || '',
        images: payload.images || [],
        createdAt: Date.now()
      })
      this.showEdit = false
      await this.loadData()
    },
    async onUpdate(payload) {
      const { id, mealType, dishes, note, images } = payload
      await updateRecord(id, { mealType, dishes, note, images })
      this.showEdit = false
      this.editingRecord = null
      await this.loadData()
    },
    onDelete(id) {
      uni.showModal({
        title: '确认删除',
        content: '确定要删除这条记录吗？',
        success: async (res) => {
          if (res.confirm) {
            await deleteRecord(id)
            await this.loadData()
          }
        }
      })
    },
    onMonthChange({ year, month }) {
      const prefix = `${year}-${String(month + 1).padStart(2, '0')}-`
      const dates = new Set()
      this.allRecords.forEach(r => {
        if (r.date.startsWith(prefix)) dates.add(r.date)
      })
      this.recordDates = Array.from(dates)
    }
  }
}
</script>

<style lang="scss" scoped>
.page-history { min-height: 100vh; padding: 24rpx 30rpx; }

/* 工具栏：模式切换 + 标签 */
.page-history-toolbar {
  display: flex; align-items: center; margin-bottom: 20rpx;
}
.page-history-mode-btn {
  padding: 8rpx 20rpx; background: #f5f5f5; border-radius: 8rpx;
  font-size: 24rpx; color: #666; margin-right: 16rpx; flex-shrink: 0;
}
.page-history-mode-btn-active {
  background: #e8f5e9; color: #4CAF50;
}
.page-history-tags-scroll {
  flex: 1; white-space: nowrap;
}
.page-history-tag {
  display: inline-flex; align-items: center;
  padding: 8rpx 16rpx; background: #f0f9f0; border-radius: 8rpx;
  margin-right: 12rpx;
}
.page-history-tag-text { font-size: 24rpx; color: #4CAF50; }
.page-history-tag-remove { font-size: 20rpx; color: #999; margin-left: 8rpx; padding: 0 4rpx; }
.page-history-tag-clear {
  padding: 8rpx 20rpx; background: #f5f5f5; border-radius: 8rpx;
  font-size: 24rpx; color: #999; margin-left: 12rpx; flex-shrink: 0;
}

/* 记录区域 */
.page-history-detail {
  background: #fff; border-radius: 16rpx; padding: 24rpx 30rpx;
  box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.05);
}
.page-history-detail-header { padding-bottom: 20rpx; border-bottom: 1rpx solid #f0f0f0; }
.page-history-header-right { display: flex; align-items: center; }
.page-history-add-btn {
  background: #4CAF50; color: #fff; font-size: 24rpx;
  padding: 8rpx 24rpx; border-radius: 24rpx; margin-left: 16rpx;
}
.page-history-detail-date { font-size: 30rpx; font-weight: 600; color: #333; }
.page-history-detail-count { font-size: 24rpx; color: #999; }

/* 日期分割线 */
.page-history-date-divider {
  display: flex; justify-content: space-between; align-items: center;
  padding: 20rpx 0 12rpx; margin-top: 8rpx;
}
.page-history-date-divider:first-of-type { margin-top: 0; }
.page-history-date-label { font-size: 26rpx; font-weight: 600; color: #4CAF50; }
.page-history-date-count { font-size: 22rpx; color: #bbb; }

.page-history-record { padding: 16rpx 0; border-bottom: 1rpx solid #f5f5f5; }
.page-history-record:last-child { border-bottom: none; }
.page-history-record-header { margin-bottom: 8rpx; }
.page-history-record-type { font-size: 28rpx; font-weight: 600; color: #333; }
.page-history-record-actions { display: flex; }
.page-history-edit { font-size: 24rpx; color: #4CAF50; padding: 4rpx 12rpx; margin-right: 12rpx; }
.page-history-delete { font-size: 24rpx; color: #dd524d; padding: 4rpx 12rpx; }
.page-history-record-dishes { display: flex; flex-wrap: wrap; }
.page-history-dish {
  display: inline-block; padding: 6rpx 16rpx; background: #f0f9f0; color: #4CAF50;
  border-radius: 8rpx; font-size: 26rpx; margin-right: 12rpx; margin-bottom: 8rpx;
}
.page-history-record-note { display: block; margin-top: 8rpx; font-size: 24rpx; color: #999; }
.page-history-record-images { display: flex; flex-wrap: wrap; margin-top: 12rpx; }
.page-history-img {
  width: 120rpx; height: 120rpx; border-radius: 8rpx; margin-right: 12rpx; margin-bottom: 8rpx;
}
.page-history-date-empty { padding: 20rpx 0; text-align: center; }
.page-history-date-empty-text { font-size: 24rpx; color: #ccc; }

/* 提示 */
.page-history-hint { padding: 60rpx 0; text-align: center; }
.page-history-hint-text { font-size: 28rpx; color: #ccc; }
</style>
