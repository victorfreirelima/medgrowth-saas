import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bullmq';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-yet';
import * as Sentry from '@sentry/nestjs';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ClientsModule } from './clients/clients.module';
import { LeadsModule } from './leads/leads.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { AdsModule } from './ads/ads.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { IngestModule } from './ingest/ingest.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { AppController } from './app.controller';
import { PublicController } from './public.controller';

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        ThrottlerModule.forRoot([{
            ttl: 60000,
            limit: 100,
        }]),
        CacheModule.registerAsync({
            isGlobal: true,
            imports: [ConfigModule],
            useFactory: async (config: ConfigService) => {
                let url = config.get('REDIS_URL');
                if (!url) {
                    const host = config.get('REDIS_HOST', 'localhost');
                    const port = config.get('REDIS_PORT', 6379);
                    url = `redis://${host}:${port}`;
                }
                const store = await redisStore({ url, ttl: 1800000 }); // 30 mins defaults
                return { store };
            },
            inject: [ConfigService],
        }),
        BullModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: (config: ConfigService) => {
                const redisUrl = config.get('REDIS_URL');
                if (redisUrl) {
                    try {
                        const url = new URL(redisUrl);
                        return {
                            connection: {
                                host: url.hostname,
                                port: parseInt(url.port, 10),
                                username: url.username || undefined,
                                password: url.password || undefined,
                            },
                        };
                    } catch (e) {
                        console.error('Failed to parse REDIS_URL', e);
                    }
                }
                return {
                    connection: {
                        host: config.get('REDIS_HOST', 'localhost'),
                        port: config.get('REDIS_PORT', 6379),
                    },
                };
            },
            inject: [ConfigService],
        }),
        PrismaModule,
        AuthModule,
        UsersModule,
        ClientsModule,
        LeadsModule,
        AppointmentsModule,
        DashboardModule,
        AdsModule,
        WebhooksModule,
        IngestModule,
        IntegrationsModule,
    ],
    controllers: [AppController, PublicController]
})
export class AppModule { }
