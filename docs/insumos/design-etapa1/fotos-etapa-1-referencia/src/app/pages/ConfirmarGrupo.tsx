import { useNavigate } from "react-router";
import { ScreenLayout } from "../components/ScreenLayout";
import { ActionButton } from "../components/ActionButton";

export function ConfirmarGrupo() {
  const navigate = useNavigate();

  return (
    <ScreenLayout showNav={true}>
      <p className="mb-6">
        Confirma a inclusão de XXXXXXX XXXXXXXX no grupo XXXXXXXXXXXXXXXXXX?
      </p>

      <div className="space-y-2 mb-8">
        <p>Data da criação do grupo: NN/NN/NNNN</p>
        <p>Etapa em que o grupo se encontra: N</p>
        <p>Número de integrantes deste grupo: NN</p>
        <p>Integrantes do grupo:</p>
        <div className="pl-4 space-y-1">
          <p>Nome do Integrante 1</p>
          <p>Nome do Integrante 2</p>
          <p>Nome do Integrante 3</p>
          <p>Nome do Integrante 4</p>
        </div>
      </div>

      <div className="flex justify-around mt-8">
        <ActionButton variant="voltar" onClick={() => navigate("/modo")} />
        <ActionButton variant="confirmar" onClick={() => navigate("/modulos")} />
      </div>
    </ScreenLayout>
  );
}
