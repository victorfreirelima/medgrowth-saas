import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto, AssignClientDto } from './dto/user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Get() findAll() { return this.usersService.findAll(); }
    @Get(':id') findOne(@Param('id') id: string) { return this.usersService.findOne(id); }
    @Post() create(@Body() dto: CreateUserDto) { return this.usersService.create(dto); }
    @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
        return this.usersService.update(id, dto);
    }
    @Delete(':id') remove(@Param('id') id: string) { return this.usersService.remove(id); }
    @Patch(':id/clients') assignClients(@Param('id') id: string, @Body() dto: AssignClientDto) {
        return this.usersService.assignClients(id, dto.clientIds);
    }
}
