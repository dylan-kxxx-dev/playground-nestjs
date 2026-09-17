import { Body, Param, Controller, Delete, Get, Post, Put, NotFoundException, UseFilters } from '@nestjs/common';
import { UpdateCatDto } from './dto/update-cat.dto';
import { CreateCatDto } from './dto/create-cat.dto';
import { CatsService } from './cats.service';
import { HttpExceptionFilter } from '../common/filters/http-exception.filter';

@UseFilters(HttpExceptionFilter)
@Controller('cats')
export class CatsController {
    constructor(private readonly catsService: CatsService) {}

    @Get()
    findAll() {
        return this.catsService.findAll();
    }
    @Get(':id')
    findOne(@Param('id') id: string) {
        const result = this.catsService.findOne(Number(id));
        if (result === undefined) {
            throw new NotFoundException(`Cat with id ${id} not found`);
        }
        return result;
    }
    @Put(':id')
    update(@Param('id') id: string, @Body() updateCatDto: UpdateCatDto) {
        const result = this.catsService.update(Number(id), updateCatDto);
        if (result === undefined) {
            throw new NotFoundException(`Cat with id ${id} not found`);
        }
        return result;
    }
    @Post()
    create(@Body() createCatDto: CreateCatDto) {
        return this.catsService.create(createCatDto);
    }
    @Delete(':id')
    remove(@Param('id') id: string) {
        const result = this.catsService.remove(Number(id));
        if (result === undefined) {
            throw new NotFoundException(`Cat with id ${id} not found`);
        }
        return result;
    }
}
