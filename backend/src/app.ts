import express, { Application, Request, Response } from 'express';
import config from './config/config.js';
import corsMiddleware from './config/cors.config.js';
import rateLimitMiddleware from './config/rateLimit.config.js';
import routes from './routes/index.js';
import loggerMiddleware from './middleware/logger.middleware.js';
import securityMiddleware from './middleware/security.middleware.js';
import { errorHandler } from './middleware/error.middleware.js';
import { notFoundHandler } from './middleware/notFound.middleware.js';
import { handleMongoErrors } from './validators/mongoValidation.validator.js';

const app: Application = express();

app.use(securityMiddleware);
app.use(corsMiddleware);
app.use('/api', rateLimitMiddleware);

app.use(loggerMiddleware);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(express.static('public'));
app.set('trust proxy', 1);

app.get('/', (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Welcome to AgriQCert API',
    version: '1.0.0',
    documentation: '/api/health',
  });
});

app.use(config.apiPrefix, routes);

app.use(handleMongoErrors);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
