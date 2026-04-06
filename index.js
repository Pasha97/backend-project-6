import 'dotenv/config';
import { fileURLToPath } from 'node:url';
import buildApp, { init } from './src/app.js';

export { init };
export default buildApp;

const isMain = process.argv[1] === fileURLToPath(import.meta.url);

if (isMain) {
  const PORT = process.env.PORT ?? 3000;
  const HOST = process.env.HOST ?? '0.0.0.0';

  const app = buildApp({ logger: true });
  try {
    await app.listen({ port: Number(PORT), host: HOST });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}
