import { Body, Param, Controller, Delete, Get, Post, Put } from '@nestjs/common';
import { UpdateCatDto } from './dto/update-cat.dto';
import { CreateCatDto } from './dto/create-cat.dto';
import { CatsService } from './cats.service';

@Controller('cats')
export class CatsController {
    constructor(private readonly catsService: CatsService) {}

    @Get()
    findAll() {
        return this.catsService.findAll();
    }
    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.catsService.findOne(Number(id));
    }
    @Put(':id')
    update(@Param('id') id: string, @Body() updateCatDto: UpdateCatDto) {
        return this.catsService.update(Number(id), updateCatDto);
    }
    @Post()
    create(@Body() createCatDto: CreateCatDto) {
        return this.catsService.create(createCatDto);
    }
    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.catsService.remove(Number(id));
    }
}
