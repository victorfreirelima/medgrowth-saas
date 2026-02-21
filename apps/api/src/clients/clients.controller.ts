import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum } from 'class-validator';
import { UserRole, ClientStatus } from '@prisma/client';
import { ClientsService } from './clients.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

class CreateClientDto {
    @IsString() name: string;
    @IsString() slug: string;
    @IsOptional() @IsString() specialty?: string;
    @IsOptional() @IsString() city?: string;
    @IsOptional() @IsString() notes?: string;
    @IsOptional() @IsString() logoUrl?: string;
}

class UpdateClientDto {
    @IsOptional() @IsString() name?: string;
    @IsOptional() @IsString() slug?: string;
    @IsOptional() @IsString() specialty?: string;
    @IsOptional() @IsString() city?: string;
    @IsOptional() @IsString() notes?: string;
    @IsOptional() @IsString() logoUrl?: string;
    @IsOptional() @IsEnum(ClientStatus) status?: ClientStatus;
}

@ApiTags('Clients')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('clients')
export class ClientsController {
    constructor(private readonly clientsService: ClientsService) { }

    @Get()
    findAll(
        @CurrentUser() user: any,
        @Query('status') status?: ClientStatus
    ) {
        return this.clientsService.findAll(user, status);
    }

    @Get(':id')
    findOne(@CurrentUser() user: any, @Param('id') id: string) {
        return this.clientsService.findOne(user, id);
    }

    @Post()
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN)
    create(@Body() dto: CreateClientDto) {
        return this.clientsService.create(dto);
    }

    @Patch(':id')
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN)
    update(@Param('id') id: string, @Body() dto: UpdateClientDto) {
        return this.clientsService.update(id, dto);
    }

    @Delete(':id')
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN)
    remove(@Param('id') id: string) {
        return this.clientsService.remove(id);
    }
}
