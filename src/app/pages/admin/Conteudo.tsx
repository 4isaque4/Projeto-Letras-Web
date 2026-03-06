import { useState } from "react";
import { Upload, Play, Image as ImageIcon, Music, FileText, GripVertical, Loader, AlertCircle, CheckCircle } from "lucide-react";

export default function Conteudo() {
  const [activeTab, setActiveTab] = useState<"temas" | "etapas" | "atividades" | "assets">("temas");
  const [uploadState, setUploadState] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [uploadProgress, setUploadProgress] = useState(0);

  const simulateUpload = () => {
    setUploadState("uploading");
    setUploadProgress(0);
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setUploadState("success");
          setTimeout(() => setUploadState("idle"), 2000);
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  const temas = [
    { id: 1, nome: "Vogais", descricao: "Introdução às vogais A, E, I, O, U", etapas: 3 },
    { id: 2, nome: "Consoantes", descricao: "Consoantes básicas", etapas: 5 },
    { id: 3, nome: "Sílabas Simples", descricao: "Formação de sílabas", etapas: 4 },
  ];

  const etapas = [
    { id: 1, numero: 1, nome: "Reconhecimento", tema: "Vogais", atividades: 10 },
    { id: 2, numero: 2, nome: "Prática", tema: "Vogais", atividades: 12 },
    { id: 3, numero: 3, nome: "Avaliação", tema: "Vogais", atividades: 8 },
  ];

  const atividades = [
    { id: 1, ordem: 1, nome: "Vídeo: Introdução às Vogais", tipo: "vídeo", etapa: "Etapa 1" },
    { id: 2, ordem: 2, nome: "Reconhecer Vogal A", tipo: "quiz", etapa: "Etapa 1" },
    { id: 3, ordem: 3, nome: "Áudio: Pronúncia da Vogal A", tipo: "áudio", etapa: "Etapa 1" },
    { id: 4, ordem: 4, nome: "Letra A Maiúscula", tipo: "letra", etapa: "Etapa 1" },
  ];

  const assets = [
    { id: 1, nome: "video_vogais_intro.mp4", tipo: "Vídeo", tamanho: "15 MB", status: "publicado", data: "10/02/2026" },
    { id: 2, nome: "audio_letra_a.mp3", tipo: "Áudio", tamanho: "2 MB", status: "publicado", data: "11/02/2026" },
    { id: 3, nome: "imagem_vogal_e.png", tipo: "Imagem", tamanho: "500 KB", status: "rascunho", data: "15/02/2026" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">T10. Conteúdo (CMS)</h1>
        <p className="text-sm text-gray-600 mt-1">Gestão de conteúdo educacional e assets</p>
      </div>

      {/* Abas */}
      <div className="border border-gray-300 bg-white">
        <div className="flex border-b border-gray-300">
          {["temas", "etapas", "atividades", "assets"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`flex-1 px-4 py-3 text-sm font-bold capitalize ${
                activeTab === tab
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Conteúdo das Abas */}
        <div className="p-6">
          {activeTab === "temas" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <p className="text-sm text-gray-600">Gerencie os temas principais do conteúdo</p>
                <button className="px-4 py-2 bg-gray-900 text-white hover:bg-gray-700 text-sm">
                  + Novo Tema
                </button>
              </div>
              
              {temas.map((tema) => (
                <div key={tema.id} className="border border-gray-300 p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900">{tema.nome}</h3>
                      <p className="text-sm text-gray-600 mt-1">{tema.descricao}</p>
                      <p className="text-xs text-gray-500 mt-2">{tema.etapas} etapas</p>
                    </div>
                    <div className="flex gap-2">
                      <button className="px-3 py-1 text-xs border border-gray-400 hover:bg-gray-100">
                        Editar
                      </button>
                      <button className="px-3 py-1 text-xs border border-gray-400 hover:bg-gray-100">
                        Excluir
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === "etapas" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <p className="text-sm text-gray-600">Defina a estrutura das etapas</p>
                <button className="px-4 py-2 bg-gray-900 text-white hover:bg-gray-700 text-sm">
                  + Nova Etapa
                </button>
              </div>

              <div className="border border-gray-300">
                <table className="w-full">
                  <thead className="bg-gray-100 border-b border-gray-300">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Nº</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Nome</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Tema</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Atividades</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {etapas.map((etapa) => (
                      <tr key={etapa.id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900 font-bold">{etapa.numero}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{etapa.nome}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{etapa.tema}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{etapa.atividades}</td>
                        <td className="px-4 py-3">
                          <button className="px-3 py-1 text-xs border border-gray-400 hover:bg-gray-100">
                            Editar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "atividades" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <p className="text-sm text-gray-600">Ordene as atividades por drag-and-drop</p>
                <button className="px-4 py-2 bg-gray-900 text-white hover:bg-gray-700 text-sm">
                  + Nova Atividade
                </button>
              </div>

              {atividades.map((ativ) => (
                <div key={ativ.id} className="border border-gray-300 p-4 flex items-center gap-4 hover:bg-gray-50 cursor-move">
                  <GripVertical className="w-5 h-5 text-gray-400" />
                  <div className="w-8 h-8 border border-gray-300 bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-gray-700">{ativ.ordem}</span>
                  </div>
                  <div className="w-10 h-10 border border-gray-300 bg-gray-100 flex items-center justify-center flex-shrink-0">
                    {ativ.tipo === "vídeo" && <Play className="w-5 h-5 text-gray-600" />}
                    {ativ.tipo === "quiz" && <FileText className="w-5 h-5 text-gray-600" />}
                    {ativ.tipo === "áudio" && <Music className="w-5 h-5 text-gray-600" />}
                    {ativ.tipo === "letra" && <ImageIcon className="w-5 h-5 text-gray-600" />}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-gray-900">{ativ.nome}</h4>
                    <p className="text-xs text-gray-500">{ativ.etapa} • Tipo: {ativ.tipo}</p>
                  </div>
                  <div className="flex gap-2">
                    <button className="px-3 py-1 text-xs border border-gray-400 hover:bg-gray-100">
                      Editar
                    </button>
                    <button className="px-3 py-1 text-xs border border-gray-400 hover:bg-gray-100">
                      Excluir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === "assets" && (
            <div className="space-y-6">
              {/* Upload Section */}
              <div className="border-2 border-dashed border-gray-300 p-8 text-center">
                {uploadState === "idle" && (
                  <>
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-sm text-gray-700 mb-2">
                      Arraste arquivos ou clique para fazer upload
                    </p>
                    <p className="text-xs text-gray-500 mb-4">
                      Suporta: MP4, MP3, PNG, JPG (máx. 50MB)
                    </p>
                    <button
                      onClick={simulateUpload}
                      className="px-4 py-2 bg-gray-900 text-white hover:bg-gray-700 text-sm"
                    >
                      Selecionar Arquivos
                    </button>
                  </>
                )}

                {uploadState === "uploading" && (
                  <div className="space-y-3">
                    <Loader className="w-12 h-12 text-gray-600 mx-auto animate-spin" />
                    <p className="text-sm text-gray-700">Fazendo upload...</p>
                    <div className="max-w-xs mx-auto">
                      <div className="h-2 bg-gray-200 border border-gray-300">
                        <div
                          className="h-full bg-gray-900 transition-all"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-600 mt-1">{uploadProgress}%</p>
                    </div>
                  </div>
                )}

                {uploadState === "success" && (
                  <div className="space-y-3">
                    <CheckCircle className="w-12 h-12 text-gray-900 mx-auto" />
                    <p className="text-sm text-gray-900 font-bold">Upload concluído!</p>
                  </div>
                )}

                {uploadState === "error" && (
                  <div className="space-y-3">
                    <AlertCircle className="w-12 h-12 text-gray-900 mx-auto" />
                    <p className="text-sm text-gray-900 font-bold">Erro no upload</p>
                    <button
                      onClick={() => setUploadState("idle")}
                      className="px-4 py-2 border border-gray-400 hover:bg-gray-100 text-sm"
                    >
                      Tentar Novamente
                    </button>
                  </div>
                )}
              </div>

              {/* Assets List */}
              <div className="border border-gray-300">
                <div className="p-4 border-b border-gray-300">
                  <h3 className="font-bold text-gray-900">Assets Cadastrados</h3>
                </div>
                <table className="w-full">
                  <thead className="bg-gray-100 border-b border-gray-300">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Nome</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Tipo</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Tamanho</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Data</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assets.map((asset) => (
                      <tr key={asset.id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">{asset.nome}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{asset.tipo}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{asset.tamanho}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 text-xs border ${
                            asset.status === "publicado"
                              ? "border-gray-400 bg-white text-gray-700"
                              : "border-gray-900 bg-gray-900 text-white"
                          }`}>
                            {asset.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{asset.data}</td>
                        <td className="px-4 py-3 flex gap-2">
                          <button className="px-3 py-1 text-xs border border-gray-400 hover:bg-gray-100">
                            Editar
                          </button>
                          <button className="px-3 py-1 text-xs border border-gray-400 hover:bg-gray-100">
                            Excluir
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
