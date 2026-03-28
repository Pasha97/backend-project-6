import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import path from 'path';

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
