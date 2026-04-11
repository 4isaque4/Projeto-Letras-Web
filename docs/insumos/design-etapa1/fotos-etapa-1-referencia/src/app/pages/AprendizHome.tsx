import { ScreenLayout } from "../components/ScreenLayout";
import { Trophy, Clock, BookOpen } from "lucide-react";

export function AprendizHome() {
  return (
    <ScreenLayout>
      <h2 className="mb-4">Olá, Aprendiz!</h2>

      <div className="bg-white rounded-lg p-4 mb-4">
        <div className="flex items-center gap-3 mb-2">
          <BookOpen size={20} className="text-[#17335B]" />
          <span>Módulo 1 – Vogais e Sons Iniciais</span>
        </div>
        <p className="text-[#333] mb-2" style={{ fontSize: 13 }}>Aula 2 – Sons das Vogais</p>
        <div className="w-full bg-[#E4E4E4] rounded-full h-2">
          <div className="bg-[#17335B] h-2 rounded-full" style={{ width: "60%" }} />
        </div>
        <p style={{ fontSize: 12 }} className="text-[#333] mt-1">3/5 telas</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-lg p-4 text-center">
          <Trophy size={24} className="mx-auto text-[#17335B] mb-1" />
          <p style={{ fontSize: 20, fontWeight: 600 }}>150</p>
          <p style={{ fontSize: 12 }} className="text-[#333]">pontos</p>
        </div>
        <div className="bg-white rounded-lg p-4 text-center">
          <Clock size={24} className="mx-auto text-[#17335B] mb-1" />
          <p style={{ fontSize: 20, fontWeight: 600 }}>3</p>
          <p style={{ fontSize: 12 }} className="text-[#333]">dias seguidos</p>
        </div>
      </div>

      <div className="mt-6 bg-white rounded-lg p-4">
        <p className="text-[#17335B]" style={{ fontSize: 14 }}>Faltam 2 etapas para completar a aula!</p>
      </div>
    </ScreenLayout>
  );
}