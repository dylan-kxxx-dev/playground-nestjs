import { IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateCatDto {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsNumber()
    age?: number;

    @IsOptional()
    @IsString()
    breed?: string;
}
