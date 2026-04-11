import { createBrowserRouter } from "react-router";
import { Splash } from "./pages/Splash";
import { Login } from "./pages/Login";
import { CadastroStep1 } from "./pages/CadastroStep1";
import { CadastroStep2 } from "./pages/CadastroStep2";
import { CadastroStep3 } from "./pages/CadastroStep3";
import { CadastroConfirm } from "./pages/CadastroConfirm";
import { ModoEnsino } from "./pages/ModoEnsino";
import { ConfirmarGrupo } from "./pages/ConfirmarGrupo";
import { Modulos } from "./pages/Modulos";
import { Aulas } from "./pages/Aulas";
import { AulaAbertura } from "./pages/AulaAbertura";
import { TelaConteudo } from "./pages/TelaConteudo";
import { AtividadeTela } from "./pages/AtividadeTela";
import { AulaConclusao } from "./pages/AulaConclusao";
import { ConfirmarTema } from "./pages/ConfirmarTema";
import { Tutoriais, Acompanhar, Pontuacao, Perfil } from "./pages/PlaceholderPage";

export const router = createBrowserRouter([
  { path: "/", Component: Splash },
  { path: "/login", Component: Login },
  { path: "/cadastro/1", Component: CadastroStep1 },
  { path: "/cadastro/2", Component: CadastroStep2 },
  { path: "/cadastro/3", Component: CadastroStep3 },
  { path: "/cadastro/confirmar", Component: CadastroConfirm },
  { path: "/modo", Component: ModoEnsino },
  { path: "/modo/confirmar-grupo", Component: ConfirmarGrupo },
  { path: "/modulos", Component: Modulos },
  { path: "/modulos/:moduloId/confirmar-tema", Component: ConfirmarTema },
  { path: "/modulos/:moduloId/aulas", Component: Aulas },
  { path: "/modulos/:moduloId/aulas/:aulaId", Component: AulaAbertura },
  { path: "/modulos/:moduloId/aulas/:aulaId/tela/:telaNum", Component: TelaConteudo },
  { path: "/modulos/:moduloId/aulas/:aulaId/tela/:telaNum/atividade/:atividadeNum", Component: AtividadeTela },
  { path: "/modulos/:moduloId/aulas/:aulaId/conclusao", Component: AulaConclusao },
  { path: "/tutoriais", Component: Tutoriais },
  { path: "/acompanhar", Component: Acompanhar },
  { path: "/pontuacao", Component: Pontuacao },
  { path: "/perfil", Component: Perfil },
]);
