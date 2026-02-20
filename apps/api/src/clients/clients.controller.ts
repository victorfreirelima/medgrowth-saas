import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';
import { UserRole } from '@prisma/client';
import { ClientsService } from './clients.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

class CreateClientDto {
    @IsString() name: string;
    @IsString() slug: string;
    @IsOptional() @IsString() logoUrl?: string;
}

@ApiTags('Clients')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('clients')
export class ClientsController {
    constructor(private readonly clientsService: ClientsService) { }

    @Get() findAll(@CurrentUser() user: any) { return this.clientsService.findAll(user); }
    @Get(':id') findOne(@CurrentUser() user: any, @Param('id') id: string) {
        return this.clientsService.findOne(user, id);
    }

    @Post()
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN)
    create(@Body() dto: CreateClientDto) { return this.clientsService.create(dto); }

    @Patch(':id')
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN)
    update(@Param('id') id: string, @Body() dto: Partial<CreateClientDto>) {
        return this.clientsService.update(id, dto);
    }
}
