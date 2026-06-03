/**
 * 日期工具函数
 */

/** 获取今日日期字符串 YYYY-MM-DD */
export function getToday() {
  return formatDate(new Date())
}

/** 格式化日期为 YYYY-MM-DD */
export function formatDate(date) {
  if (!date) return ''
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** 获取星期几文字 */
export function getWeekDay(dateStr) {
  const days = ['日', '一', '二', '三', '四', '五', '六']
  const d = new Date(dateStr)
  return '周' + days[d.getDay()]
}

/** 获取友好日期显示 */
export function getFriendlyDate(dateStr) {
  const today = getToday()
  const yesterday = formatDate(new Date(Date.now() - 86400000))
  if (dateStr === today) return '今天'
  if (dateStr === yesterday) return '昨天'
  return dateStr
}

/** 获取某月的天数 */
export function getMonthDays(year, month) {
  return new Date(year, month + 1, 0).getDate()
}

/** 获取某月第一天是星期几 (0-6, 0=周日) */
export function getMonthFirstDay(year, month) {
  return new Date(year, month, 1).getDay()
}

/** 计算两个日期之间的天数 */
export function daysBetween(dateStr1, dateStr2) {
  const d1 = new Date(dateStr1)
  const d2 = new Date(dateStr2)
  return Math.abs(Math.round((d2 - d1) / 86400000))
}