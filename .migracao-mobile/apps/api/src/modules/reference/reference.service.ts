import { BadGatewayException, BadRequestException, Injectable } from '@nestjs/common';

interface IbgeUfResponse {
  id: number;
  sigla: string;
  nome: string;
}

interface IbgeCityResponse {
  id: number;
  nome: string;
}

export interface ReferenceUf {
  id: number;
  code: string;
  name: string;
}

export interface ReferenceCity {
  id: number;
  uf: string;
  name: string;
}

interface CacheEntry<T> {
  expiresAt: number;
  data: T;
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const IBGE_API_BASE_URL = 'https://servicodados.ibge.gov.br/api/v1/localidades';

@Injectable()
export class ReferenceService {
  private ufsCache: CacheEntry<ReferenceUf[]> | null = null;
  private readonly citiesCache = new Map<string, CacheEntry<ReferenceCity[]>>();

  async getUfs(): Promise<ReferenceUf[]> {
    const cached = this.getCached(this.ufsCache);
    if (cached) {
      return cached;
    }

    const url = `${IBGE_API_BASE_URL}/estados?orderBy=nome`;
    const result = await this.fetchJson<IbgeUfResponse[]>(url);
    const mapped = result.map((item) => ({
      id: item.id,
      code: item.sigla,
      name: item.nome,
    }));

    this.ufsCache = this.toCacheEntry(mapped);
    return mapped;
  }

  async getCitiesByUf(uf: string): Promise<ReferenceCity[]> {
    const normalizedUf = uf.trim().toUpperCase();

    if (!/^[A-Z]{2}$/.test(normalizedUf)) {
      throw new BadRequestException('UF invalida. Informe uma sigla com 2 letras (ex.: SP).');
    }

    const availableUfs = await this.getUfs();
    if (!availableUfs.some((item) => item.code === normalizedUf)) {
      throw new BadRequestException(`UF ${normalizedUf} nao encontrada.`);
    }

    const cached = this.getCached(this.citiesCache.get(normalizedUf) ?? null);
    if (cached) {
      return cached;
    }

    const url = `${IBGE_API_BASE_URL}/estados/${normalizedUf}/municipios?orderBy=nome`;
    const result = await this.fetchJson<IbgeCityResponse[]>(url);
    const mapped = result.map((item) => ({
      id: item.id,
      uf: normalizedUf,
      name: item.nome,
    }));

    this.citiesCache.set(normalizedUf, this.toCacheEntry(mapped));
    return mapped;
  }

  private getCached<T>(entry: CacheEntry<T> | null): T | null {
    if (!entry) return null;
    if (entry.expiresAt < Date.now()) return null;
    return entry.data;
  }

  private toCacheEntry<T>(data: T): CacheEntry<T> {
    return {
      data,
      expiresAt: Date.now() + CACHE_TTL_MS,
    };
  }

  private async fetchJson<T>(url: string): Promise<T> {
    let response: Response;

    try {
      response = await fetch(url, {
        headers: {
          Accept: 'application/json',
        },
      });
    } catch (error) {
      throw new BadGatewayException(
        `Falha ao conectar na API do IBGE: ${error instanceof Error ? error.message : 'erro desconhecido'}`,
      );
    }

    if (!response.ok) {
      throw new BadGatewayException(`API do IBGE retornou erro ${response.status}.`);
    }

    return (await response.json()) as T;
  }
}
