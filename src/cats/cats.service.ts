import { Injectable } from '@nestjs/common';
import { Cat } from './interfaces/cat.interface';
import { CreateCatDto } from './dto/create-cat.dto';
import { UpdateCatDto } from './dto/update-cat.dto';

@Injectable()
export class CatsService {
    private readonly cats: Cat[] = [];
    private nextId: number = 1;

    create(dto: CreateCatDto): Cat {
        const cat: Cat = {
            id: this.nextId++,
            name: dto.name,
            age: dto.age,
            breed: dto.breed
        };
        this.cats.push(cat);
        return cat;
    }

    findAll(): Cat[] {
        return this.cats;
    }

    findOne(id: number): Cat | undefined {
        return this.cats.find(cat => cat.id === id);
    }

    update(id: number, dto: UpdateCatDto): Cat | undefined {
        const catIndex = this.cats.findIndex(cat => cat.id === id);
        if (catIndex === -1) {
            return undefined;
        }
        this.cats[catIndex] = { ...this.cats[catIndex], ...dto };
        return this.cats[catIndex];
    }

    remove(id: number): boolean {
        const catIndex = this.cats.findIndex(cat => cat.id === id);
        if (catIndex === -1) {
            return false;
        }
        this.cats.splice(catIndex, 1);
        return true;
    }
}
