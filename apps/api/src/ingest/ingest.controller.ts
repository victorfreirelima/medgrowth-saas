import {
    Controller, Post, Param, Body, Headers,
    UnauthorizedException, BadRequestException, Logger, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { IsString, IsOptional, IsEmail } from 'class-validator';
import { IngestService } from './ingest.service';

class IngestLeadDto {
    @IsString() name: string;
    @IsOptional() @IsString() phone?: string;
    @IsOptional() @IsEmail() email?: string;
    @IsOptional() @IsString() message?: string;
    @IsOptional() @IsString() form_name?: string;
    @IsOptional() @IsString() page_url?: string;
    @IsOptional() @IsString() referrer?: string;
    @IsOptional() @IsString() utm_source?: string;
    @IsOptional() @IsString() utm_medium?: string;
    @IsOptional() @IsString() utm_campaign?: string;
    @IsOptional() @IsString() utm_content?: string;
    @IsOptional() @IsString() utm_term?: string;
    @IsOptional() @IsString() gclid?: string;
    @IsOptional() @IsString() wbraid?: string;
    @IsOptional() @IsString() gbraid?: string;
    @IsOptional() @IsString() fbclid?: string;
    @IsOptional() @IsString() device?: string;
    @IsOptional() @IsString() timezone?: string;
}

@ApiTags('Ingest')
@Controller('ingest')
export class IngestController {
    private readonly logger = new Logger(IngestController.name);

    constructor(private readonly ingestService: IngestService) { }

    @Post('leads/:clientSlug')
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Ingest a lead from landing page or WhatsApp (authenticated via X-CLIENT-KEY)' })
    async ingestLead(
        @Param('clientSlug') clientSlug: string,
        @Headers('x-client-key') apiKey: string,
        @Body() dto: IngestLeadDto,
    ) {
        if (!apiKey) {
            throw new UnauthorizedException('Missing X-CLIENT-KEY header.');
        }
        if (!dto.name?.trim()) {
            throw new BadRequestException('Field "name" is required.');
        }

        const lead = await this.ingestService.ingestLead(clientSlug, apiKey, dto);
        this.logger.log(`[INGEST] Lead created: id=${lead.id} client=${clientSlug} source=${lead.source}`);
        return { success: true, leadId: lead.id };
    }
}
