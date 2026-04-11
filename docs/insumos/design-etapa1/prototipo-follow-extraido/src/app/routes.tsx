import { createBrowserRouter } from 'react-router';
import { MinhasTrilhas } from './pages/MinhasTrilhas';
import { DetalheTrilha } from './pages/DetalheTrilha';
import { AtividadesModulo } from './pages/AtividadesModulo';
import { ExecucaoAtividade } from './pages/ExecucaoAtividade';
import { Progresso } from './pages/Progresso';
import { EstadoVazio } from './pages/EstadoVazio';
import { EstadoErro } from './pages/EstadoErro';
import { EstadoCarregamento } from './pages/EstadoCarregamento';
import { Placeholder } from './pages/Placeholder';
import { Componentes } from './pages/Componentes';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <MinhasTrilhas />,
  },
  {
    path: '/trilha/:id',
    element: <DetalheTrilha />,
  },
  {
    path: '/modulo/:id',
    element: <AtividadesModulo />,
  },
  {
    path: '/atividade/:id',
    element: <ExecucaoAtividade />,
  },
  {
    path: '/progresso',
    element: <Progresso />,
  },
  {
    path: '/tutorial',
    element: <Placeholder title="Tutorial" />,
  },
  {
    path: '/pontuacao',
    element: <Placeholder title="Pontuação" />,
  },
  {
    path: '/perfil',
    element: <Placeholder title="Perfil" />,
  },
  {
    path: '/vazio',
    element: <EstadoVazio />,
  },
  {
    path: '/erro',
    element: <EstadoErro />,
  },
  {
    path: '/carregando',
    element: <EstadoCarregamento />,
  },
  {
    path: '/componentes',
    element: <Componentes />,
  },
]);