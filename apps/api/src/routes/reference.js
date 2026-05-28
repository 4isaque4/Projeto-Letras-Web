import { Router } from "express";

export const referenceRouter = Router();

const UFS = [
  { id: 1, code: "AC", name: "Acre" },
  { id: 2, code: "AL", name: "Alagoas" },
  { id: 3, code: "AP", name: "Amapá" },
  { id: 4, code: "AM", name: "Amazonas" },
  { id: 5, code: "BA", name: "Bahia" },
  { id: 6, code: "CE", name: "Ceará" },
  { id: 7, code: "DF", name: "Distrito Federal" },
  { id: 8, code: "ES", name: "Espírito Santo" },
  { id: 9, code: "GO", name: "Goiás" },
  { id: 10, code: "MA", name: "Maranhão" },
  { id: 11, code: "MT", name: "Mato Grosso" },
  { id: 12, code: "MS", name: "Mato Grosso do Sul" },
  { id: 13, code: "MG", name: "Minas Gerais" },
  { id: 14, code: "PA", name: "Pará" },
  { id: 15, code: "PB", name: "Paraíba" },
  { id: 16, code: "PR", name: "Paraná" },
  { id: 17, code: "PE", name: "Pernambuco" },
  { id: 18, code: "PI", name: "Piauí" },
  { id: 19, code: "RJ", name: "Rio de Janeiro" },
  { id: 20, code: "RN", name: "Rio Grande do Norte" },
  { id: 21, code: "RS", name: "Rio Grande do Sul" },
  { id: 22, code: "RO", name: "Rondônia" },
  { id: 23, code: "RR", name: "Roraima" },
  { id: 24, code: "SC", name: "Santa Catarina" },
  { id: 25, code: "SP", name: "São Paulo" },
  { id: 26, code: "SE", name: "Sergipe" },
  { id: 27, code: "TO", name: "Tocantins" },
];

// GET /reference/ufs
referenceRouter.get("/ufs", (_req, res) => {
  res.json(UFS);
});

// GET /reference/ufs/:uf/cities
referenceRouter.get("/ufs/:uf/cities", async (req, res) => {
  try {
    const ufCode = String(req.params.uf ?? "").toUpperCase().trim();
    const ufEntry = UFS.find((item) => item.code === ufCode);

    if (!ufEntry) {
      return res.status(404).json({ message: "UF nao encontrada." });
    }

    const url = `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${ufCode}/municipios?orderBy=nome`;
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });

    if (!response.ok) {
      return res.status(502).json({ message: "Falha ao buscar cidades do IBGE." });
    }

    const data = await response.json();
    const cities = (data ?? []).map((item, index) => ({
      id: item.id ?? index + 1,
      uf: ufCode,
      name: item.nome ?? "",
    }));

    return res.json(cities);
  } catch (err) {
    return res.status(500).json({ message: err.message ?? "Erro ao buscar cidades." });
  }
});
