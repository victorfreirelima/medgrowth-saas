import { IsEnum, IsOptional, IsString, IsDateString, IsUUID, IsInt, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { AppointmentStatus } from '@prisma/client';
import { Type } from 'class-transformer';

export class CreateAppointmentDto {
    @ApiProperty() @IsUUID() leadId: string;
    @ApiProperty() @IsDateString() dateTime: string;
    @ApiPropertyOptional() @IsOptional() @IsString() procedure?: string;
    @ApiPropertyOptional({ enum: AppointmentStatus }) @IsOptional() @IsEnum(AppointmentStatus) status?: AppointmentStatus;
    @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class UpdateAppointmentDto extends PartialType(CreateAppointmentDto) { }

export class AppointmentFiltersDto {
    @ApiPropertyOptional() @IsOptional() @IsUUID() clientId?: string;
    @ApiPropertyOptional({ enum: AppointmentStatus }) @IsOptional() @IsEnum(AppointmentStatus) status?: AppointmentStatus;
    @ApiPropertyOptional() @IsOptional() @IsDateString() dateFrom?: string;
    @ApiPropertyOptional() @IsOptional() @IsDateString() dateTo?: string;
    @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1;
    @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number = 20;
}
