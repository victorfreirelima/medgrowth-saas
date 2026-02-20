import {
    IsEmail, IsEnum, IsOptional, IsString, MinLength, IsBoolean, IsArray, IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

export class CreateUserDto {
    @ApiProperty() @IsEmail() email: string;
    @ApiProperty() @IsString() name: string;
    @ApiProperty() @IsString() @MinLength(8) password: string;
    @ApiProperty({ enum: UserRole }) @IsEnum(UserRole) role: UserRole;
    @ApiPropertyOptional() @IsOptional() @IsArray() @IsUUID('4', { each: true }) clientIds?: string[];
}

export class UpdateUserDto extends PartialType(CreateUserDto) { }
export class AssignClientDto {
    @ApiProperty({ type: [String] }) @IsArray() @IsUUID('4', { each: true }) clientIds: string[];
}
