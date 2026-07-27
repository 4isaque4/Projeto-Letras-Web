import { randomUUID } from 'crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { Educator } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { createSessionToken, hashPassword, verifyPassword } from '../../common/security/password-hash';
import { SupabaseAuthService } from '../../common/supabase/supabase-auth.service';
import { LoginEducatorDto } from './dto/login-educator.dto';
import { RegisterEducatorDto } from './dto/register-educator.dto';
import { UpdateEducatorProfileDto } from './dto/update-educator-profile.dto';

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;

interface AuthPayload {
  token: string;
  expiresAt: string;
  educator: {
    id: string;
    fullName: string;
    email: string | null;
    cpf: string | null;
    phoneDigits: string | null;
    birthDate: string | null;
    uf: string | null;
    city: string | null;
    photoUri: string | null;
    educationLevel: string | null;
    trainingArea: string | null;
    linkedin: string | null;
    facebook: string | null;
    instagram: string | null;
    xHandle: string | null;
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly supabaseAuthService: SupabaseAuthService,
  ) {}

  async register(dto: RegisterEducatorDto): Promise<AuthPayload> {
    const normalizedCpf = this.normalizeCpf(dto.cpf);
    const normalizedPhone = this.normalizePhone(dto.phoneDigits);
    const normalizedEmail = this.normalizeEmail(dto.email);
    const fullName = dto.fullName.trim();

    if (!normalizedCpf && !normalizedEmail) {
      throw new BadRequestException('Informe CPF ou email para criar a conta do educador.');
    }

    const rawPassword = dto.password?.trim() ?? '';
    if (rawPassword && rawPassword.length < 6) {
      throw new BadRequestException('Senha deve ter no minimo 6 caracteres.');
    }

    const [existingByEmail, existingByCpf] = await Promise.all([
      normalizedEmail ? this.prisma.educator.findUnique({ where: { email: normalizedEmail } }) : Promise.resolve(null),
      normalizedCpf ? this.prisma.educator.findUnique({ where: { cpf: normalizedCpf } }) : Promise.resolve(null),
    ]);

    if (existingByEmail && existingByCpf && existingByEmail.id !== existingByCpf.id) {
      throw new ConflictException('Email e CPF ja estao em uso por cadastros diferentes.');
    }

    const existingEducator = existingByEmail ?? existingByCpf;
    if (existingEducator?.supabaseAuthUserId) {
      throw new ConflictException('Este cadastro ja existe. Faca login na tela inicial.');
    }

    // Sem email: cria/atualiza educador apenas no banco (sem Supabase Auth).
    if (!normalizedEmail) {
      const dbData = {
        name: fullName,
        email: null as string | null,
        cpf: normalizedCpf,
        phoneDigits: normalizedPhone ?? existingEducator?.phoneDigits ?? null,
        birthDate: this.pickValue(dto.birthDate, existingEducator?.birthDate ?? null),
        uf: this.pickValue(dto.uf, existingEducator?.uf ?? null),
        city: this.pickValue(dto.city, existingEducator?.city ?? null),
        photoUri: this.pickValue(dto.photoUri, existingEducator?.photoUri ?? null),
        educationLevel: this.pickValue(dto.educationLevel, existingEducator?.educationLevel ?? null),
        trainingArea: this.pickValue(dto.trainingArea, existingEducator?.trainingArea ?? null),
        linkedin: this.pickValue(dto.linkedin, existingEducator?.linkedin ?? null),
        facebook: this.pickValue(dto.facebook, existingEducator?.facebook ?? null),
        instagram: this.pickValue(dto.instagram, existingEducator?.instagram ?? null),
        xHandle: this.pickValue(dto.xHandle, existingEducator?.xHandle ?? null),
        passwordHash: rawPassword ? hashPassword(rawPassword) : null,
      };

      if (existingEducator) {
        const updated = await this.prisma.educator.update({ where: { id: existingEducator.id }, data: dbData });
        return this.createSession(updated);
      }

      const created = await this.prisma.educator.create({ data: dbData });
      return this.createSession(created);
    }

    // Com email: usa Supabase Auth (gera senha aleatória se não fornecida).
    const effectivePassword = rawPassword || randomUUID().replace(/-/g, '');
    const supabaseUser = await this.resolveSupabaseUserForRegister(normalizedEmail, effectivePassword, fullName);

    if (existingEducator) {
      try {
        const updatedEducator = await this.prisma.educator.update({
          where: { id: existingEducator.id },
          data: {
            name: fullName,
            email: normalizedEmail,
            supabaseAuthUserId: supabaseUser.userId,
            cpf: normalizedCpf ?? existingEducator.cpf,
            phoneDigits: normalizedPhone ?? existingEducator.phoneDigits,
            birthDate: this.pickValue(dto.birthDate, existingEducator.birthDate),
            uf: this.pickValue(dto.uf, existingEducator.uf),
            city: this.pickValue(dto.city, existingEducator.city),
            photoUri: this.pickValue(dto.photoUri, existingEducator.photoUri),
            educationLevel: this.pickValue(dto.educationLevel, existingEducator.educationLevel),
            trainingArea: this.pickValue(dto.trainingArea, existingEducator.trainingArea),
            linkedin: this.pickValue(dto.linkedin, existingEducator.linkedin),
            facebook: this.pickValue(dto.facebook, existingEducator.facebook),
            instagram: this.pickValue(dto.instagram, existingEducator.instagram),
            xHandle: this.pickValue(dto.xHandle, existingEducator.xHandle),
            passwordHash: rawPassword ? hashPassword(rawPassword) : existingEducator.passwordHash,
          },
        });

        return this.createSession(updatedEducator);
      } catch (error) {
        if (supabaseUser.createdNow) {
          await this.supabaseAuthService.deleteUser(supabaseUser.userId).catch(() => undefined);
        }
        throw error;
      }
    }

    try {
      const educator = await this.prisma.educator.create({
        data: {
          name: fullName,
          email: normalizedEmail,
          supabaseAuthUserId: supabaseUser.userId,
          cpf: normalizedCpf,
          phoneDigits: normalizedPhone,
          birthDate: dto.birthDate?.trim() || null,
          uf: dto.uf?.trim() || null,
          city: dto.city?.trim() || null,
          photoUri: dto.photoUri?.trim() || null,
          educationLevel: dto.educationLevel?.trim() || null,
          trainingArea: dto.trainingArea?.trim() || null,
          linkedin: dto.linkedin?.trim() || null,
          facebook: dto.facebook?.trim() || null,
          instagram: dto.instagram?.trim() || null,
          xHandle: dto.xHandle?.trim() || null,
          passwordHash: rawPassword ? hashPassword(rawPassword) : null,
        },
      });

      return this.createSession(educator);
    } catch (error) {
      if (supabaseUser.createdNow) {
        await this.supabaseAuthService.deleteUser(supabaseUser.userId).catch(() => undefined);
      }
      throw error;
    }
  }

  async login(dto: LoginEducatorDto): Promise<AuthPayload> {
    const identifier = dto.identifier.trim();
    if (!identifier) {
      throw new UnauthorizedException('Identificador invalido.');
    }

    const educator = identifier.includes('@')
      ? await this.findEducatorByEmail(identifier)
      : await this.findEducatorByCpf(identifier);

    if (!educator || !educator.email) {
      throw new UnauthorizedException('Credenciais invalidas.');
    }

    // Login apenas por CPF (passwordless): sem senha informada, autentica pelo CPF.
    const password = dto.password?.trim();
    if (!password) {
      return this.createSession(educator);
    }

    let supabaseSignInResult: { userId: string } | null = null;
    if (this.supabaseAuthService.isConfigured) {
      try {
        supabaseSignInResult = await this.supabaseAuthService.signInWithPassword(educator.email, password);
      } catch {
        supabaseSignInResult = null;
      }
    }

    const isValidSupabaseCredentials = Boolean(supabaseSignInResult?.userId);
    const isValidLocalPassword =
      Boolean(educator.passwordHash) && verifyPassword(password, educator.passwordHash ?? '');

    if (!isValidSupabaseCredentials && !isValidLocalPassword) {
      throw new UnauthorizedException('Credenciais invalidas.');
    }

    await this.syncEducatorWithSupabaseOnLogin(educator, password, supabaseSignInResult?.userId ?? null);

    return this.createSession(educator);
  }

  async me(authorizationHeader?: string): Promise<Omit<AuthPayload, 'token'>> {
    const token = this.extractBearerToken(authorizationHeader);
    const session = await this.getValidSessionByToken(token);

    return {
      expiresAt: session.expiresAt.toISOString(),
      educator: this.toEducatorPayload(session.educator),
    };
  }

  async updateProfile(authorizationHeader: string | undefined, dto: UpdateEducatorProfileDto): Promise<Omit<AuthPayload, 'token'>> {
    const token = this.extractBearerToken(authorizationHeader);
    const session = await this.getValidSessionByToken(token);

    const normalizedCpf = dto.cpf === undefined ? undefined : this.normalizeCpf(dto.cpf);
    if (dto.cpf !== undefined && !normalizedCpf) {
      throw new BadRequestException('CPF deve conter 11 digitos.');
    }

    const normalizedPhone = dto.phoneDigits === undefined ? undefined : this.normalizePhone(dto.phoneDigits);
    if (dto.phoneDigits !== undefined && !normalizedPhone) {
      throw new BadRequestException('Celular deve conter 11 digitos.');
    }

    if (normalizedCpf && normalizedCpf !== session.educator.cpf) {
      const educatorWithCpf = await this.prisma.educator.findUnique({
        where: { cpf: normalizedCpf },
      });

      if (educatorWithCpf && educatorWithCpf.id !== session.educator.id) {
        throw new ConflictException('CPF ja esta em uso por outro educador.');
      }
    }

    const updated = await this.prisma.educator.update({
      where: { id: session.educator.id },
      data: {
        name: dto.fullName?.trim() || session.educator.name,
        cpf: normalizedCpf ?? session.educator.cpf,
        phoneDigits: normalizedPhone ?? session.educator.phoneDigits,
        birthDate: this.normalizeOptionalValue(dto.birthDate, session.educator.birthDate),
        uf: this.normalizeOptionalValue(dto.uf, session.educator.uf),
        city: this.normalizeOptionalValue(dto.city, session.educator.city),
        photoUri: this.normalizeOptionalValue(dto.photoUri, session.educator.photoUri),
        educationLevel: this.normalizeOptionalValue(dto.educationLevel, session.educator.educationLevel),
        trainingArea: this.normalizeOptionalValue(dto.trainingArea, session.educator.trainingArea),
        linkedin: this.normalizeOptionalValue(dto.linkedin, session.educator.linkedin),
        facebook: this.normalizeOptionalValue(dto.facebook, session.educator.facebook),
        instagram: this.normalizeOptionalValue(dto.instagram, session.educator.instagram),
        xHandle: this.normalizeOptionalValue(dto.xHandle, session.educator.xHandle),
      },
    });

    return {
      expiresAt: session.expiresAt.toISOString(),
      educator: this.toEducatorPayload(updated),
    };
  }

  async logout(authorizationHeader?: string): Promise<{ success: boolean }> {
    const token = this.extractBearerToken(authorizationHeader);

    await this.prisma.educatorAuthSession.updateMany({
      where: {
        token,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    return { success: true };
  }

  private async createSession(educator: Educator): Promise<AuthPayload> {
    const token = createSessionToken('educator');
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

    await this.prisma.educatorAuthSession.create({
      data: {
        educatorId: educator.id,
        token,
        expiresAt,
      },
    });

    return {
      token,
      expiresAt: expiresAt.toISOString(),
      educator: this.toEducatorPayload(educator),
    };
  }

  private toEducatorPayload(educator: Educator): AuthPayload['educator'] {
    return {
      id: educator.id,
      fullName: educator.name,
      email: educator.email,
      cpf: educator.cpf,
      phoneDigits: educator.phoneDigits,
      birthDate: educator.birthDate,
      uf: educator.uf,
      city: educator.city,
      photoUri: educator.photoUri,
      educationLevel: educator.educationLevel,
      trainingArea: educator.trainingArea,
      linkedin: educator.linkedin,
      facebook: educator.facebook,
      instagram: educator.instagram,
      xHandle: educator.xHandle,
    };
  }

  private async getValidSessionByToken(token: string) {
    const session = await this.prisma.educatorAuthSession.findUnique({
      where: { token },
      include: { educator: true },
    });

    if (!session || session.revokedAt || session.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('Sessao invalida ou expirada.');
    }

    return session;
  }

  private extractBearerToken(authorizationHeader?: string): string {
    if (!authorizationHeader) {
      throw new UnauthorizedException('Token ausente.');
    }

    const [type, token] = authorizationHeader.split(' ');
    if (type?.toLowerCase() !== 'bearer' || !token) {
      throw new UnauthorizedException('Token invalido.');
    }

    return token.trim();
  }

  private normalizeCpf(value?: string): string | null {
    const digits = value?.replace(/\D/g, '').slice(0, 11) ?? '';
    return digits.length === 11 ? digits : null;
  }

  private normalizePhone(value?: string): string | null {
    const digits = value?.replace(/\D/g, '').slice(0, 11) ?? '';
    return digits.length === 11 ? digits : null;
  }

  private normalizeEmail(value?: string): string | null {
    const normalized = value?.trim().toLowerCase() ?? '';
    return normalized.length > 0 ? normalized : null;
  }

  private pickValue(newValue: string | undefined, previousValue: string | null): string | null {
    const trimmed = newValue?.trim() ?? '';
    return trimmed.length > 0 ? trimmed : previousValue;
  }

  private normalizeOptionalValue(
    incomingValue: string | null | undefined,
    currentValue: string | null,
  ): string | null {
    if (incomingValue === undefined) {
      return currentValue;
    }

    if (incomingValue === null) {
      return null;
    }

    const trimmed = incomingValue.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private async resolveSupabaseUserForRegister(
    email: string,
    password: string,
    fullName: string,
  ): Promise<{ userId: string; createdNow: boolean }> {
    if (!this.supabaseAuthService.isConfigured) {
      throw new ServiceUnavailableException(
        'Supabase Auth nao configurado na API. Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY e reinicie.',
      );
    }

    try {
      const user = await this.supabaseAuthService.createUser(email, password, fullName);
      return { userId: user.id, createdNow: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao criar usuario no Supabase Auth.';

      if (this.isSupabaseUserAlreadyExistsError(message)) {
        const signIn = await this.supabaseAuthService.signInWithPassword(email, password).catch(() => null);
        if (!signIn?.userId) {
          throw new ConflictException('Ja existe usuario no Supabase Auth com esse email. Tente fazer login.');
        }
        return { userId: signIn.userId, createdNow: false };
      }

      throw new InternalServerErrorException(`Falha no Supabase Auth: ${message}`);
    }
  }

  private isSupabaseUserAlreadyExistsError(message: string): boolean {
    const normalized = message.toLowerCase();
    return (
      normalized.includes('already') ||
      normalized.includes('exists') ||
      normalized.includes('duplicate') ||
      normalized.includes('registered')
    );
  }

  private async syncEducatorWithSupabaseOnLogin(
    educator: Educator,
    password: string,
    supabaseUserIdFromSignIn: string | null,
  ): Promise<void> {
    if (!this.supabaseAuthService.isConfigured || educator.supabaseAuthUserId || !educator.email) {
      return;
    }

    let supabaseUserId = supabaseUserIdFromSignIn;

    if (!supabaseUserId) {
      try {
        supabaseUserId = await this.supabaseAuthService.findUserIdByEmail(educator.email);
      } catch {
        supabaseUserId = null;
      }
    }

    if (!supabaseUserId) {
      try {
        const created = await this.supabaseAuthService.createUser(educator.email, password, educator.name);
        supabaseUserId = created.id;
      } catch (error) {
        const message = error instanceof Error ? error.message : '';
        if (this.isSupabaseUserAlreadyExistsError(message)) {
          supabaseUserId = await this.supabaseAuthService.findUserIdByEmail(educator.email).catch(() => null);
        }
      }
    }

    if (!supabaseUserId) {
      return;
    }

    await this.prisma.educator
      .update({
        where: { id: educator.id },
        data: { supabaseAuthUserId: supabaseUserId },
      })
      .catch(() => undefined);
  }

  private findEducatorByEmail(identifier: string) {
    const email = this.normalizeEmail(identifier);
    if (!email) {
      return Promise.resolve(null);
    }

    return this.prisma.educator.findUnique({ where: { email } });
  }

  private findEducatorByCpf(identifier: string) {
    const cpf = this.normalizeCpf(identifier);
    if (!cpf) {
      return Promise.resolve(null);
    }

    return this.prisma.educator.findUnique({ where: { cpf } });
  }
}
