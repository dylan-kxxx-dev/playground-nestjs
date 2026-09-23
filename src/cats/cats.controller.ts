import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseIntPipe,
    Patch,
    Post,
    UseGuards,
} from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthGuard } from '../common/guards/auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CatsService } from './cats.service';
import { CreateCatDto } from './dto/create-cat.dto';
import { UpdateCatDto } from './dto/update-cat.dto';
import { ApiExtraModels, ApiOkResponse, getSchemaPath } from '@nestjs/swagger';
import { Cat } from './entities/cat.entity';

@UseGuards(AuthGuard, RolesGuard)
@Controller('cats')
export class CatsController {
    constructor(private readonly catsService: CatsService) {}

    @Get()
    findAll() {
        return this.catsService.findAll();
    }
    @ApiExtraModels(Cat)
    @ApiOkResponse({
        schema: { type: 'object', properties: { data: { $ref: getSchemaPath(Cat) } } },
    })
    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.catsService.findOne(id);
    }
    @Patch(':id')
    update(@Param('id', ParseIntPipe) id: number, @Body() updateCatDto: UpdateCatDto) {
        return this.catsService.update(id, updateCatDto);
    }
    @Post()
    create(@Body() createCatDto: CreateCatDto) {
        return this.catsService.create(createCatDto);
    }
    @Roles(['admin'])
    @Delete(':id')
    remove(@Param('id', ParseIntPipe) id: number) {
        return this.catsService.remove(id);
    }
}
