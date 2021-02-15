/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-var-requires */
var CopyWebpackPlugin = require('copy-webpack-plugin')

module.exports = (env, argv) => ({
  entry: './src/App.ts',
  devtool: 'source-map',
  output: {
    path: __dirname + '/dist',
    filename: 'js/bundle.js'
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  module: {
    rules: [
      { test: /\.ts$/, loader: 'ts-loader' }
    ]
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        { from: 'public', to: '' }
      ]
    })
  ]
})
