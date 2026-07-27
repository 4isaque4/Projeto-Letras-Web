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

  const refresh = useCallback(async () => {
    if (!educatorId) return;
    setLoading(true);
    setError(null);
    try {
      const [score, profile] = await Promise.all([
        httpClient.get<EducatorScoreData>(`/scoring/me?educatorId=${educatorId}`),
        httpClient.get<ProfileData>(`/cadastros/educadores/${educatorId}`).catch(() => null),
      ]);
      setScoreData(score);
      if (profile?.socials) setSocials(profile.socials);
    } catch (e) {
      setError('Não foi possível carregar a pontuação.');
    } finally {
      setLoading(false);
    }
  }, [educatorId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { scoreData, socials, loading, error, refresh };
}
