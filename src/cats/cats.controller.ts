import { Body, Param, Controller, Delete, Get, Post, Put } from '@nestjs/common';
import { UpdateCatDto } from './dto/update-cat.dto';
import { CreateCatDto } from './dto/create-cat.dto';

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
    update(@Param('id') id: string, @Body() updateCatDto: UpdateCatDto): string {
        return `This action updates a #${id} cat`;
    }
    @Post()
    create(@Body() createCatDto: CreateCatDto) {
        return `This actions adds a cat named ${createCatDto.name} of age ${createCatDto.age} and breed ${createCatDto.breed}`;
    }
    @Delete(':id')
    remove(@Param('id') id: string) {
        return `This action removes a #${id} cat`;
    }
}
