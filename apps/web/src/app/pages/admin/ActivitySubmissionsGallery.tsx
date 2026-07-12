import { Camera, ExternalLink, FileAudio } from "lucide-react";

export interface ActivitySubmission {
  id: string;
  activity_id?: string | null;
  kind?: string | null;
  public_url?: string | null;
  status?: string | null;
  created_at?: string | null;
  metadata?: { activityTitle?: string } | null;
}

export default function ActivitySubmissionsGallery({
  items,
}: {
  items: ActivitySubmission[];
}) {
  if (!items.length)
    return (
      <p className="p-5 text-sm text-slate-500">
        Nenhuma foto ou áudio enviado até agora.
      </p>
    );
  return (
    <div className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => {
        const isAudio = item.kind === "audio";
        return (
          <article
            key={item.id}
            className="overflow-hidden border border-slate-200 bg-white"
          >
            <div className="flex aspect-video items-center justify-center bg-slate-100">
              {item.public_url && !isAudio ? (
                <img
                  src={item.public_url}
                  alt="Atividade enviada pelo alfabetizando"
                  className="h-full w-full object-cover"
                />
              ) : isAudio && item.public_url ? (
                <audio src={item.public_url} controls className="w-[90%]" />
              ) : isAudio ? (
                <FileAudio className="h-10 w-10 text-slate-400" />
              ) : (
                <Camera className="h-10 w-10 text-slate-400" />
              )}
            </div>
            <div className="space-y-2 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-bold text-slate-900">
                  {item.metadata?.activityTitle || "Atividade enviada"}
                </p>
                <span className="border border-slate-200 px-2 py-0.5 text-[11px] font-semibold uppercase text-slate-600">
                  {item.status || "recebida"}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {item.created_at
                  ? new Date(item.created_at).toLocaleString("pt-BR")
                  : "Data não informada"}
              </p>
              {item.public_url ? (
                <a
                  href={item.public_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 underline"
                >
                  <ExternalLink className="h-3 w-3" /> Abrir envio
                </a>
              ) : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}
