import { AuthUser } from '../common/interfaces/auth-user.interface';
import {
    Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { LeadsService } from './leads.service';
import { CreateLeadDto, UpdateLeadDto, CreateLeadNoteDto, LeadFiltersDto } from './dto/lead.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Leads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('leads')
export class LeadsController {
    constructor(private readonly leadsService: LeadsService) { }

    @Get()
    findAll(@CurrentUser() user: AuthUser, @Query() filters: LeadFiltersDto) {
        return this.leadsService.findAll(user, filters);
    }

    @Get('funnel')
    getFunnelMetrics(@CurrentUser() user: AuthUser, @Query('clientId') clientId?: string) {
        return this.leadsService.getFunnelMetrics(user, clientId);
    }

    @Get('roi')
    getROIMetrics(@CurrentUser() user: AuthUser, @Query('clientId') clientId: string) {
        return this.leadsService.getROIMetrics(user, clientId);
    }

    @Get(':id')
    findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
        return this.leadsService.findOne(user, id);
    }

    @Post(':clientId')
    create(
        @CurrentUser() user: AuthUser,
        @Param('clientId') clientId: string,
        @Body() dto: CreateLeadDto,
    ) {
        return this.leadsService.create(user, clientId, dto);
    }

    @Patch(':id')
    update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateLeadDto) {
        return this.leadsService.update(user, id, dto);
    }

    @Delete(':id')
    remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
        return this.leadsService.remove(user, id);
    }

    @Post(':id/notes')
    addNote(
        @CurrentUser() user: AuthUser,
        @Param('id') id: string,
        @Body() dto: CreateLeadNoteDto,
    ) {
        return this.leadsService.addNote(user, id, dto);
    }
}
