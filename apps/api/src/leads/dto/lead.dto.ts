import {
    IsEnum, IsOptional, IsString, IsUUID, IsDateString, IsEmail, IsInt, Min, Max,
} from 'class-validator';
import { ApiPropertyOptional, PartialType, ApiProperty } from '@nestjs/swagger';
import { LeadChannel, LeadStatus } from '@prisma/client';
import { Type } from 'class-transformer';

export class CreateLeadDto {
    @ApiProperty() @IsString() name: string;
    @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
    @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
    @ApiPropertyOptional() @IsOptional() @IsString() origin?: string;
    @ApiPropertyOptional({ enum: LeadChannel }) @IsOptional() @IsEnum(LeadChannel) channel?: LeadChannel;
    @ApiPropertyOptional() @IsOptional() @IsString() campaignId?: string;
    @ApiPropertyOptional() @IsOptional() @IsString() campaignName?: string;
    @ApiPropertyOptional({ enum: LeadStatus }) @IsOptional() @IsEnum(LeadStatus) status?: LeadStatus;
    @ApiPropertyOptional() @IsOptional() @IsUUID() assignedToId?: string;
    @ApiPropertyOptional() @IsOptional() @IsString() observations?: string;
    @ApiPropertyOptional() @IsOptional() @IsString() utmSource?: string;
    @ApiPropertyOptional() @IsOptional() @IsString() utmMedium?: string;
    @ApiPropertyOptional() @IsOptional() @IsString() utmCampaign?: string;
    @ApiPropertyOptional() @IsOptional() @IsString() utmContent?: string;
    @ApiPropertyOptional() @IsOptional() @IsString() utmTerm?: string;
    @ApiPropertyOptional() @IsOptional() @IsString() gclid?: string;
    @ApiPropertyOptional() @IsOptional() @IsString() fbclid?: string;
    @ApiPropertyOptional() @IsOptional() @IsInt() revenue?: number;
    @ApiPropertyOptional() @IsOptional() @IsString() lostReason?: string;
    @ApiPropertyOptional() @IsOptional() @IsDateString() appointmentDate?: string;
}

export class UpdateLeadDto extends PartialType(CreateLeadDto) { }

export class CreateLeadNoteDto {
    @ApiProperty() @IsString() content: string;
}

export class LeadFiltersDto {
    @ApiPropertyOptional() @IsOptional() @IsUUID() clientId?: string;
    @ApiPropertyOptional({ enum: LeadStatus }) @IsOptional() @IsEnum(LeadStatus) status?: LeadStatus;
    @ApiPropertyOptional({ enum: LeadChannel }) @IsOptional() @IsEnum(LeadChannel) channel?: LeadChannel;
    @ApiPropertyOptional() @IsOptional() @IsUUID() assignedToId?: string;
    @ApiPropertyOptional() @IsOptional() @IsDateString() dateFrom?: string;
    @ApiPropertyOptional() @IsOptional() @IsDateString() dateTo?: string;
    @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
    @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1;
    @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number = 20;
}
