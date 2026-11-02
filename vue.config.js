// 让 uni-app 编译时把云函数目录复制到产物中，
// 这样微信开发者工具（打开 dist 目录）才能识别并上传云函数
const CopyWebpackPlugin = require('copy-webpack-plugin')

const plugins = []
if (process.env.UNI_PLATFORM === 'mp-weixin') {
  plugins.push(
    new CopyWebpackPlugin({
      patterns: [{ from: 'cloudfunctions', to: 'cloudfunctions' }]
    })
  )
}

module.exports = {
  configureWebpack: { plugins }
}
