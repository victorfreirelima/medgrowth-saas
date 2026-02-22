import { AuthUser } from '../common/interfaces/auth-user.interface';
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
    constructor(private readonly dashboardService: DashboardService) { }

    @Get('kpis')
    getKPIs(
        @CurrentUser() user: AuthUser,
        @Query('clientId') clientId?: string,
        @Query('dateFrom') dateFrom?: string,
        @Query('dateTo') dateTo?: string,
    ) {
        return this.dashboardService.getKPIs(user, clientId, dateFrom, dateTo);
    }

    @Get('time-series')
    getTimeSeries(
        @CurrentUser() user: AuthUser,
        @Query('clientId') clientId?: string,
        @Query('days') days?: string,
    ) {
        return this.dashboardService.getTimeSeries(user, clientId, days ? parseInt(days) : 30);
    }

    @Get('campaigns')
    getCampaigns(
        @CurrentUser() user: AuthUser,
        @Query('clientId') clientId?: string,
        @Query('dateFrom') dateFrom?: string,
        @Query('dateTo') dateTo?: string,
    ) {
        return this.dashboardService.getCampaigns(user, clientId, dateFrom, dateTo);
    }
}
