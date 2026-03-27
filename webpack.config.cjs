const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const path = require('path');

module.exports = {
  mode: 'development',
  entry: './frontend/index.js',
  output: {
    filename: 'main.js',
    path: path.resolve(__dirname, 'public', 'assets'),
  },
  plugins: [
    new MiniCssExtractPlugin({ filename: 'main.css' }),
  ],
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader'],
      },
    ],
  },
};
