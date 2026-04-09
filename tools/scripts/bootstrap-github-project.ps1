param(
  [string]$Owner = "4isaque4",
  [string]$Repo = "Projeto-Letras-Web",
  [string]$ProjectTitle = "Projeto Letras - Web and API",
  [switch]$SkipSeedIssues
)

$ErrorActionPreference = "Stop"

function Require-Tooling {
  gh --version | Out-Null
  if ($LASTEXITCODE -ne 0) {
    throw "GitHub CLI (gh) nao encontrado."
  }

  gh auth status | Out-Null
  if ($LASTEXITCODE -ne 0) {
    throw "Voce precisa autenticar: gh auth login -h github.com"
  }
}

function Upsert-Labels {
  param([string]$TargetRepo)

  $labels = @(
    @{ Name = "type:feature"; Color = "1D76DB"; Description = "Nova funcionalidade" },
    @{ Name = "type:bug"; Color = "D73A4A"; Description = "Correcao de defeito" },
    @{ Name = "type:chore"; Color = "6F42C1"; Description = "Manutencao tecnica" },
    @{ Name = "type:spike"; Color = "FBCA04"; Description = "Pesquisa tecnica" },
    @{ Name = "area:web"; Color = "0E8A16"; Description = "Escopo web" },
    @{ Name = "area:api"; Color = "B60205"; Description = "Escopo API" },
    @{ Name = "area:fullstack"; Color = "5319E7"; Description = "Escopo fullstack" },
    @{ Name = "area:infra"; Color = "0052CC"; Description = "Infra e dev experience" },
    @{ Name = "status:backlog"; Color = "C2E0C6"; Description = "Aguardando planejamento" },
    @{ Name = "status:ready"; Color = "FBCA04"; Description = "Pronto para desenvolvimento" },
    @{ Name = "status:in-progress"; Color = "F9D0C4"; Description = "Em desenvolvimento" },
    @{ Name = "status:review"; Color = "C5DEF5"; Description = "Em revisao" },
    @{ Name = "status:done"; Color = "0E8A16"; Description = "Concluido" },
    @{ Name = "priority:P0"; Color = "B60205"; Description = "Critico" },
    @{ Name = "priority:P1"; Color = "D93F0B"; Description = "Alta prioridade" },
    @{ Name = "priority:P2"; Color = "FBCA04"; Description = "Media prioridade" },
    @{ Name = "priority:P3"; Color = "0E8A16"; Description = "Baixa prioridade" }
  )

  foreach ($label in $labels) {
    gh label create $label.Name -R $TargetRepo --color $label.Color --description $label.Description --force | Out-Null
  }
}

function Create-Project {
  param(
    [string]$ProjectOwner,
    [string]$ProjectTitle,
    [string]$TargetRepo
  )

  $projectNumber = (gh project create --owner $ProjectOwner --title $ProjectTitle --format json --jq ".number").Trim()
  if ([string]::IsNullOrWhiteSpace($projectNumber)) {
    throw "Nao foi possivel criar o GitHub Project."
  }

  gh project link $projectNumber --owner $ProjectOwner --repo $TargetRepo | Out-Null

  gh project field-create $projectNumber --owner $ProjectOwner --name "Area" --data-type SINGLE_SELECT --single-select-options "Web,API,Fullstack,Infra" | Out-Null
  gh project field-create $projectNumber --owner $ProjectOwner --name "Type" --data-type SINGLE_SELECT --single-select-options "Feature,Bug,Chore,Spike" | Out-Null
  gh project field-create $projectNumber --owner $ProjectOwner --name "Priority" --data-type SINGLE_SELECT --single-select-options "P0,P1,P2,P3" | Out-Null

  return $projectNumber
}

function Seed-Issues {
  param(
    [string]$TargetRepo,
    [string]$ProjectOwner,
    [string]$ProjectNumber
  )

  $seedIssues = @(
    @{
      Title = "Estruturar autenticacao websocket na API"
      Body = "Implementar autenticacao de conexao WS e tratar reconexao segura."
      Labels = @("type:feature", "area:api", "priority:P1", "status:backlog")
    },
    @{
      Title = "Criar painel de usuarios online no web"
      Body = "Exibir usuarios conectados em tempo real no dashboard admin."
      Labels = @("type:feature", "area:web", "priority:P1", "status:backlog")
    },
    @{
      Title = "Definir contrato de eventos realtime web/API"
      Body = "Documentar e validar nomes de evento, payloads e codigos de erro."
      Labels = @("type:spike", "area:fullstack", "priority:P0", "status:backlog")
    },
    @{
      Title = "Configurar pipeline de qualidade (lint + build)"
      Body = "Padronizar checks minimos para merge na main."
      Labels = @("type:chore", "area:infra", "priority:P2", "status:backlog")
    }
  )

  foreach ($item in $seedIssues) {
    $labelArgs = @()
    foreach ($label in $item.Labels) {
      $labelArgs += @("--label", $label)
    }

    $issueUrl = (gh issue create -R $TargetRepo --title $item.Title --body $item.Body @labelArgs).Trim()
    if (-not [string]::IsNullOrWhiteSpace($issueUrl)) {
      gh project item-add $ProjectNumber --owner $ProjectOwner --url $issueUrl | Out-Null
    }
  }
}

try {
  Require-Tooling

  $targetRepo = "$Owner/$Repo"
  Write-Host "Aplicando labels em $targetRepo..."
  Upsert-Labels -TargetRepo $targetRepo

  Write-Host "Criando GitHub Project..."
  $projectNumber = Create-Project -ProjectOwner $Owner -ProjectTitle $ProjectTitle -TargetRepo $targetRepo

  if (-not $SkipSeedIssues) {
    Write-Host "Criando issues iniciais e adicionando ao Project..."
    Seed-Issues -TargetRepo $targetRepo -ProjectOwner $Owner -ProjectNumber $projectNumber
  }

  $projectUrl = (gh project view $projectNumber --owner $Owner --format json --jq ".url").Trim()
  Write-Host ""
  Write-Host "Project criado com sucesso."
  Write-Host "Numero: $projectNumber"
  Write-Host "URL: $projectUrl"
}
catch {
  Write-Error $_.Exception.Message
  Write-Host "Dica: rode 'gh auth login -h github.com' e depois 'gh auth refresh -s project'"
  exit 1
}
