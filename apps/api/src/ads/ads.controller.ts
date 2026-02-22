import { AuthUser } from '../common/interfaces/auth-user.interface';
import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, BadRequestException } from '@nestjs/common';
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
@Controller('ads')
export class AdsController {
    constructor(private readonly adsService: AdsService) { }

    @Get('connections')
    @UseGuards(JwtAuthGuard)
    getConnections(@CurrentUser() user: AuthUser, @Query('clientId') clientId?: string) {
        return this.adsService.getConnections(user, clientId);
    }

    @Post('connections')
    @UseGuards(JwtAuthGuard)
    createConnection(@CurrentUser() user: AuthUser, @Body() dto: CreateConnectionDto) {
        return this.adsService.createConnection(user, dto);
    }

    @Delete('connections/:id')
    @UseGuards(JwtAuthGuard)
    deleteConnection(@CurrentUser() user: AuthUser, @Param('id') id: string) {
        return this.adsService.deleteConnection(user, id);
    }

    @Post('connections/:id/sync')
    @UseGuards(JwtAuthGuard)
    triggerSync(@CurrentUser() user: AuthUser, @Param('id') id: string) {
        return this.adsService.triggerSync(user, id);
    }

    @Get('meta/oauth-url')
    @UseGuards(JwtAuthGuard)
    getMetaOAuthUrl(@Query('clientId') clientId: string) {
        return this.adsService.getMetaOAuthUrl(clientId);
    }

    @Get('google/oauth-url')
    @UseGuards(JwtAuthGuard)
    getGoogleOAuthUrl(@Query('clientId') clientId: string) {
        return this.adsService.getGoogleOAuthUrl(clientId);
    }

    @Get('meta/callback')
    async metaCallback(@Query('code') code: string, @Query('state') state: string) {
        if (!code || !state) throw new BadRequestException('Missing authorization code or state');
        await this.adsService.handleMetaCallback(code, state);
        return { message: 'Meta Ads connected successfully. You can close this window.' };
    }

    @Get('google/callback')
    async googleCallback(@Query('code') code: string, @Query('state') state: string) {
        if (!code || !state) throw new BadRequestException('Missing authorization code or state');
        await this.adsService.handleGoogleCallback(code, state);
        return { message: 'Google Ads connected successfully. You can close this window.' };
    }
}
