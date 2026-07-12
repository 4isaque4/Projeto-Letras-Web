import { useCallback, useEffect, useMemo, useState } from "react";
import { BookOpen, CheckCircle2, Clock3, LockKeyhole, RefreshCw, UnlockKeyhole } from "lucide-react";
import StateDisplay from "../../components/StateDisplay";
import { apiGet, apiPatch } from "../../core/api/client";
import { getActivityStatePresentation } from "./activityAccessPresentation";

interface LinkItem { id: string; aluno: string; tutor: string; studentId: string; }
interface Lesson { id: string; title: string; instructions: string; sequenceOrder: number; accessStatus: "locked" | "available"; progressStatus: "not_started" | "em_andamento" | "completed"; attemptCount: number; pointsAwarded: number; canReplay: boolean; }
interface Module { id: string; title: string; lessons: Lesson[]; }
interface Stage { stageNumber: number; title: string; completed: boolean; modules: Module[]; }
interface Theme { id: string; title: string; stages: Stage[]; }
interface Catalog { link: { id: string }; themes: Theme[]; }

const iconByKey = { "circle-check": CheckCircle2, lock: LockKeyhole, unlock: UnlockKeyhole, clock: Clock3 };

export default function AtividadesAlfabetizando() {
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState("");

  useEffect(() => { void (async () => { try { const response = await apiGet("/cadastros/vinculos") as { confirmados: LinkItem[] }; const rows = response.confirmados ?? []; setLinks(rows); setSelectedStudentId(rows[0]?.studentId ?? ""); } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível carregar os vínculos."); } finally { setLoading(false); } })(); }, []);

  const loadCatalog = useCallback(async () => {
    if (!selectedStudentId) { setCatalog(null); return; }
    try { setLoading(true); setError(""); setCatalog(await apiGet(`/learner-activities/catalog?studentId=${encodeURIComponent(selectedStudentId)}`) as Catalog); }
    catch (cause) { setCatalog(null); setError(cause instanceof Error ? cause.message : "Não foi possível carregar as atividades."); }
    finally { setLoading(false); }
  }, [selectedStudentId]);
  useEffect(() => { void loadCatalog(); }, [loadCatalog]);
  const selectedLink = useMemo(() => links.find((link) => link.studentId === selectedStudentId), [links, selectedStudentId]);

  const changeAccess = async (lesson: Lesson) => {
    if (!catalog?.link.id) return;
    const nextStatus = lesson.accessStatus === "available" ? "locked" : "available";
    try { setUpdatingId(lesson.id); setError(""); await apiPatch("/learner-activities/access", { linkId: catalog.link.id, changes: [{ activityId: lesson.id, accessStatus: nextStatus }], reason: nextStatus === "available" ? "Liberada pelo painel" : "Bloqueada pelo painel" }); await loadCatalog(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível alterar a atividade."); }
    finally { setUpdatingId(""); }
  };

  return <div className="space-y-6">
    <header className="flex flex-col gap-4 border-b border-gray-300 pb-5 lg:flex-row lg:items-end lg:justify-between"><div><h1 className="text-2xl font-bold text-gray-900">Atividades do alfabetizando</h1><p className="mt-1 max-w-2xl text-sm text-gray-600">Organize a sequência individual. A conclusão permanece registrada mesmo quando uma aula é bloqueada.</p></div><button type="button" onClick={() => void loadCatalog()} disabled={!selectedStudentId || loading} className="inline-flex items-center justify-center gap-2 border border-gray-400 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-100 disabled:opacity-50"><RefreshCw className="h-4 w-4" /> Atualizar</button></header>
    <section className="border border-gray-300 bg-white p-4"><label htmlFor="activity-student" className="mb-2 block text-sm font-bold text-gray-900">Alfabetizando e vínculo</label><select id="activity-student" value={selectedStudentId} onChange={(event) => setSelectedStudentId(event.target.value)} className="w-full border border-gray-400 bg-white px-3 py-2 text-sm lg:max-w-xl"><option value="">Selecione um alfabetizando</option>{links.map((link) => <option key={link.id} value={link.studentId}>{link.aluno} — {link.tutor}</option>)}</select>{selectedLink ? <p className="mt-3 text-sm text-gray-600"><span className="font-semibold text-gray-900">Alfabetizador:</span> {selectedLink.tutor}</p> : null}</section>
    {error ? <StateDisplay type="error" message={error} /> : null}
    {loading ? <StateDisplay type="loading" /> : !selectedStudentId ? <StateDisplay type="empty" message="Selecione um alfabetizando para organizar suas atividades." /> : !catalog?.themes.length ? <StateDisplay type="empty" message="Nenhuma atividade foi atribuída a este vínculo." /> : <div className="space-y-6">{catalog.themes.map((theme) => <section key={theme.id} className="space-y-4"><div className="flex items-center gap-3"><BookOpen className="h-5 w-5 text-slate-700" /><div><p className="text-xs font-bold uppercase tracking-wide text-gray-500">Tema</p><h2 className="text-xl font-bold text-gray-900">{theme.title}</h2></div></div>{theme.stages.map((stage) => <div key={stage.stageNumber} className="border border-gray-300 bg-white"><div className="flex items-center justify-between border-b border-gray-300 bg-gray-100 px-4 py-3"><h3 className="font-bold text-gray-900">{stage.title}</h3><span className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700">{stage.completed ? <CheckCircle2 className="h-4 w-4 text-green-700" /> : <Clock3 className="h-4 w-4" />}{stage.completed ? "Etapa concluída" : "Etapa em andamento"}</span></div>{stage.modules.map((module) => <div key={module.id} className="p-4"><h4 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-600">{module.title}</h4><div className="space-y-2">{module.lessons.map((lesson) => { const state = getActivityStatePresentation(lesson); const StateIcon = iconByKey[state.icon]; return <div key={lesson.id} className="grid gap-3 border border-gray-300 p-4 md:grid-cols-[auto_1fr_auto] md:items-center"><div className="flex h-9 w-9 items-center justify-center border border-gray-300 bg-gray-50"><StateIcon className="h-5 w-5" /></div><div><div className="flex flex-wrap items-center gap-2"><p className="font-bold text-gray-900">{lesson.sequenceOrder}. {lesson.title}</p><span className="border border-gray-300 bg-gray-50 px-2 py-0.5 text-xs font-semibold text-gray-700">{state.label}</span></div><p className="mt-1 text-sm text-gray-600">{lesson.instructions || "Sem orientação adicional."}</p><p className="mt-1 text-xs text-gray-500">{lesson.attemptCount} tentativa(s) · {lesson.pointsAwarded} ponto(s){lesson.canReplay ? " · Pode ser refeita" : ""}</p></div><button type="button" disabled={updatingId === lesson.id} onClick={() => void changeAccess(lesson)} className="inline-flex min-w-28 items-center justify-center gap-2 border border-slate-700 px-3 py-2 text-sm font-bold text-slate-800 hover:bg-slate-100 disabled:opacity-50">{lesson.accessStatus === "available" ? <LockKeyhole className="h-4 w-4" /> : <UnlockKeyhole className="h-4 w-4" />}{state.actionLabel}</button></div>; })}</div></div>)}</div>)}</section>)}</div>}
  </div>;
}
