<template>
  <view class="meal-input-mask" v-if="visible" @tap="close" @touchmove.stop.prevent="noop">
    <scroll-view class="meal-input" scroll-y @tap.stop>
      <view class="meal-input-section" v-if="!isEdit && date">
        <text class="meal-input-date-hint">📅 补记：{{ date }}</text>
      </view>
      <view class="meal-input-section">
        <text class="meal-input-label">选择餐次</text>
        <view class="meal-input-types">
          <view
            class="meal-input-type-btn"
            :class="{ 'meal-input-type-btn-active': form.mealType === type.value }"
            v-for="type in mealTypes"
            :key="type.value"
            @tap="form.mealType = type.value"
          >
            <text class="meal-input-type-icon">{{ type.icon }}</text>
            <text class="meal-input-type-text">{{ type.label }}</text>
          </view>
        </view>
      </view>

      <view class="meal-input-section">
        <text class="meal-input-label">菜品</text>
        <view class="meal-input-dish-row">
          <input class="meal-input-input" v-model="dishInput" placeholder="输入菜品名称" confirm-type="done" @confirm="addDish" />
          <view class="meal-input-add-btn" @tap="addDish"><text>添加</text></view>
        </view>
        <view class="meal-input-dishes" v-if="form.dishes.length > 0">
          <view class="meal-input-dish-tag" v-for="(dish, idx) in form.dishes" :key="idx">
            <text>{{ dish }}</text>
            <text class="meal-input-dish-remove" @tap="removeDish(idx)">✕</text>
          </view>
        </view>
      </view>

      <view class="meal-input-section" v-if="frequentDishes.length > 0">
        <text class="meal-input-label">常用菜品</text>
        <view class="meal-input-frequent">
          <view class="meal-input-freq-tag" v-for="item in frequentDishes" :key="item.name">
            <text @tap="quickAdd(item.name)">{{ item.name }}</text>
            <text class="meal-input-freq-remove" @tap.stop="removeFrequent(item.name)">✕</text>
          </view>
        </view>
      </view>

      <view class="meal-input-section">
        <text class="meal-input-label">拍照/图片（可选）</text>
        <view class="meal-input-images">
          <view class="meal-input-img-item" v-for="(img, idx) in form.images" :key="idx">
            <image class="meal-input-img" :src="img" mode="aspectFill" @tap="previewImage(idx)" />
            <view class="meal-input-img-remove" @tap="removeImage(idx)"><text>✕</text></view>
          </view>
          <view class="meal-input-img-add" v-if="form.images.length < 3" @tap="chooseImage">
            <text class="meal-input-img-add-icon">+</text>
            <text class="meal-input-img-add-text">添加图片</text>
          </view>
        </view>
        <text class="meal-input-img-hint" v-if="form.images.length === 0">最多上传3张图片</text>
      </view>

      <view class="meal-input-section">
        <text class="meal-input-label">备注（可选）</text>
        <textarea class="meal-input-textarea" v-model="form.note" placeholder="写点什么..." maxlength="200" />
      </view>

      <view class="meal-input-footer">
        <view class="meal-input-cancel" @tap="close"><text>取消</text></view>
        <view class="meal-input-submit" :class="{ 'meal-input-submit-disabled': !canSubmit }" @tap="submit"><text>{{ isEdit ? '保存修改' : '保存' }}</text></view>
      </view>
    </scroll-view>
  </view>
</template>

<script>
import { getFrequentDishes, removeFrequentDish, uploadImage, resolveImageURLs } from '../utils/storage'

export default {
  name: 'MealInput',
  props: {
    visible: { type: Boolean, default: false },
    editRecord: { type: Object, default: null },
    date: { type: String, default: '' }
  },
  data() {
    return {
      mealTypes: [
        { value: 'breakfast', label: '早餐', icon: '🌅' },
        { value: 'lunch', label: '午餐', icon: '☀️' },
        { value: 'dinner', label: '晚餐', icon: '🌙' },
        { value: 'snack', label: '加餐', icon: '🍪' }
      ],
      form: { mealType: 'breakfast', dishes: [], note: '', images: [], imageFileIDs: [] },
      dishInput: '',
      frequentDishes: [],
      uploading: false
    }
  },
  computed: {
    canSubmit() { return this.form.dishes.length > 0 },
    isEdit() { return !!this.editRecord }
  },
  watch: {
    visible(val) {
      if (val) { this.initForm(); this.loadFrequent() }
    }
  },
  methods: {
    noop() {}, // 空函数：仅用于拦截遮罩层 touchmove，防止背景滚动穿透
    initForm() {
      if (this.editRecord) {
        // 编辑模式：预填数据。
        // imageFileIDs 是提交用原值（cloud:// fileID）；images 是显示用 URL。
        // 先原样渲染 fileID，异步换成 https 临时链接（缓存命中时近乎即时）
        const fileIDs = [...(this.editRecord.images || [])]
        this.form = {
          mealType: this.editRecord.mealType,
          dishes: [...this.editRecord.dishes],
          note: this.editRecord.note || '',
          images: [...fileIDs],
          imageFileIDs: fileIDs
        }
        resolveImageURLs(fileIDs).then(urls => {
          // 异步返回时弹窗可能已关闭或切到别的记录，校验数组身份再赋值
          if (this.form.imageFileIDs === fileIDs) this.form.images = urls
        })
      } else {
        this.resetForm()
      }
      this.dishInput = ''
    },
    resetForm() {
      this.form = { mealType: 'breakfast', dishes: [], note: '', images: [], imageFileIDs: [] }
      this.dishInput = ''
    },
    loadFrequent() { this.frequentDishes = getFrequentDishes().slice(0, 15) },
    addDish() {
      const dish = this.dishInput.trim()
      if (dish && !this.form.dishes.includes(dish)) {
        this.form.dishes.push(dish)
        this.dishInput = ''
      }
    },
    quickAdd(name) {
      if (!this.form.dishes.includes(name)) { this.form.dishes.push(name) }
    },
    removeDish(idx) { this.form.dishes.splice(idx, 1) },
    removeFrequent(name) {
      removeFrequentDish(name)
      this.loadFrequent()
    },
    chooseImage() {
      const remain = 3 - this.form.images.length
      if (remain <= 0) return

      const addPaths = (paths) => {
        // 两个数组保持下标对齐：images 用于显示，imageFileIDs 用于提交
        paths.forEach(p => { this.form.images.push(p); this.form.imageFileIDs.push(p) })
      }
      const onFail = (err) => {
        const msg = (err && err.errMsg) || ''
        if (msg.indexOf('cancel') !== -1) return // 用户取消不算错误
        console.error('选择图片失败', err)
        uni.showToast({ title: '选择图片失败，请重试', icon: 'none' })
      }
      if (wx.canIUse('chooseMedia')) {
        wx.chooseMedia({
          count: remain,
          mediaType: ['image'],
          sizeType: ['compressed'],
          sourceType: ['album', 'camera'],
          success: (res) => addPaths(res.tempFiles.map(f => f.tempFilePath)),
          fail: onFail
        })
        return
      }
      uni.chooseImage({
        count: remain,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
        success: (res) => addPaths(res.tempFilePaths),
        fail: onFail
      })
    },
    removeImage(idx) {
      this.form.images.splice(idx, 1)
      this.form.imageFileIDs.splice(idx, 1)
    },
    previewImage(idx) {
      uni.previewImage({
        current: this.form.images[idx],
        urls: this.form.images
      })
    },
    async submit() {
      if (!this.canSubmit) return
      // 上传图片到云存储。遍历 imageFileIDs（提交用原值）：
      // cloud:// 开头 = 已上传的旧图，保留 fileID；其余 = 待上传的本地临时文件。
      // 不能遍历 form.images，里面可能是解析后的 https 临时链接，会被误判成新图导致丢失
      const imageFileIDs = []
      for (let i = 0; i < this.form.imageFileIDs.length; i++) {
        const filePath = this.form.imageFileIDs[i]
        if (filePath.startsWith('cloud://')) {
          imageFileIDs.push(filePath)
        } else {
          uni.showLoading({ title: '上传图片中...' })
          const fileID = await uploadImage(filePath)
          if (fileID) imageFileIDs.push(fileID)
          uni.hideLoading()
        }
      }
      const payload = {
        mealType: this.form.mealType,
        dishes: [...this.form.dishes],
        note: this.form.note,
        images: imageFileIDs
      }
      if (this.isEdit) {
        payload.id = this.editRecord.id
        this.$emit('update', payload)
      } else {
        this.$emit('submit', payload)
      }
      this.close()
    },
    close() { this.$emit('close') }
  }
}
</script>

<style lang="scss" scoped>
.meal-input-mask {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.5); z-index: 999;
  display: flex; align-items: flex-end;
}
.meal-input {
  width: 100%; background: #fff; border-radius: 24rpx 24rpx 0 0;
  padding: 30rpx; padding-bottom: calc(30rpx + env(safe-area-inset-bottom));
  max-height: 80vh; box-sizing: border-box;
}
.meal-input-section { margin-bottom: 30rpx; }
.meal-input-date-hint {
  display: inline-block; font-size: 26rpx; color: #4CAF50;
  background: #f0f9f0; padding: 12rpx 20rpx; border-radius: 8rpx;
}
.meal-input-label { display: block; font-size: 28rpx; font-weight: 600; color: #333; margin-bottom: 16rpx; }
.meal-input-types { display: flex; }
.meal-input-type-btn {
  flex: 1; display: flex; flex-direction: column; align-items: center;
  padding: 16rpx 0; border-radius: 12rpx; background: #f5f5f5;
  border: 2rpx solid transparent; margin-right: 16rpx;
}
.meal-input-type-btn:last-child { margin-right: 0; }
.meal-input-type-btn-active { background: #f0f9f0; border-color: #4CAF50; }
.meal-input-type-icon { font-size: 40rpx; margin-bottom: 6rpx; }
.meal-input-type-text { font-size: 24rpx; color: #666; }
.meal-input-dish-row { display: flex; }
.meal-input-input {
  flex: 1; height: 72rpx; padding: 0 20rpx;
  border: 2rpx solid #e5e5e5; border-radius: 12rpx; font-size: 28rpx;
}
.meal-input-add-btn {
  width: 120rpx; height: 72rpx; display: flex; align-items: center; justify-content: center;
  background: #4CAF50; color: #fff; border-radius: 12rpx; font-size: 28rpx; margin-left: 16rpx;
}
.meal-input-dishes { display: flex; flex-wrap: wrap; margin-top: 16rpx; }
.meal-input-dish-tag {
  display: flex; align-items: center; padding: 8rpx 16rpx;
  background: #f0f9f0; border-radius: 8rpx; font-size: 26rpx; color: #4CAF50; margin-right: 12rpx; margin-bottom: 8rpx;
}
.meal-input-dish-remove { font-size: 22rpx; color: #999; padding: 0 4rpx; margin-left: 8rpx; }
.meal-input-frequent { display: flex; flex-wrap: wrap; }
.meal-input-freq-tag {
  display: flex; align-items: center;
  padding: 8rpx 20rpx; background: #f8f8f8; border-radius: 8rpx;
  font-size: 26rpx; color: #666; margin-right: 12rpx; margin-bottom: 8rpx;
}
.meal-input-freq-remove { font-size: 20rpx; color: #bbb; padding: 0 4rpx; margin-left: 8rpx; }
.meal-input-textarea {
  width: 100%; height: 120rpx; padding: 16rpx;
  border: 2rpx solid #e5e5e5; border-radius: 12rpx; font-size: 28rpx; box-sizing: border-box;
}
.meal-input-images {
  display: flex; flex-wrap: wrap;
}
.meal-input-img-item {
  width: 160rpx; height: 160rpx; border-radius: 12rpx; overflow: hidden;
  position: relative; margin-right: 16rpx; margin-bottom: 16rpx;
}
.meal-input-img {
  width: 100%; height: 100%;
}
.meal-input-img-remove {
  position: absolute; top: 0; right: 0; width: 40rpx; height: 40rpx;
  background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center;
  border-radius: 0 12rpx 0 8rpx;
}
.meal-input-img-remove text { font-size: 22rpx; color: #fff; }
.meal-input-img-add {
  width: 160rpx; height: 160rpx; border: 2rpx dashed #ccc; border-radius: 12rpx;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
}
.meal-input-img-add-icon { font-size: 48rpx; color: #ccc; line-height: 1; }
.meal-input-img-add-text { font-size: 20rpx; color: #999; margin-top: 4rpx; }
.meal-input-img-hint { font-size: 22rpx; color: #bbb; margin-top: 4rpx; }
.meal-input-footer { display: flex; margin-top: 20rpx; }
.meal-input-cancel, .meal-input-submit {
  flex: 1; height: 80rpx; display: flex; align-items: center; justify-content: center;
  border-radius: 12rpx; font-size: 30rpx;
}
.meal-input-cancel { background: #f5f5f5; color: #666; margin-right: 20rpx; }
.meal-input-submit { background: #4CAF50; color: #fff; }
.meal-input-submit-disabled { opacity: 0.5; }
</style>