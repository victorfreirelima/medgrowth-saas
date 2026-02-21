import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { WebhooksController } from './webhooks.controller';
import { LeadCaptureProcessor } from './lead-capture.processor';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [
        PrismaModule,
        BullModule.registerQueue({ name: 'lead-capture' }),
    ],
    controllers: [WebhooksController],
    providers: [LeadCaptureProcessor],
})
export class WebhooksModule { }
