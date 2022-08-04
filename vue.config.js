const path = require('path');

module.exports = {
  publicPath: '/',
  chainWebpack: conf => {
    conf.entry('app')
        .clear()
        .add('./client/main.js')
        .end();
    conf.resolve
        .alias
        .set('@', path.join(__dirname, './client'))
    conf.module.rule('svg').clear();
  },
  configureWebpack: {
    devServer: {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
      }
    },
    module: {
      rules: [{
        test: /assets\/icons\/.*\.svg$/,
        loader: 'vue-svg-loader'
      }, {
        test: /bytesize-icons\/.*\.svg$/,
        loader: 'vue-svg-loader'
      }, {
        test: /\.mp3$/,
        loader: 'file-loader'
      }]
    }
  }
}
