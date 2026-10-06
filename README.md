# devjr-stats

Um app de moderação do Reddit que mede a saúde do **r/devjr**, uma comunidade de ~3,2 mil devs iniciantes. Eu sou moderador dela desde abril de 2025, e este app roda lá dentro, em produção, desde outubro de 2026.

Feito em **TypeScript**, na plataforma de apps do próprio Reddit (Devvit).

## Por que ele existe

Eu moderava o r/devjr sozinho e queria crescer a comunidade e ajudar quem está começando. Para isso eu precisava de números: quantos posts por semana, se alguém responde, quando as pessoas participam.

O Insights do Reddit mostra o volume (membros, visualizações, posts), mas não responde se a comunidade está respondendo quem pergunta. E a API do Reddit deixou de ser self-service em nov/2025: a chave passou a depender de aprovação manual, e há relatos de que projeto pessoal quase não passa.

A saída foi escrever um **app do Devvit**: ele roda dentro da comunidade, sem chave de API e sem servidor meu, e aparece como um item no menu de moderador.

## O que ele mostra

Um item **Estatisticas** no menu da comunidade abre este relatório (o texto do app é sem acento de propósito, porque eu mantenho o código-fonte só em ASCII). Este é o resultado real do r/devjr:

```
r/devjr - ultimos 28 dias
Membros hoje: 3213

POSTS (22 lidos)
Posts por semana: 5,5
Comentarios por post (media): 9,1
Pontos por post (media): 8,6
Posts sem comentario: 0 (0%)

QUANDO RENDE (horario de Brasilia)
Melhor dia: quarta (16,0 comentarios por post)
Melhor horario: 18h (9,5 comentarios por post)

PARTICIPACAO (posts mais recentes)
Primeira resposta: mediana de 41 min
Posts com resposta: 22 de 22
Autores diferentes nos ultimos 7 dias: 22
```

**O que o relatório me ensinou:** todo post recebe resposta, e a primeira vem em uns 41 minutos. O gargalo do r/devjr não é a resposta, é a **quantidade de posts**. Isso mudou o meu roadmap: eu tinha pensado numa lista de "posts sem resposta" e descartei a ideia, porque hoje não há nenhum.

## Decisões técnicas

- **Devvit em vez da API.** Pelo motivo acima, e porque o app roda onde os dados já estão.
- **Cálculo separado do acesso ao Reddit.** `src/core/stats.ts` só recebe dados puros e devolve os números e o texto. Quem fala com o Reddit é o `src/core/read-subreddit.ts`, que traduz o que vem de lá para o formato do cálculo. Assim o cálculo tem testes unitários (`node:test`) sem precisar do Reddit.
- **Leitura com custo controlado.** Os comentários custam uma requisição por post, então o app lê os 100 posts mais novos e só os comentários dos 30 mais novos, numa janela de 28 dias.
- **Estatística honesta com amostra pequena.** O tempo de resposta usa a **mediana**, porque um post esquecido distorce a média. Melhor dia e melhor horário só aparecem com pelo menos 2 posts no mesmo slot; senão o relatório diz "sem dados suficientes".
- **TypeScript estrito** (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`), ESLint e CI no GitHub Actions.
- **Comparei com o Insights antes de seguir.** Parte do que eu tinha planejado o Insights já mostra. O app ficou com o que ele não mostra: o quão bem a comunidade responde.

## Stack

TypeScript · Node 24 · Devvit (plataforma de apps do Reddit) · Hono · Vite · ESLint e Prettier · GitHub Actions

## Estrutura

```
src/
  core/
    stats.ts            o cálculo e o texto do relatório (puro, sem Reddit)
    stats.test.ts       testes do cálculo
    read-subreddit.ts   lê posts e comentários do Reddit
  routes/
    menu.ts             o item "Estatisticas" do menu de moderador
    forms.ts            o formulário de leitura
  index.ts              liga as rotas
devvit.json             menu, formulários e permissões do app
```

## Como rodar

Precisa de Node 24 ou mais novo, de uma conta no Reddit e de um subreddit de teste (o do `devvit.json` é o `devjr_stats_dev`).

```
npm install
npm run dev         # roda o app no subreddit de teste, recarregando a cada mudança
npm run test:unit   # testes do cálculo
npm run deploy      # confere tipos e lint e sobe uma versão para o Reddit
```

## Próximos passos

- Puxar pelo app as entradas e saídas de membros e a curva de membros ao longo do tempo (hoje só o Insights mostra).
- Guardar uma medição por semana, para ver o efeito de cada mudança de engajamento.

---

## For Reddit moderators

A moderator tool that shows engagement numbers for a community, right inside Reddit. The text inside the app is in Portuguese, because it was built for a Portuguese-speaking community.

### What it does

It adds one item, **Estatisticas** ("Statistics"), to the subreddit menu. The item is visible only to moderators, and opens a read-only window with:

| Number | What it tells you |
| --- | --- |
| Members today | Current subscriber count |
| Posts per week | How active the community is |
| Comments per post (average) | How much conversation each post gets |
| Points per post (average) | How well posts are received |
| Posts without comments | How many posts nobody answered, and their share |
| Best day and best hour | When posts get the most comments (Brasilia time, UTC-3) |
| First reply | The median time until someone other than the author replies |
| Different authors in the last 7 days | How many people posted or commented |

### How to use

1. Install the app on a subreddit you moderate.
2. Open the subreddit page and click the three dots (...) next to **Mod Tools**.
3. Click **Estatisticas** and wait a few seconds.
4. Read the numbers and click **Fechar** (close).

### Data and privacy

- It uses only these fields of the posts and comments of the subreddit where it is installed: author name, date, points, number of comments and whether the item was removed. It does not use the text of posts or comments.
- It does not read private messages, the mod queue, the mod log or any other subreddit.
- It does not store anything and does not send data outside Reddit.
- It does not post, comment, vote, remove, lock or change any setting. The code only reads.

### Limits

- It looks at the newest 100 posts, within the last 28 days.
- The reply time and the authors in comments come from the 30 newest posts, and only from top-level comments (replies to comments are not counted).
- Best day and best hour need at least two posts in the same slot, otherwise they show "sem dados suficientes" (not enough data).
- Visits and page views over time are not included. They are in Reddit's own Insights.
