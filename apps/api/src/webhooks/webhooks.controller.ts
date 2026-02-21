import {
    Controller, Get, Post, Query, Headers, Body, Res,
    Logger,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import * as crypto from 'crypto';
import { ApiTags, ApiExcludeEndpoint } from '@nestjs/swagger';

@ApiTags('Webhooks')
@Controller('webhooks/meta')
export class WebhooksController {
    private readonly logger = new Logger(WebhooksController.name);

    constructor(
        @InjectQueue('lead-capture') private readonly leadCaptureQueue: Queue,
    ) { }

    // ─── GET: Webhook Verification ───────────────────────────────────────────
    @ApiExcludeEndpoint()
    @Get('leads')
    verifyWebhook(
        @Query('hub.mode') mode: string,
        @Query('hub.verify_token') token: string,
        @Query('hub.challenge') challenge: string,
        @Res() res: any,
    ) {
        const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN || 'medgrowth-lead-verify';

        if (mode === 'subscribe' && token === verifyToken) {
            this.logger.log('META Webhook verified successfully.');
            return res.status(200).send(challenge);
        }

        this.logger.warn(`Webhook verification failed. mode=${mode}, token=${token}`);
        return res.status(403).send({ error: 'Verification failed' });
    }

    // ─── POST: Receive Lead Events ────────────────────────────────────────────
    @ApiExcludeEndpoint()
    @Post('leads')
    async receiveLeadEvent(
        @Headers('x-hub-signature-256') signature: string,
        @Body() body: any,
        @Res() res: any,
    ) {
        // Always return 200 fast — process async via BullMQ
        res.status(200).send({ status: 'ok' });

        try {
            // Validate signature if APP_SECRET is configured
            const appSecret = process.env.META_APP_SECRET;
            if (appSecret && signature) {
                const rawBody = Buffer.isBuffer(body)
                    ? body
                    : Buffer.from(JSON.stringify(body));
                const expectedSig = 'sha256=' + crypto
                    .createHmac('sha256', appSecret)
                    .update(rawBody)
                    .digest('hex');

                if (signature !== expectedSig) {
                    this.logger.warn('Invalid META webhook signature — ignoring event.');
                    return;
                }
            }

            // Extract leadgen entries
            const payload = typeof body === 'string' ? JSON.parse(body) : body;
            const entries: any[] = payload?.entry || [];

            for (const entry of entries) {
                const changes: any[] = entry?.changes || [];
                for (const change of changes) {
                    if (change.field === 'leadgen') {
                        const value = change.value;
                        this.logger.log(`Enqueuing leadgen_id=${value.leadgen_id} page=${value.page_id}`);
                        await this.leadCaptureQueue.add('process-meta-lead', {
                            leadgenId: value.leadgen_id,
                            pageId: value.page_id,
                            adId: value.ad_id,
                            adgroupId: value.adgroup_id,
                            formId: value.form_id,
                            createdTime: value.created_time,
                            rawPayload: value,
                        }, {
                            attempts: 3,
                            backoff: { type: 'exponential', delay: 2000 },
                            removeOnComplete: 100,
                            removeOnFail: 100,
                        });
                    }
                }
            }
        } catch (err) {
            this.logger.error('Error processing META webhook event', err);
        }
    }
}
