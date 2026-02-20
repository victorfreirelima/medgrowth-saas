import { Controller, Post, Body, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto, RefreshTokenDto } from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('login')
    async login(@Body() dto: LoginDto) {
        return this.authService.login(dto.email, dto.password);
    }

    @Post('refresh')
    async refresh(@Body() dto: RefreshTokenDto) {
        // Verify refresh token manually and re-issue
        const jwtService = (this.authService as any).jwtService;
        const payload = jwtService.verify(dto.refreshToken, {
            secret: process.env.JWT_REFRESH_SECRET,
        });
        return this.authService.refreshTokens(
            payload.sub,
            payload.email,
            payload.role,
            payload.clientIds,
        );
    }

    @Get('me')
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    async getProfile(@CurrentUser('id') userId: string) {
        return this.authService.getProfile(userId);
    }
}
