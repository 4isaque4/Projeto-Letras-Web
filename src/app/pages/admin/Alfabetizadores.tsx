export default function Alfabetizadores() {
  const alfabetizadores = [
    { id: 1, nome: "Maria Silva", alunos: 12, taxaResposta: "98%", travados: 1, pontuacao: 450 },
    { id: 2, nome: "João Santos", alunos: 15, taxaResposta: "85%", travados: 3, pontuacao: 380 },
    { id: 3, nome: "Ana Costa", alunos: 10, taxaResposta: "92%", travados: 0, pontuacao: 420 },
    { id: 4, nome: "Pedro Oliveira", alunos: 8, taxaResposta: "88%", travados: 2, pontuacao: 310 },
    { id: 5, nome: "Clara Mendes", alunos: 14, taxaResposta: "95%", travados: 1, pontuacao: 470 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">T6. Alfabetizadores</h1>
          <p className="text-sm text-gray-600 mt-1">Gestão de tutores e desempenho</p>
        </div>
        <button className="px-4 py-2 bg-gray-900 text-white hover:bg-gray-700">
          + Novo Alfabetizador
        </button>
      </div>

      {/* Tabela */}
      <div className="border border-gray-300 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100 border-b border-gray-300">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Nome</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700"># Alunos</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Taxa de Resposta</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Alunos Travados</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Pontuação</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Ações</th>
              </tr>
            </thead>
            <tbody>
              {alfabetizadores.map((tutor) => (
                <tr key={tutor.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900 font-medium">{tutor.nome}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{tutor.alunos}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{tutor.taxaResposta}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs border ${
                      tutor.travados > 0 
                        ? "border-gray-900 bg-gray-900 text-white" 
                        : "border-gray-400 bg-white text-gray-700"
                    }`}>
                      {tutor.travados}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-gray-900">{tutor.pontuacao}</td>
                  <td className="px-4 py-3">
                    <button className="px-3 py-1 text-xs border border-gray-400 hover:bg-gray-100">
                      Ver detalhes
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Paginação */}
        <div className="px-4 py-3 border-t border-gray-300 flex items-center justify-between">
          <p className="text-xs text-gray-600">Mostrando 1-5 de 5 registros</p>
          <div className="flex gap-2">
            <button className="px-3 py-1 text-xs border border-gray-400 bg-gray-100">Anterior</button>
            <button className="px-3 py-1 text-xs border border-gray-400 bg-gray-900 text-white">1</button>
            <button className="px-3 py-1 text-xs border border-gray-400 hover:bg-gray-100">Próximo</button>
          </div>
        </div>
      </div>
    </div>
  );
}
