import { createBrowserRouter } from "react-router";
import Login from "./pages/Login";
import HomeRedirect from "./pages/HomeRedirect";
import Layout from "./components/Layout";

// Admin Pages
import AdminDashboard from "./pages/admin/Dashboard";
import Alfabetizandos from "./pages/admin/Alfabetizandos";
import AlfabetizandoDetalhe from "./pages/admin/AlfabetizandoDetalhe";
import Alfabetizadores from "./pages/admin/Alfabetizadores";
import Vinculos from "./pages/admin/Vinculos";
import AtividadesAlfabetizando from "./pages/admin/AtividadesAlfabetizando";
import Grupos from "./pages/admin/Grupos";
import Fila from "./pages/admin/Fila";
import Conteudo from "./pages/admin/Conteudo";
import ConteudoBibliotecaPage from "./pages/admin/conteudo/ConteudoBibliotecaPage";
import ConteudoImportarTelasPage from "./pages/admin/conteudo/ConteudoImportarTelasPage";
import ConteudoCriarPage from "./pages/admin/conteudo/ConteudoCriarPage";
import ConteudoVideosPage from "./pages/admin/conteudo/ConteudoVideosPage";
import Ranking from "./pages/admin/Ranking";
import Relatorios from "./pages/admin/Relatorios";
import Configuracoes from "./pages/admin/Configuracoes";
import MobileModulos from "./pages/MobileModulos";

// Tutor Pages
import TutorDashboard from "./pages/tutor/Dashboard";
import MeusAlfabetizandos from "./pages/tutor/MeusAlfabetizandos";

export const router = createBrowserRouter([
  {
    path: "/login",
    Component: Login,
  },
  {
    path: "/",
    Component: Layout,
    children: [
      // Admin routes
      { index: true, Component: HomeRedirect },
      { path: "admin/dashboard", Component: AdminDashboard },
      { path: "admin/alfabetizandos", Component: Alfabetizandos },
      { path: "admin/alfabetizandos/:id", Component: AlfabetizandoDetalhe },
      { path: "admin/alfabetizadores", Component: Alfabetizadores },
      { path: "admin/vinculos", Component: Vinculos },
      { path: "admin/atividades-alfabetizando", Component: AtividadesAlfabetizando },
      { path: "admin/grupos", Component: Grupos },
      { path: "admin/fila", Component: Fila },
      { path: "admin/conteudo", Component: Conteudo },
      { path: "admin/conteudo/biblioteca", Component: ConteudoBibliotecaPage },
      { path: "admin/conteudo/importar-telas", Component: ConteudoImportarTelasPage },
      { path: "admin/conteudo/criar", Component: ConteudoCriarPage },
      { path: "admin/conteudo/videos", Component: ConteudoVideosPage },
      { path: "admin/ranking", Component: Ranking },
      { path: "admin/relatorios", Component: Relatorios },
      { path: "admin/configuracoes", Component: Configuracoes },
      { path: "mobile/modulos", Component: MobileModulos },
      
      // Tutor routes
      { path: "tutor/dashboard", Component: TutorDashboard },
      { path: "tutor/alfabetizandos", Component: MeusAlfabetizandos },
      { path: "tutor/alfabetizandos/:id", Component: AlfabetizandoDetalhe },
      { path: "tutor/fila", Component: Fila },
      { path: "tutor/ranking", Component: Ranking },
      { path: "tutor/configuracoes", Component: Configuracoes },
    ],
  },
]);
