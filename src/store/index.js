import Vue from 'vue'
import Vuex from 'vuex'
import { getRecords, addRecord, updateRecord, deleteRecord, getFrequentDishes, removeFrequentDish, generateId } from '../utils/storage'
import { getToday } from '../utils/date'

Vue.use(Vuex)

export default new Vuex.Store({
  state: {
    currentDate: getToday(),
    records: [],
    frequentDishes: [],
    loading: false
  },

  getters: {
    todayRecords(state) {
      return state.records.filter(r => r.date === state.currentDate)
    },
    mealsByType(state, getters) {
      const types = ['breakfast', 'lunch', 'dinner', 'snack']
      const labels = { breakfast: '早餐', lunch: '午餐', dinner: '晚餐', snack: '加餐' }
      const result = {}
      types.forEach(type => {
        result[type] = {
          label: labels[type],
          list: getters.todayRecords.filter(r => r.mealType === type)
        }
      })
      return result
    },
    todayRecordCount(state, getters) {
      return getters.todayRecords.length
    },
    todayDishCount(state, getters) {
      let count = 0
      getters.todayRecords.forEach(r => { count += r.dishes.length })
      return count
    },
    topDishes(state) {
      return state.frequentDishes.slice(0, 10)
    }
  },

  mutations: {
    SET_CURRENT_DATE(state, date) { state.currentDate = date },
    SET_RECORDS(state, records) { state.records = records },
    SET_LOADING(state, val) { state.loading = val },
    REFRESH_FREQUENT(state) { state.frequentDishes = getFrequentDishes() }
  },

  actions: {
    /** 加载所有记录（从云端或本地） */
    async loadRecords({ commit }) {
      commit('SET_LOADING', true)
      try {
        const records = await getRecords()
        commit('SET_RECORDS', records)
        commit('REFRESH_FREQUENT')
      } catch (e) {
        console.error('加载记录失败', e)
      }
      commit('SET_LOADING', false)
    },

    /** 添加饮食记录 */
    async addMeal({ commit, dispatch }, { mealType, dishes, note, images }) {
      const record = {
        id: generateId(),
        date: getToday(),
        mealType,
        dishes,
        note: note || '',
        images: images || [],
        createdAt: Date.now()
      }
      await addRecord(record)
      await dispatch('loadRecords')
      return record
    },

    /** 删除饮食记录 */
    async removeMeal({ commit, dispatch }, id) {
      await deleteRecord(id)
      await dispatch('loadRecords')
    },

    /** 更新饮食记录 */
    async updateMeal({ commit, dispatch }, { id, mealType, dishes, note, images }) {
      const updates = { mealType, dishes, note: note || '', images: images || [] }
      await updateRecord(id, updates)
      await dispatch('loadRecords')
    },

    /** 删除常用菜品 */
    removeFrequentDish({ commit }, name) {
      removeFrequentDish(name)
      commit('REFRESH_FREQUENT')
    },

    /** 切换当前查看日期 */
    changeDate({ commit }, date) {
      commit('SET_CURRENT_DATE', date)
    }
  }
})