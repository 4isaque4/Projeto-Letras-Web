import { Injectable, ServiceUnavailableException } from '@nestjs/common';

interface UploadObjectInput {
  objectPath: string;
  file: Buffer;
  contentType: string;
  upsert?: boolean;
}

@Injectable()
export class SupabaseStorageService {
  private readonly supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, '') ?? '';
  private readonly serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  private readonly bucket = process.env.SUPABASE_STORAGE_BUCKET?.trim() || 'letras-assets';
  private readonly forcePublicBaseUrl = process.env.SUPABASE_STORAGE_PUBLIC_BASE_URL?.trim() || '';

  get isConfigured(): boolean {
    return Boolean(this.supabaseUrl && this.serviceRoleKey && this.bucket);
  }

  ensureConfigured(): void {
    if (!this.isConfigured) {
      throw new ServiceUnavailableException(
        'Supabase Storage nao configurado. Defina SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY e SUPABASE_STORAGE_BUCKET.',
      );
    }
  }

  async uploadObject(input: UploadObjectInput): Promise<{
    bucket: string;
    objectPath: string;
    publicUrl: string;
  }> {
    this.ensureConfigured();

    const uploadUrl = `${this.supabaseUrl}/storage/v1/object/${this.bucket}/${input.objectPath}`;
    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        apikey: this.serviceRoleKey,
        Authorization: `Bearer ${this.serviceRoleKey}`,
        'Content-Type': input.contentType,
        'x-upsert': input.upsert ? 'true' : 'false',
      },
      body: new Uint8Array(input.file),
    });

    if (!response.ok) {
      const details = await response.text();
      throw new Error(`Falha no upload para Supabase Storage: ${response.status} ${details}`);
    }

    return {
      bucket: this.bucket,
      objectPath: input.objectPath,
      publicUrl: this.buildPublicUrl(input.objectPath),
    };
  }

  private buildPublicUrl(objectPath: string): string {
    if (this.forcePublicBaseUrl) {
      return `${this.forcePublicBaseUrl.replace(/\/$/, '')}/${objectPath}`;
    }

    return `${this.supabaseUrl}/storage/v1/object/public/${this.bucket}/${objectPath}`;
  }
}
