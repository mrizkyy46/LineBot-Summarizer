import { createApp } from './app.js';
import { loadEnvironment } from './config/env.js';
import { createLineConfig } from './config/line.js';
import { createLogger } from './utils/logger.js';

const env = loadEnvironment();
const logger = createLogger();
const app = createApp({ lineConfig: createLineConfig(env), logger });

app.listen(env.PORT, () => {
  logger.info({ event: 'server_started', port: env.PORT, environment: env.NODE_ENV });
});
