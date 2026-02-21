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
    findAll(@CurrentUser() user: any, @Query() filters: LeadFiltersDto) {
        return this.leadsService.findAll(user, filters);
    }

    @Get('funnel')
    getFunnelMetrics(@CurrentUser() user: any, @Query('clientId') clientId?: string) {
        return this.leadsService.getFunnelMetrics(user, clientId);
    }

    @Get('roi')
    getROIMetrics(@CurrentUser() user: any, @Query('clientId') clientId: string) {
        return this.leadsService.getROIMetrics(user, clientId);
    }

    @Get('fix-encoding')
    async fixEncoding() {
        const clients = await this.leadsService.prisma.client.findMany();
        let fixedCount = 0;
        for (const client of clients) {
            const hasBadChar = (str?: string | null) => str && str.includes('\uFFFD');
            if (hasBadChar(client.name) || hasBadChar(client.city)) {
                const fix = (str?: string | null) => {
                    if (!str) return str;
                    return str
                        .replace(/Clnica/g, 'Clínica')
                        .replace(/Automaro/g, 'Automação')
                        .replace(/Automao/g, 'Automação')
                        .replace(/So/g, 'São')
                        .replace(/So Paulo/g, 'São Paulo')
                        .replace(/Joo/g, 'João')
                        .replace(/\uFFFD/g, 'ã');
                };
                await this.leadsService.prisma.client.update({
                    where: { id: client.id },
                    data: { name: fix(client.name) as string, city: fix(client.city) }
                });
                fixedCount++;
            }
        }
        return { success: true, fixedCount };
    }

    @Get(':id')
    findOne(@CurrentUser() user: any, @Param('id') id: string) {
        return this.leadsService.findOne(user, id);
    }

    @Post(':clientId')
    create(
        @CurrentUser() user: any,
        @Param('clientId') clientId: string,
        @Body() dto: CreateLeadDto,
    ) {
        return this.leadsService.create(user, clientId, dto);
    }

    @Patch(':id')
    update(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdateLeadDto) {
        return this.leadsService.update(user, id, dto);
    }

    @Delete(':id')
    remove(@CurrentUser() user: any, @Param('id') id: string) {
        return this.leadsService.remove(user, id);
    }

    @Post(':id/notes')
    addNote(
        @CurrentUser() user: any,
        @Param('id') id: string,
        @Body() dto: CreateLeadNoteDto,
    ) {
        return this.leadsService.addNote(user, id, dto);
    }
}
