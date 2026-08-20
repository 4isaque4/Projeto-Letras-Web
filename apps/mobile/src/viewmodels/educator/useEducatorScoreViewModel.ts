import { useCallback, useEffect, useState } from 'react';
import { httpClient } from '../../infra/api/http-client';

interface ScoreEvent {
  id: string;
  type: string;
  delta: number;
  description?: string;
  createdAt: string;
}

interface EducatorScoreData {
  totalScore: number;
  lettersUnlocked: number;
  phraseLength: number;
  recentEvents: ScoreEvent[];
  updatedAt: string;
}

interface EducatorSocials {
  linkedin?: string | null;
  facebook?: string | null;
  instagram?: string | null;
  xHandle?: string | null;
}

interface ProfileData {
  socials: EducatorSocials;
}

export function useEducatorScoreViewModel(educatorId: string) {
  const [scoreData, setScoreData] = useState<EducatorScoreData | null>(null);
  const [socials, setSocials] = useState<EducatorSocials>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Token de sessao do alfabetizador expira em 24h (ver POST
  // /auth/educators/register) e nao havia nenhum tratamento pra isso — a
  // tela so mostrava "Nao foi possivel carregar a pontuacao" sem indicar
  // que era preciso logar de novo (relatado como bug ao vivo).
  const [sessionExpired, setSessionExpired] = useState(false);

  const refresh = useCallback(async () => {
    if (!educatorId) return;
    setLoading(true);
    setError(null);
    setSessionExpired(false);
    try {
      const [score, profile] = await Promise.all([
        httpClient.get<EducatorScoreData>(`/scoring/me?educatorId=${educatorId}`),
        httpClient.get<ProfileData>(`/cadastros/educadores/${educatorId}`).catch(() => null),
      ]);
      setScoreData(score);
      if (profile?.socials) setSocials(profile.socials);
    } catch (e) {
      const message = e instanceof Error ? e.message : '';
      if (/^Request failed \(401\)/.test(message)) {
        setSessionExpired(true);
      } else {
        setError('Não foi possível carregar a pontuação.');
      }
    } finally {
      setLoading(false);
    }
  }, [educatorId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { scoreData, socials, loading, error, sessionExpired, refresh };
}
