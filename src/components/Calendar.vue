<template>
  <view class="calendar">
    <view class="calendar-header flex-between">
      <view class="calendar-arrow" @tap="prevMonth"><text>◀</text></view>
      <text class="calendar-title">{{ year }}年{{ month + 1 }}月</text>
      <view class="calendar-arrow" @tap="nextMonth"><text>▶</text></view>
    </view>
    <view class="calendar-weekdays">
      <text class="calendar-weekday" v-for="w in weekdays" :key="w">{{ w }}</text>
    </view>
    <view class="calendar-days">
      <view class="calendar-day calendar-day-empty" v-for="n in firstDay" :key="'e-' + n" />
      <view
        class="calendar-day"
        :class="{
          'calendar-day-today': isToday(day),
          'calendar-day-selected': isSelected(day),
          'calendar-day-has-record': hasRecord(day)
        }"
        v-for="day in daysInMonth"
        :key="day"
        @tap="selectDay(day)"
      >
        <text class="calendar-day-text">{{ day }}</text>
        <view class="calendar-dot" v-if="hasRecord(day) && !isSelected(day)" />
        <view class="calendar-check" v-if="isSelected(day)" />
      </view>
    </view>
  </view>
</template>

<script>
import { getToday, getMonthDays, getMonthFirstDay } from '../utils/date'

export default {
  name: 'Calendar',
  props: {
    recordDates: { type: Array, default: () => [] },
    selectedDates: { type: Array, default: () => [] },
    multi: { type: Boolean, default: false }
  },
  data() {
    const now = new Date()
    return {
      year: now.getFullYear(),
      month: now.getMonth(),
      weekdays: ['日', '一', '二', '三', '四', '五', '六']
    }
  },
  computed: {
    daysInMonth() { return getMonthDays(this.year, this.month) },
    firstDay() { return getMonthFirstDay(this.year, this.month) }
  },
  methods: {
    isToday(day) { return this.getDateStr(day) === getToday() },
    isSelected(day) { return this.selectedDates.includes(this.getDateStr(day)) },
    hasRecord(day) { return this.recordDates.includes(this.getDateStr(day)) },
    getDateStr(day) {
      return `${this.year}-${String(this.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    },
    selectDay(day) {
      const dateStr = this.getDateStr(day)
      if (this.multi) {
        // 多选模式：toggle
        const index = this.selectedDates.indexOf(dateStr)
        const newSelected = [...this.selectedDates]
        if (index >= 0) {
          newSelected.splice(index, 1)
        } else {
          newSelected.push(dateStr)
        }
        newSelected.sort()
        this.$emit('select', newSelected)
      } else {
        // 单选模式：直接替换
        this.$emit('select', [dateStr])
      }
    },
    prevMonth() {
      if (this.month === 0) { this.year--; this.month = 11 } else { this.month-- }
      this.$emit('monthChange', { year: this.year, month: this.month })
    },
    nextMonth() {
      if (this.month === 11) { this.year++; this.month = 0 } else { this.month++ }
      this.$emit('monthChange', { year: this.year, month: this.month })
    }
  }
}
</script>

<style lang="scss" scoped>
.calendar {
  background: #fff; border-radius: 16rpx; padding: 24rpx;
  margin-bottom: 24rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.05);
}
.calendar-header { margin-bottom: 20rpx; }
.calendar-arrow {
  width: 60rpx; height: 60rpx; display: flex; align-items: center; justify-content: center;
  font-size: 28rpx; color: #666;
}
.calendar-title { font-size: 32rpx; font-weight: 600; color: #333; }
.calendar-weekdays { display: flex; margin-bottom: 10rpx; }
.calendar-weekday { flex: 1; text-align: center; font-size: 24rpx; color: #999; padding: 8rpx 0; }
.calendar-days { display: flex; flex-wrap: wrap; }
.calendar-day {
  width: calc(100% / 7); display: flex; flex-direction: column;
  align-items: center; justify-content: center; padding: 8rpx 0; position: relative;
}
.calendar-day-empty { height: 72rpx; }
.calendar-day-today .calendar-day-text { color: #4CAF50; font-weight: 600; }
.calendar-day-selected .calendar-day-text {
  background: #4CAF50; color: #fff; border-radius: 50%;
}
.calendar-day-text {
  font-size: 28rpx; color: #333; width: 56rpx; height: 56rpx;
  display: flex; align-items: center; justify-content: center;
}
.calendar-dot {
  width: 10rpx; height: 10rpx; border-radius: 50%; background: #4CAF50;
  position: absolute; bottom: 2rpx;
}
.calendar-check {
  width: 10rpx; height: 10rpx; border-radius: 50%; background: #fff;
  position: absolute; bottom: 2rpx;
}
</style>