import { IsArray, IsOptional, IsString } from 'class-validator';

export class ChatDto {
  @IsString()
  message!: string;

  @IsOptional()
  @IsArray()
  history?: any[];
}
