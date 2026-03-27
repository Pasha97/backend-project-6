import 'dotenv/config';
import buildApp from './src/app.js';

const PORT = process.env.PORT ?? 3000;
const HOST = process.env.HOST ?? '0.0.0.0';

const start = async () => {
  const app = buildApp({ logger: true });
  try {
    await app.listen({ port: Number(PORT), host: HOST });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
