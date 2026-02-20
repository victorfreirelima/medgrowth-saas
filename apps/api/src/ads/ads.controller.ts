import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { IsEnum, IsString, IsOptional, IsUUID } from 'class-validator';
import { AdChannel } from '@prisma/client';
import { AdsService } from './ads.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

class CreateConnectionDto {
    @IsUUID() clientId: string;
    @IsEnum(AdChannel) channel: AdChannel;
    @IsString() accountId: string;
    @IsOptional() @IsString() accountName?: string;
    @IsString() accessToken: string;
    @IsOptional() @IsString() refreshToken?: string;
}

@ApiTags('Ads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ads')
export class AdsController {
    constructor(private readonly adsService: AdsService) { }

    @Get('connections')
    getConnections(@CurrentUser() user: any, @Query('clientId') clientId?: string) {
        return this.adsService.getConnections(user, clientId);
    }

    @Post('connections')
    createConnection(@CurrentUser() user: any, @Body() dto: CreateConnectionDto) {
        return this.adsService.createConnection(user, dto);
    }

    @Delete('connections/:id')
    deleteConnection(@CurrentUser() user: any, @Param('id') id: string) {
        return this.adsService.deleteConnection(user, id);
    }

    @Post('connections/:id/sync')
    triggerSync(@CurrentUser() user: any, @Param('id') id: string) {
        return this.adsService.triggerSync(user, id);
    }

    @Get('meta/oauth-url')
    getMetaOAuthUrl(@Query('clientId') clientId: string) {
        return this.adsService.getMetaOAuthUrl(clientId);
    }

    @Get('google/oauth-url')
    getGoogleOAuthUrl(@Query('clientId') clientId: string) {
        return this.adsService.getGoogleOAuthUrl(clientId);
    }
}
