import { Body, Param, Controller, Delete, Get, Post, Put } from '@nestjs/common';

@Controller('cats')
export class CatsController {
    @Get()
    findAll(): string {
        return 'This action returns all cats';
    }
    @Get(':id')
    findOne(@Param('id') id: string): string {
        return `This action returns a #${id} cat`;
    }
    @Put(':id')
    update(@Param('id') id: string, @Body() updateCatDto: any) {
        return `This action updates a #${id} cat`;
    }
    @Post()
    create(@Body() createCatDto: any) {
        return 'This action adds a new cat';
    }
    @Delete(':id')
    remove(@Param('id') id: string) {
        return `This action removes a #${id} cat`;
    }
}
