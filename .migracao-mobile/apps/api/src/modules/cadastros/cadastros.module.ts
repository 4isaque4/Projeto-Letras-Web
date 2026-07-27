import { Module } from '@nestjs/common';
import { CadastrosController } from './cadastros.controller';
import { CadastrosService } from './cadastros.service';

@Module({
  controllers: [CadastrosController],
  providers: [CadastrosService],
})
export class CadastrosModule {}
