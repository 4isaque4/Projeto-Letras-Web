import { Loader, AlertCircle, Inbox } from "lucide-react";

interface StateDisplayProps {
  type: "loading" | "empty" | "error";
  message?: string;
}

export default function StateDisplay({ type, message }: StateDisplayProps) {
  if (type === "loading") {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Loader className="w-12 h-12 text-gray-400 animate-spin mb-4" />
        <p className="text-sm text-gray-600">{message || "Carregando..."}</p>
      </div>
    );
  }

  if (type === "empty") {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Inbox className="w-12 h-12 text-gray-300 mb-4" />
        <p className="text-sm font-bold text-gray-900 mb-1">Nenhum registro encontrado</p>
        <p className="text-xs text-gray-600">{message || "Não há dados para exibir"}</p>
      </div>
    );
  }

  if (type === "error") {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertCircle className="w-12 h-12 text-gray-900 mb-4" />
        <p className="text-sm font-bold text-gray-900 mb-1">Erro ao carregar dados</p>
        <p className="text-xs text-gray-600 mb-4">{message || "Tente novamente mais tarde"}</p>
        <button className="px-4 py-2 border border-gray-400 hover:bg-gray-100 text-sm">
          Tentar Novamente
        </button>
      </div>
    );
  }

  return null;
}
