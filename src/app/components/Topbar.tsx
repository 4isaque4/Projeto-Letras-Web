import { Search, Bell, User } from "lucide-react";
import { env } from "../core/config/env";
import { useRealtimeStatus } from "../core/realtime/useRealtimeStatus";

export default function Topbar() {
  const realtime = useRealtimeStatus();

  const statusLabelByConnection = {
    idle: "Inativo",
    connecting: "Conectando",
    connected: "Em tempo real",
    reconnecting: "Reconectando",
    disconnected: "Desconectado",
    error: "Erro de conexao",
  } as const;

  const isConnected = realtime.connectionStatus === "connected";

  return (
    <header className="h-16 border-b border-gray-300 bg-white px-6 flex items-center justify-between">
      <div className="flex items-center gap-4 flex-1 max-w-xl">
        <Search className="w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar..."
          className="flex-1 px-4 py-2 border border-gray-300 bg-gray-50 text-sm focus:outline-none focus:border-gray-500"
        />
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden md:flex items-center gap-2 px-3 py-2 border border-gray-300 bg-gray-50">
          <span
            className={`inline-block w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-gray-400"}`}
          />
          <span className="text-xs text-gray-700">
            {statusLabelByConnection[realtime.connectionStatus]}
          </span>
          <span className="text-xs text-gray-500">|</span>
          <span className="text-xs font-medium text-gray-700">
            {realtime.onlineUsers.length} online
          </span>
          {env.useMocks && (
            <>
              <span className="text-xs text-gray-500">|</span>
              <span className="text-[10px] font-bold uppercase tracking-wide text-amber-700">
                Simulado
              </span>
            </>
          )}
        </div>

        <button className="p-2 hover:bg-gray-100 border border-gray-300">
          <Bell className="w-5 h-5 text-gray-600" />
        </button>
        <button className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 border border-gray-300">
          <User className="w-5 h-5 text-gray-600" />
          <span className="text-sm text-gray-700">Usuário</span>
        </button>
      </div>
    </header>
  );
}
