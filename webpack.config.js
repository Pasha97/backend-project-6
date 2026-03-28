import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';

// Получаем путь к текущей директории
const __dirname = dirname(fileURLToPath(import.meta.url));

export default {
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