import {
    Body,
    Param,
    Controller,
    Delete,
    Get,
    Post,
    NotFoundException,
    UseFilters,
    ParseIntPipe,
    Patch,
    UseGuards,
} from '@nestjs/common';
import { UpdateCatDto } from './dto/update-cat.dto';
import { CreateCatDto } from './dto/create-cat.dto';
import { CatsService } from './cats.service';
import { HttpExceptionFilter } from '../common/filters/http-exception.filter';
import { AuthGuard } from '../common/guards/auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@UseGuards(AuthGuard, RolesGuard)
@UseFilters(HttpExceptionFilter)
@Controller('cats')
export class CatsController {
    constructor(private readonly catsService: CatsService) {}

    @Get()
    findAll() {
        return this.catsService.findAll();
    }
    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number) {
        const result = this.catsService.findOne(id);
        if (result === undefined) {
            throw new NotFoundException(`Cat with id ${id} not found`);
        }
        return result;
    }
    @Patch(':id')
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateCatDto: UpdateCatDto,
    ) {
        const result = this.catsService.update(id, updateCatDto);
        if (result === undefined) {
            throw new NotFoundException(`Cat with id ${id} not found`);
        }
        return result;
    }
    @Post()
    create(@Body() createCatDto: CreateCatDto) {
        return this.catsService.create(createCatDto);
    }
    @Roles(['admin'])
    @Delete(':id')
    remove(@Param('id', ParseIntPipe) id: number) {
        const result = this.catsService.remove(id);
        if (result === undefined) {
            throw new NotFoundException(`Cat with id ${id} not found`);
        }
        return result;
    }
}
