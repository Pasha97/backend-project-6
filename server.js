import 'dotenv/config';
import { fileURLToPath } from 'node:url';
import init from './src/app.js';

const isMain = process.argv[1] === fileURLToPath(import.meta.url);

if (isMain) {
  const PORT = process.env.PORT ?? 3000;
  const HOST = process.env.HOST ?? '0.0.0.0';

  try {
    const app = await init();
    await app.listen({ port: Number(PORT), host: HOST });
    console.log(`Server listening at http://${HOST}:${PORT}`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
