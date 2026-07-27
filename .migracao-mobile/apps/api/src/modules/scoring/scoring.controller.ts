import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { ScoringService } from './scoring.service';

@Controller('scoring')
export class ScoringController {
  constructor(private readonly scoringService: ScoringService) {}

  @Get('me')
  getMyScore(@Query('educatorId') educatorId?: string) {
    if (!educatorId) throw new BadRequestException('educatorId is required');
    return this.scoringService.getScore(educatorId);
  }

  @Get('rules')
  getRules() {
    return {
      stages: [
        { stage: 1, points: 10, description: '10 pontos para cada alfabetizando que concluir a Etapa 1' },
        { stage: 2, points: 15, description: '+15 pontos para cada alfabetizando que concluir a Etapa 2' },
        { stage: 3, points: 25, description: '+25 pontos para cada alfabetizando que concluir a Etapa 3' },
      ],
      bonuses: [
        { points: 3, description: '+3 pontos para cada avanço em até 1 hora após pedido de apoio ou bloqueio' },
        { points: 2, description: '+2 pontos para cada avanço em até 24 horas após pedido de apoio ou bloqueio' },
        { points: 1, description: '+1 ponto para cada avanço em até 3 dias após pedido de apoio ou bloqueio' },
      ],
      penalties: [
        { points: -3, description: 'Perderá 3 pontos quando o alfabetizando não avançar da tela de dúvida em até 5 dias' },
        { points: -3, description: 'Perderá mais 3 pontos a cada 5 dias sem avanço, até o limite de 30 pontos' },
      ],
      phrase: {
        text: 'PESSOA QUE TRANSFORMA PESSOA!',
        pointsPerLetter: 200,
        totalPoints: 5000,
        note: 'A primeira letra P já começa desbloqueada',
      },
    };
  }
}
