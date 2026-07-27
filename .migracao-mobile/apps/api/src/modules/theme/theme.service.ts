import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateThemeDto } from './dto/create-theme.dto';

@Injectable()
export class ThemeService {
  constructor(private readonly prisma: PrismaService) {}

  createTheme(dto: CreateThemeDto) {
    return this.prisma.theme.create({
      data: {
        name: dto.name,
        description: dto.description,
      },
    });
  }

  getThemes() {
    return this.prisma.theme.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}
