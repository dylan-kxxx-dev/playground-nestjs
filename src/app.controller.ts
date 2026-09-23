import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { CatsService } from './cats/cats.service';
import { ApiExcludeController } from '@nestjs/swagger';

@ApiExcludeController()
@Controller()
export class AppController {
    constructor(
        private readonly appService: AppService,
        private readonly catsService: CatsService,
    ) {}

    @Get()
    getHello(): string {
        return this.appService.getHello();
    }

    @Get('cat-count')
    count() {
        return { count: this.catsService.findAll().length };
    }
}
