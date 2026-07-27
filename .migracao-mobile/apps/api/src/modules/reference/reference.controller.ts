import { Controller, Get, Param } from '@nestjs/common';
import { ReferenceService } from './reference.service';

@Controller('reference')
export class ReferenceController {
  constructor(private readonly referenceService: ReferenceService) {}

  @Get('ufs')
  getUfs() {
    return this.referenceService.getUfs();
  }

  @Get('ufs/:uf/cities')
  getCitiesByUf(@Param('uf') uf: string) {
    return this.referenceService.getCitiesByUf(uf);
  }
}
