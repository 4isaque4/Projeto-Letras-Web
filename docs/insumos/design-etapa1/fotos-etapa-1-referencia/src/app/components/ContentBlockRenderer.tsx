/**
 * ContentBlockRenderer – Renderiza blocos de conteúdo dinâmico.
 * Suporta: text, audio, video, image e combinações.
 */
import { Volume2, Play } from "lucide-react";
import { resolveContentBlocks, type ContentBlock } from "../data/contentService";

interface Props {
  blocks: ContentBlock[];
  className?: string;
}

export function ContentBlockRenderer({ blocks, className = "" }: Props) {
  const resolved = resolveContentBlocks(blocks);

  if (resolved.length === 0) return null;

  return (
    <div className={`space-y-4 ${className}`}>
      {resolved.map((block, i) => {
        switch (block.kind) {
          case "text":
            return (
              <div key={i} className="bg-white rounded-xl p-4">
                <p className="text-[#333] whitespace-pre-line">{block.value}</p>
              </div>
            );

          case "video":
            return (
              <div key={i} className="rounded-xl overflow-hidden bg-black/5 border border-black/10">
                <video
                  controls
                  className="w-full"
                  src={block.value}
                  preload="metadata"
                >
                  <track kind="captions" />
                </video>
                <div className="flex items-center gap-2 px-3 py-2 bg-white/80">
                  <Play size={14} className="text-[#17335B]" />
                  <span style={{ fontSize: 12 }} className="text-[#333]">
                    Toque para reproduzir
                  </span>
                </div>
              </div>
            );

          case "audio":
            return (
              <button
                key={i}
                className="flex items-center gap-3 bg-white rounded-xl px-4 py-4 w-full border border-[#17335B]/10 active:bg-[#17335B]/5 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-[#17335B]/10 flex items-center justify-center">
                  <Volume2 size={20} className="text-[#17335B]" />
                </div>
                <div className="text-left">
                  <span style={{ fontSize: 14 }} className="text-[#111]">
                    Reproduzir áudio
                  </span>
                  <p style={{ fontSize: 11 }} className="text-[#333]">
                    Toque para ouvir
                  </p>
                </div>
              </button>
            );

          case "image":
            return (
              <div key={i} className="rounded-xl overflow-hidden">
                <img
                  src={block.value}
                  alt="Conteúdo da aula"
                  className="w-full object-cover"
                />
              </div>
            );

          default:
            return null;
        }
      })}
    </div>
  );
}
