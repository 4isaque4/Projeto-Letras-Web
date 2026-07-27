import { BadRequestException, Body, Controller, Get, Headers, Param, Patch, Post, Query } from '@nestjs/common';
import { TutorLearnerLinkStatus } from '@prisma/client';
import { CadastrosService } from './cadastros.service';
import { CreateAlfabetizadorDto } from './dto/create-alfabetizador.dto';
import { CreateAlfabetizandoDto } from './dto/create-alfabetizando.dto';
import { CreateSessionRequestDto } from './dto/create-session-request.dto';
import { CreateVinculoDto } from './dto/create-vinculo.dto';
import { RespondSessionRequestDto } from './dto/respond-session-request.dto';
import { UpdateVinculoDto } from './dto/update-vinculo.dto';

@Controller('cadastros')
export class CadastrosController {
  constructor(private readonly cadastrosService: CadastrosService) {}

  @Get('alfabetizadores')
  getAlfabetizadores() {
    return this.cadastrosService.listAlfabetizadores();
  }

  @Get('alfabetizadores/:id')
  getAlfabetizadorById(
    @Param('id') id: string,
    @Headers('authorization') authorization: string | undefined,
  ) {
    return this.cadastrosService.getAlfabetizadorById(id, authorization);
  }

  @Post('alfabetizadores')
  createAlfabetizador(@Body() dto: CreateAlfabetizadorDto) {
    return this.cadastrosService.createAlfabetizador(dto);
  }

  @Get('alfabetizandos')
  getAlfabetizandos(@Query('educatorId') educatorId?: string) {
    return this.cadastrosService.listAlfabetizandos(educatorId);
  }

  @Get('alfabetizandos/buscar')
  buscarAlfabetizando(
    @Query('cpfOrPassport') cpfOrPassport?: string,
    @Query('phoneDigits') phoneDigits?: string,
  ) {
    if (!cpfOrPassport && !phoneDigits) {
      throw new BadRequestException('Forneça cpfOrPassport ou phoneDigits para buscar.');
    }
    return this.cadastrosService.buscarAlfabetizando({ cpfOrPassport, phoneDigits });
  }

  @Get('alfabetizandos/:id')
  getAlfabetizandoById(
    @Param('id') id: string,
    @Headers('authorization') authorization: string | undefined,
  ) {
    return this.cadastrosService.getAlfabetizandoById(id, authorization);
  }

  @Post('alfabetizandos')
  createAlfabetizando(@Body() dto: CreateAlfabetizandoDto) {
    return this.cadastrosService.createAlfabetizando(dto);
  }

  @Get('sessoes-bloqueadas')
  getLockedSessions(@Query('educatorId') educatorId: string) {
    if (!educatorId) throw new BadRequestException('educatorId é obrigatório.');
    return this.cadastrosService.getLockedSessions(educatorId);
  }

  @Get('vinculos')
  getVinculos(
    @Query('status') status?: TutorLearnerLinkStatus,
    @Query('educatorId') educatorId?: string,
  ) {
    return this.cadastrosService.listVinculos(status, educatorId);
  }

  @Post('vinculos')
  createVinculo(@Body() dto: CreateVinculoDto) {
    return this.cadastrosService.createVinculo(dto);
  }

  @Patch('vinculos/:id')
  updateVinculo(@Param('id') id: string, @Body() dto: UpdateVinculoDto) {
    return this.cadastrosService.updateVinculo(id, dto);
  }

  @Post('sessoes-confirmacao')
  createSessionRequest(@Body() dto: CreateSessionRequestDto) {
    return this.cadastrosService.createSessionRequest(dto);
  }

  @Get('sessoes-confirmacao')
  getPendingSessionRequests(@Headers('authorization') authorization: string | undefined) {
    return this.cadastrosService.getPendingSessionRequests(authorization);
  }

  @Get('sessoes-confirmacao/:id')
  getSessionRequestStatus(@Param('id') id: string) {
    return this.cadastrosService.getSessionRequestStatus(id);
  }

  @Patch('sessoes-confirmacao/:id')
  respondToSessionRequest(
    @Param('id') id: string,
    @Body() dto: RespondSessionRequestDto,
    @Headers('authorization') authorization: string | undefined,
  ) {
    return this.cadastrosService.respondToSessionRequest(id, dto, authorization);
  }
}
