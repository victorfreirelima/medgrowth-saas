import { NestFactory, BaseExceptionFilter } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe, Logger, RawBodyRequest } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as Sentry from '@sentry/nestjs';
import { nodeProfilingIntegration } from "@sentry/profiling-node";
import { AppModule } from './app.module';

async function bootstrap() {
    const logger = new Logger('Bootstrap');

    // Initialize Sentry before the app
    if (process.env.SENTRY_DSN) {
        Sentry.init({
            dsn: process.env.SENTRY_DSN,
            integrations: [
                nodeProfilingIntegration(),
            ],
            tracesSampleRate: 1.0,
            profilesSampleRate: 1.0,
            environment: process.env.NODE_ENV || 'development',
        });
        logger.log('Sentry initialized');
    }

    const app = await NestFactory.create<NestFastifyApplication>(
        AppModule,
        new FastifyAdapter({ logger: false }),
        { rawBody: true }, // Enable raw body for signature validation
    );

    if (process.env.SENTRY_DSN) {
        Sentry.setupFastifyErrorHandler(app.getHttpAdapter().getInstance());
    }

    // CORS
    app.enableCors({
        origin: (origin, callback) => {
            const allowed = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
            if (!origin || allowed.includes(origin) || origin.endsWith('.vercel.app')) {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Client-Id'],
    });

    // Global validation pipe
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
            transformOptions: { enableImplicitConversion: true },
        }),
    );

    // Swagger
    const config = new DocumentBuilder()
        .setTitle('MedGrowth API')
        .setDescription('Medical Marketing Agency SaaS API')
        .setVersion('1.0')
        .addBearerAuth()
        .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);

    const port = process.env.PORT || 3001;
    await app.listen(port, '0.0.0.0');
    logger.log(`🚀 API running on http://localhost:${port}`);
    logger.log(`📖 Swagger docs: http://localhost:${port}/docs`);
}

bootstrap();
