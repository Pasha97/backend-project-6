import 'dotenv/config';
import init from './src/app.js';

const start = async () => {
  const app = await init();
  const port = parseInt(process.env.PORT ?? '3000', 10);
  const host = process.env.HOST ?? '0.0.0.0';
  await app.listen({ port, host });
};

start();
