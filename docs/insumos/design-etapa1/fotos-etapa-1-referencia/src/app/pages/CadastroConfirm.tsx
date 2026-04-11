import { useNavigate } from "react-router";
import { ScreenLayout } from "../components/ScreenLayout";
import { ActionButton } from "../components/ActionButton";

export function CadastroConfirm() {
  const navigate = useNavigate();

  return (
    <ScreenLayout showNav={false}>
      <p className="mb-6">Confirma os dados do cadastro?</p>

      <div className="bg-white rounded-lg p-4 space-y-2 mb-8">
        <p><strong>CPF:</strong> 000.000.000-00</p>
        <p><strong>Nome:</strong> João da Silva</p>
        <p><strong>E-mail:</strong> joao@email.com</p>
        <p><strong>Celular:</strong> (11) 99999-9999</p>
        <p><strong>Data de Nascimento:</strong> 01/01/1990</p>
        <p><strong>UF:</strong> SP</p>
        <p><strong>Cidade:</strong> São Paulo</p>
        <p><strong>Escolaridade:</strong> Ensino Superior</p>
      </div>

      <div className="flex justify-around mt-8">
        <ActionButton variant="voltar" onClick={() => navigate("/cadastro/3")} />
        <ActionButton variant="confirmar" onClick={() => navigate("/modo")} />
      </div>
    </ScreenLayout>
  );
}
