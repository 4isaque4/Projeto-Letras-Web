import { ScreenLayout } from "../components/ScreenLayout";

export function Tutoriais() {
  return (
    <ScreenLayout>
      <h2 className="mb-4">Tutoriais</h2>
      <div className="bg-white rounded-lg p-4 mb-3">
        <p style={{ fontWeight: 600 }}>Como usar o app</p>
        <p className="text-[#333]" style={{ fontSize: 13 }}>Aprenda a navegar pelo Letras</p>
      </div>
      <div className="bg-white rounded-lg p-4 mb-3">
        <p style={{ fontWeight: 600 }}>Dicas para o Educador</p>
        <p className="text-[#333]" style={{ fontSize: 13 }}>Boas práticas de alfabetização</p>
      </div>
      <div className="bg-white rounded-lg p-4">
        <p style={{ fontWeight: 600 }}>Primeiro contato</p>
        <p className="text-[#333]" style={{ fontSize: 13 }}>Preparando o primeiro encontro</p>
      </div>
    </ScreenLayout>
  );
}

export function Acompanhar() {
  return (
    <ScreenLayout>
      <h2 className="mb-4">Acompanhar</h2>
      <div className="bg-white rounded-lg p-4 mb-3">
        <p style={{ fontWeight: 600 }}>Maria da Silva</p>
        <p className="text-[#333]" style={{ fontSize: 13 }}>Módulo 1 · Aula 2 · 60% concluído</p>
        <div className="w-full bg-[#E4E4E4] rounded-full h-1.5 mt-2">
          <div className="bg-[#17335B] h-1.5 rounded-full" style={{ width: "60%" }} />
        </div>
      </div>
      <div className="bg-white rounded-lg p-4">
        <p style={{ fontWeight: 600 }}>João Pereira</p>
        <p className="text-[#333]" style={{ fontSize: 13 }}>Módulo 1 · Aula 1 · 100% concluído</p>
        <div className="w-full bg-[#E4E4E4] rounded-full h-1.5 mt-2">
          <div className="bg-green-500 h-1.5 rounded-full" style={{ width: "100%" }} />
        </div>
      </div>
    </ScreenLayout>
  );
}

export function Pontuacao() {
  return (
    <ScreenLayout>
      <h2 className="mb-4">Pontuação</h2>
      <div className="bg-white rounded-lg p-6 text-center mb-4">
        <p style={{ fontSize: 48, fontWeight: 600 }} className="text-[#17335B]">350</p>
        <p className="text-[#333]">pontos totais</p>
      </div>
      <div className="space-y-2">
        <div className="bg-white rounded-lg p-3 flex justify-between"><span>Aulas completas</span><span className="text-[#17335B]">+200</span></div>
        <div className="bg-white rounded-lg p-3 flex justify-between"><span>Atividades corretas</span><span className="text-[#17335B]">+100</span></div>
        <div className="bg-white rounded-lg p-3 flex justify-between"><span>Dias seguidos</span><span className="text-[#17335B]">+50</span></div>
      </div>
    </ScreenLayout>
  );
}

export function Perfil() {
  return (
    <ScreenLayout>
      <div className="flex flex-col items-center mt-4">
        <div className="w-20 h-20 rounded-full bg-[#E4E4E4] flex items-center justify-center mb-3" style={{ fontSize: 32 }}>👤</div>
        <h2>João da Silva</h2>
        <p className="text-[#333]" style={{ fontSize: 14 }}>joao@email.com</p>
      </div>
      <div className="mt-6 space-y-2">
        <div className="bg-white rounded-lg p-3"><span>Editar perfil</span></div>
        <div className="bg-white rounded-lg p-3"><span>Configurações</span></div>
        <div className="bg-white rounded-lg p-3"><span>Sobre o Letras</span></div>
        <div className="bg-white rounded-lg p-3 text-red-500"><span>Sair</span></div>
      </div>
    </ScreenLayout>
  );
}
