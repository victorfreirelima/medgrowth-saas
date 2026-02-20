import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
    @Get('health')
    getHealth() {
        return {
            status: 'ok',
            env: process.env.NODE_ENV || 'production',
        };
    }
}
