import { AuthUser } from '../common/interfaces/auth-user.interface';
import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto, UpdateAppointmentDto, AppointmentFiltersDto } from './dto/appointment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Appointments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('appointments')
export class AppointmentsController {
    constructor(private readonly appointmentsService: AppointmentsService) { }

    @Get() findAll(@CurrentUser() user: AuthUser, @Query() filters: AppointmentFiltersDto) {
        return this.appointmentsService.findAll(user, filters);
    }
    @Get(':id') findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
        return this.appointmentsService.findOne(user, id);
    }
    @Post() create(@CurrentUser() user: AuthUser, @Body() dto: CreateAppointmentDto) {
        return this.appointmentsService.create(user, dto);
    }
    @Patch(':id') update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateAppointmentDto) {
        return this.appointmentsService.update(user, id, dto);
    }
    @Delete(':id') remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
        return this.appointmentsService.remove(user, id);
    }
}
