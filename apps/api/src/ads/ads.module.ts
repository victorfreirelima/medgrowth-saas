import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AdsService } from './ads.service';
import { AdsController } from './ads.controller';
import { AdsSyncProcessor } from './ads.processor';

@Module({
    imports: [
        BullModule.registerQueue({
            name: 'ads-sync',
        }),
    ],
    controllers: [AdsController],
    providers: [AdsService, AdsSyncProcessor],
})
export class AdsModule { }
