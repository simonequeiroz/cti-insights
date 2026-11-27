# Divisão de tarefas e Kanban

**Projeto:** Sistema CTI Insights · **Grupo:** Data Pulse · **Turma:** ADS B (CSTADS126N2)

**Quadro Kanban (público):** https://github.com/users/simonequeiroz/projects/1

O quadro fica no **GitHub Projects**, ligado ao repositório, como sugere o
plano de ensino (seção 1.3.7). Ele tem as quatro colunas pedidas:

| Coluna | Significado |
|---|---|
| **Backlog** | Tudo o que ainda pode ser feito (melhorias futuras) |
| **A Fazer** | Planejado para a sprint atual |
| **Em Andamento** | Sendo feito agora |
| **Concluído** | Entregue e funcionando |

Cada tarefa tem **responsável, área, sprint e prazo**. Há duas visões:
- **Kanban:** as colunas;
- **Por responsável e prazo:** uma tabela para filtrar por pessoa, área ou sprint.

## Papéis do grupo

| Papel | Quem | O que faz |
|---|---|---|
| **Product Owner** | Simone Queiroz Batista | Representa a "voz da CTI" e prioriza o que traz mais valor ao problema do cliente |
| **Scrum Master** | Simone Queiroz Batista | Organiza o trabalho, mantém o quadro atualizado e remove impedimentos |
| **Time de desenvolvimento** | Todos os integrantes | Cada um responde por uma disciplina (tabela abaixo) |

## Responsabilidades por área

| Integrante | Área | Pasta |
|---|---|---|
| Ricardo Justino Jairi Silvestre | Back-end (Java/Spring Boot) | `backend-java/` |
| Thyphanny Katherine Silva Franca | Front-end (Vue 3 / Tailwind CSS) | `frontend-vue/` |
| Miguel Herculano Viana | Ciência de Dados (Python/pandas) | `analytics-python/` |
| Ryan Vinicius da Silva | Banco de dados e nuvem (PostgreSQL/Neon, deploy) | `database/` |
| Simone Queiroz Batista | Gestão, SAGA e QA (repositório, integração, testes e documentação) | `docs/`, `evidencias/`, `testes/` |

## Sprints

| Sprint | Entrega | Prazo |
|---|---|---|
| Sprint 1 | Problemática, hipóteses, diagrama de classes, protótipos e cadastro na SAGA | 28/08/2026 |
| Sprint 2 | Front-end navegável e projeto Spring Boot iniciando (tag `sprint-2`) | 02/10/2026 |
| Sprint 3 | ETL em Python, banco, API REST com CRUD e front consumindo a API | 26/11/2026 |
| Sprint 4 | Sistema publicado, documentação final, ensaio e entrega | 03/12/2026 |

## Reta final: tarefas em aberto (posição em 27/11/2026)

| Tarefa | Responsável | Prazo |
|---|---|---|
| Gráficos de dispersão, histograma e boxplot (Python + Dashboard) | Miguel e Thyphanny | 28/11 |
| Ajustar frases dos insights | Miguel | 28/11 |
| Deploy: Vercel (front) e Render (Spring e Python) | Ryan | 29/11 |
| Link do sistema publicado no relatório e no README | Simone | 30/11 |
| Ensaio da apresentação (cada um explica a sua parte) | Todos | 30/11 |
| Pré-apresentação ao coordenador | Todos | 01/12 |
| Pull Request final e tag da entrega | Simone | 03/12 |
| Vídeo pitch | Todos | 09/12 |
| Apresentação final | Todos | 10/12 |

**Combinado da equipe:** tarefa sem andamento até o prazo é assumida pela
Gestão, para não atrasar a entrega. O quadro é a fonte oficial e mostra a
situação atualizada. A contribuição de cada integrante está no
[relatório final](RELATORIO-FINAL.md), seção 8, e no histórico de Pull
Requests e commits do repositório.
