/**
 * 数据存储封装
 * 微信小程序端：使用云数据库
 * H5 端：使用 localStorage（降级方案）
 */

// 云开发环境ID —— 在微信小程序后台「云开发 → 设置」中查看
const CLOUD_ENV = 'cloudbase-d8gti2kuiecb16b90'

// 是否为微信小程序环境
const isWxMp = typeof wx !== 'undefined' && wx.cloud

// 云数据库集合名
const COLLECTION = 'meal_records'

/** 初始化云开发 */
let db = null
let cloudInited = false

function initCloud() {
  if (cloudInited) return db
  cloudInited = true
  try {
    if (isWxMp && CLOUD_ENV) {
      wx.cloud.init({ env: CLOUD_ENV, traceUser: true })
      db = wx.cloud.database()
    }
  } catch (e) {
    console.error('云开发初始化失败', e)
  }
  return db
}

/** 获取当前用户 openid */
let _openid = ''
async function getOpenId() {
  if (_openid) return _openid
  if (isWxMp && CLOUD_ENV) {
    try {
      const res = await wx.cloud.callFunction({ name: 'login' })
      _openid = res.result.openid
      return _openid
    } catch (e) {
      console.error('获取openid失败', e)
    }
  }
  return 'local_user'
}

// ==================== 本地存储（H5 降级） ====================

const KEYS = {
  RECORDS: 'meal_records',
  FREQUENT: 'meal_frequent'
}

function localGetRecords() {
  try { return uni.getStorageSync(KEYS.RECORDS) || [] } catch (e) { return [] }
}

function localSaveRecords(records) {
  try { uni.setStorageSync(KEYS.RECORDS, records) } catch (e) { console.error('保存失败', e) }
}

function localGetFrequent() {
  try { return uni.getStorageSync(KEYS.FREQUENT) || [] } catch (e) { return [] }
}

function localSaveFrequent(list) {
  try { uni.setStorageSync(KEYS.FREQUENT, list) } catch (e) {}
}

// ==================== 通用接口 ====================

/** 获取所有饮食记录 */
export async function getRecords() {
  const database = initCloud()
  if (database) {
    try {
      const openid = await getOpenId()
      const { data } = await database.collection(COLLECTION)
        .where({ _openid: openid })
        .orderBy('createdAt', 'desc')
        .limit(1000)
        .get()
      // 转换云数据库格式 → 本地格式
      return data.map(item => ({
        id: item._id,
        date: item.date,
        mealType: item.mealType,
        dishes: item.dishes,
        note: item.note,
        images: item.images || [],
        createdAt: item.createdAt
      }))
    } catch (e) {
      console.error('云数据库查询失败', e)
      return localGetRecords()
    }
  }
  return localGetRecords()
}

/** 添加一条记录 */
export async function addRecord(record) {
  const database = initCloud()
  if (database) {
    try {
      const { _id } = await database.collection(COLLECTION).add({
        data: {
          date: record.date,
          mealType: record.mealType,
          dishes: record.dishes,
          note: record.note,
          images: record.images || [],
          createdAt: record.createdAt
        }
      })
      record.id = _id
    } catch (e) {
      console.error('云数据库写入失败', e)
    }
  }
  // 同时写入本地缓存
  const records = localGetRecords()
  records.unshift(record)
  localSaveRecords(records)
  updateFrequent(record.dishes)
  return records
}

/** 更新一条记录 */
export async function updateRecord(id, updates) {
  const database = initCloud()
  if (database) {
    try {
      const data = {}
      if (updates.mealType !== undefined) data.mealType = updates.mealType
      if (updates.dishes !== undefined) data.dishes = updates.dishes
      if (updates.note !== undefined) data.note = updates.note
      if (updates.images !== undefined) data.images = updates.images
      await database.collection(COLLECTION).doc(id).update({ data })
    } catch (e) {
      console.error('云数据库更新失败', e)
    }
  }
  // 同步更新本地缓存
  const records = localGetRecords()
  const index = records.findIndex(r => r.id === id)
  if (index !== -1) {
    Object.assign(records[index], updates)
    localSaveRecords(records)
  }
  // 如果菜品变了，重新统计常用
  if (updates.dishes !== undefined) {
    updateFrequent(updates.dishes)
  }
  return records
}

/** 删除一条记录（同时删除关联的云存储图片） */
export async function deleteRecord(id) {
  const database = initCloud()
  if (database) {
    try {
      // 先查出记录中的图片 fileID
      const { data } = await database.collection(COLLECTION).doc(id).get()
      if (data && data.images && data.images.length > 0) {
        await wx.cloud.deleteFile({ fileList: data.images })
      }
      await database.collection(COLLECTION).doc(id).remove()
    } catch (e) {
      console.error('云数据库删除失败', e)
    }
  }
  const records = localGetRecords()
  const index = records.findIndex(r => r.id === id)
  if (index !== -1) {
    records.splice(index, 1)
    localSaveRecords(records)
  }
  return records
}

/** 获取某日的记录 */
export async function getDayRecords(dateStr) {
  const all = await getRecords()
  return all.filter(r => r.date === dateStr)
}

/** 获取某月所有有记录的日期 */
export async function getMonthRecordDates(year, month) {
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}-`
  const all = await getRecords()
  const dates = new Set()
  all.forEach(r => {
    if (r.date.startsWith(prefix)) {
      dates.add(r.date)
    }
  })
  return Array.from(dates)
}

/** 获取常用菜品列表 */
export function getFrequentDishes() {
  return localGetFrequent()
}

/** 删除一条常用菜品 */
export function removeFrequentDish(name) {
  const frequent = localGetFrequent()
  const index = frequent.findIndex(f => f.name === name)
  if (index !== -1) {
    frequent.splice(index, 1)
    localSaveFrequent(frequent)
  }
  return frequent
}

/** 更新常用菜品统计（本地计算即可） */
function updateFrequent(dishes) {
  const frequent = localGetFrequent()
  dishes.forEach(dish => {
    const item = frequent.find(f => f.name === dish)
    if (item) { item.count++ } else { frequent.push({ name: dish, count: 1 }) }
  })
  frequent.sort((a, b) => b.count - a.count)
  localSaveFrequent(frequent.slice(0, 30))
}

/** 上传图片到云存储，返回 fileID */
export async function uploadImage(tempFilePath) {
  const cloud = initCloud()
  if (!cloud) return ''
  try {
    const ext = tempFilePath.split('.').pop() || 'jpg'
    const cloudPath = `meal-images/${Date.now()}-${Math.random().toString(36).substr(2, 6)}.${ext}`
    const { fileID } = await wx.cloud.uploadFile({ cloudPath, filePath: tempFilePath })
    return fileID
  } catch (e) {
    console.error('图片上传失败', e)
    return ''
  }
}

/** 删除云存储中的图片 */
export async function deleteImage(fileID) {
  if (!fileID) return
  try {
    const cloud = initCloud()
    if (cloud) await wx.cloud.deleteFile({ fileList: [fileID] })
  } catch (e) {
    console.error('图片删除失败', e)
  }
}

/** 获取图片临时访问链接（用于展示） */
export async function getImageTempURL(fileID) {
  if (!fileID) return ''
  try {
    const cloud = initCloud()
    if (cloud) {
      const { fileList } = await wx.cloud.getTempFileURL({ fileList: [fileID] })
      return fileList[0] && fileList[0].tempFileURL || ''
    }
  } catch (e) {
    console.error('获取图片链接失败', e)
  }
  return ''
}

/** 批量获取图片临时链接 */
export async function getImageTempURLs(fileIDs) {
  if (!fileIDs || fileIDs.length === 0) return []
  try {
    const cloud = initCloud()
    if (cloud) {
      const { fileList } = await wx.cloud.getTempFileURL({ fileList: fileIDs })
      return fileList.map(f => f.tempFileURL || '')
    }
  } catch (e) {
    console.error('批量获取图片链接失败', e)
  }
  return []
}

/** 生成唯一 ID */
export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5)
}