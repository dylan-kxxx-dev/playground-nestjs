import { Injectable } from '@nestjs/common';
import { CreateCatDto } from './dto/create-cat.dto';
import { UpdateCatDto } from './dto/update-cat.dto';
import { ResourceNotFoundError } from '../common/exceptions/resource-not-found.error';
import { Cat } from './entities/cat.entity';

@Injectable()
export class CatsService {
    private readonly cats: Cat[] = [];
    private nextId: number = 1;

    create(dto: CreateCatDto): Cat {
        const cat: Cat = {
            id: this.nextId++,
            name: dto.name,
            age: dto.age,
            breed: dto.breed,
        };
        this.cats.push(cat);
        return cat;
    }

    findAll(): Cat[] {
        return this.cats;
    }

    findOne(id: number): Cat {
        const cat = this.cats.find((cat) => cat.id === id);
        if (!cat) {
            throw new ResourceNotFoundError('Cat');
        }
        return cat;
    }

    update(id: number, dto: UpdateCatDto): Cat {
        const catIndex = this.cats.findIndex((cat) => cat.id === id);
        if (catIndex === -1) {
            throw new ResourceNotFoundError('Cat');
        }
        const changes = Object.fromEntries(Object.entries(dto).filter(([, v]) => v !== undefined));
        this.cats[catIndex] = { ...this.cats[catIndex], ...changes };
        return this.cats[catIndex];
    }

    remove(id: number): Cat {
        const catIndex = this.cats.findIndex((cat) => cat.id === id);
        if (catIndex === -1) {
            throw new ResourceNotFoundError('Cat');
        }
        return this.cats.splice(catIndex, 1)[0];
    }
}
