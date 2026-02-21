import {
    Controller, Get, Post, Body, Param, UseGuards, Query, Logger,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { IntegrationsService } from './integrations.service';

class SaveIntegrationDto {
    @IsString() clientId: string;
    @IsString() provider: string;
    @IsOptional() @IsString() pageId?: string;
    @IsOptional() @IsString() formId?: string;
    @IsOptional() @IsString() pageName?: string;
    @IsOptional() @IsString() formName?: string;
    @IsOptional() @IsBoolean() enabled?: boolean;
}

@ApiTags('Integrations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('integrations')
export class IntegrationsController {
    private readonly logger = new Logger(IntegrationsController.name);

    constructor(private readonly service: IntegrationsService) { }

    /** List all integrations (optionally filter by clientId) */
    @Get()
    @ApiOperation({ summary: 'List client integrations' })
    list(@Query('clientId') clientId?: string) {
        return this.service.list(clientId);
    }

    /** Get or create integration for a client+provider */
    @Post()
    @ApiOperation({ summary: 'Save/upsert a client integration config' })
    save(@Body() dto: SaveIntegrationDto) {
        return this.service.upsert(dto);
    }

    /** Fetch META Pages accessible to a client (uses existing AdAccountConnection token) */
    @Get('meta/pages')
    @ApiOperation({ summary: 'List META Pages for a client' })
    getMetaPages(@Query('clientId') clientId: string) {
        return this.service.getMetaPages(clientId);
    }

    /** Fetch Lead Forms for a META Page */
    @Get('meta/pages/:pageId/forms')
    @ApiOperation({ summary: 'List META Lead Forms for a Page' })
    getMetaForms(
        @Param('pageId') pageId: string,
        @Query('clientId') clientId: string,
    ) {
        return this.service.getMetaForms(clientId, pageId);
    }

    /** Subscribe the page to the leadgen webhook */
    @Post('meta/subscribe')
    @ApiOperation({ summary: 'Subscribe META Page to leadgen webhook' })
    subscribe(@Body() dto: { clientId: string; pageId: string }) {
        return this.service.subscribePageToWebhook(dto.clientId, dto.pageId);
    }

    /** Generate/rotate the ingest API key for a client */
    @Post('ingest-key/rotate')
    @ApiOperation({ summary: 'Rotate the ingest API key for a client' })
    rotateKey(@Body() dto: { clientId: string }) {
        return this.service.rotateApiKey(dto.clientId);
    }

    /** Send a test lead via ingest endpoint */
    @Post('ingest-test')
    @ApiOperation({ summary: 'Send a test lead to verify the ingest endpoint' })
    testIngest(@Body() dto: { clientSlug: string; apiKey: string }) {
        return this.service.sendTestLead(dto.clientSlug, dto.apiKey);
    }
}
