import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import { fileURLToPath } from 'node:url';
import path, { dirname } from 'node:path';

// Получаем путь к текущей директории
const __dirname = dirname(fileURLToPath(import.meta.url));
const mode = process.env.NODE_ENV || 'development';

export default {
  mode,
  entry: './src/index.js',
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
