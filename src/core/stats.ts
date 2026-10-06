export type CommentSample = {
  authorName: string;
  createdAt: Date;
};

export type PostSample = {
  authorName: string;
  createdAt: Date;
  score: number;
  numberOfComments: number;
  // null when the comments of this post were not read
  comments: CommentSample[] | null;
};

export type Slot = {
  label: string;
  avgComments: number;
};

export type Stats = {
  windowDays: number;
  postCount: number;
  postsPerWeek: number;
  avgComments: number;
  avgScore: number;
  withoutComments: number;
  bestDay: Slot | null;
  bestHour: Slot | null;
  firstReply: {
    medianMinutes: number | null;
    answered: number;
    sampled: number;
  };
  authorsLast7Days: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const WINDOW_DAYS = 28;
const BRASILIA_OFFSET_HOURS = -3;
const MIN_POSTS_PER_SLOT = 2;
const DELETED_AUTHOR = '[deleted]';
const WEEKDAYS = [
  'domingo',
  'segunda',
  'terca',
  'quarta',
  'quinta',
  'sexta',
  'sabado',
];

const average = (values: number[]) =>
  values.length === 0
    ? 0
    : values.reduce((sum, value) => sum + value, 0) / values.length;

const median = (values: number[]): number | null => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const upper = sorted[middle];
  if (upper === undefined) return null;
  if (sorted.length % 2 === 1) return upper;
  const lower = sorted[middle - 1];
  return lower === undefined ? upper : (lower + upper) / 2;
};

// Shifts the date so the UTC getters read as Brasilia time.
const toBrasilia = (date: Date) =>
  new Date(date.getTime() + BRASILIA_OFFSET_HOURS * 60 * 60 * 1000);

const weekdayOf = (post: PostSample) =>
  WEEKDAYS[toBrasilia(post.createdAt).getUTCDay()] ?? 'desconhecido';

const hourOf = (post: PostSample) =>
  `${toBrasilia(post.createdAt).getUTCHours()}h`;

const bestSlot = (
  posts: PostSample[],
  keyOf: (post: PostSample) => string
): Slot | null => {
  const groups = new Map<string, number[]>();
  for (const post of posts) {
    const key = keyOf(post);
    groups.set(key, [...(groups.get(key) ?? []), post.numberOfComments]);
  }

  let best: Slot | null = null;
  for (const [label, comments] of groups) {
    if (comments.length < MIN_POSTS_PER_SLOT) continue;
    const avgComments = average(comments);
    if (best === null || avgComments > best.avgComments) {
      best = { label, avgComments };
    }
  }
  return best;
};

export function computeStats(input: {
  posts: PostSample[];
  now: Date;
  truncated: boolean;
}): Stats {
  const { posts, now, truncated } = input;
  const nowMs = now.getTime();

  // When the read hit its limit, the oldest post read bounds the window.
  let windowStartMs = nowMs - WINDOW_DAYS * DAY_MS;
  if (truncated && posts.length > 0) {
    const oldestMs = Math.min(...posts.map((post) => post.createdAt.getTime()));
    windowStartMs = Math.max(windowStartMs, oldestMs);
  }
  const windowDays = Math.max(1, (nowMs - windowStartMs) / DAY_MS);
  const inWindow = posts.filter(
    (post) => post.createdAt.getTime() >= windowStartMs
  );

  const delays: number[] = [];
  let sampled = 0;
  for (const post of inWindow) {
    if (post.comments === null) continue;
    sampled += 1;
    const replyTimes = post.comments
      .filter((comment) => comment.authorName !== post.authorName)
      .map((comment) => comment.createdAt.getTime());
    if (replyTimes.length === 0) continue;
    const firstReplyMs = Math.min(...replyTimes);
    delays.push(Math.max(0, (firstReplyMs - post.createdAt.getTime()) / 60000));
  }

  const weekStartMs = nowMs - 7 * DAY_MS;
  const authors = new Set<string>();
  for (const post of inWindow) {
    if (post.createdAt.getTime() >= weekStartMs) authors.add(post.authorName);
    for (const comment of post.comments ?? []) {
      if (comment.createdAt.getTime() >= weekStartMs) {
        authors.add(comment.authorName);
      }
    }
  }
  authors.delete(DELETED_AUTHOR);

  return {
    windowDays,
    postCount: inWindow.length,
    postsPerWeek: inWindow.length / (windowDays / 7),
    avgComments: average(inWindow.map((post) => post.numberOfComments)),
    avgScore: average(inWindow.map((post) => post.score)),
    withoutComments: inWindow.filter((post) => post.numberOfComments === 0)
      .length,
    bestDay: bestSlot(inWindow, weekdayOf),
    bestHour: bestSlot(inWindow, hourOf),
    firstReply: {
      medianMinutes: median(delays),
      answered: delays.length,
      sampled,
    },
    authorsLast7Days: authors.size,
  };
}

const decimal = (value: number) => value.toFixed(1).replace('.', ',');

const formatMinutes = (minutes: number) => {
  const total = Math.round(minutes);
  if (total < 60) return `${total} min`;
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
};

const formatSlot = (slot: Slot | null) =>
  slot === null
    ? 'sem dados suficientes'
    : `${slot.label} (${decimal(slot.avgComments)} comentarios por post)`;

export function formatReport(input: {
  subredditName: string;
  members: number | null;
  stats: Stats;
}): string {
  const { subredditName, members, stats } = input;
  const days = Math.round(stats.windowDays);
  const lines = [
    `r/${subredditName} - ultimos ${days} dias`,
    `Membros hoje: ${members ?? 'indisponivel'}`,
    '',
  ];

  if (stats.postCount === 0) {
    lines.push('Nenhum post nesse periodo.');
    return lines.join('\n');
  }

  const share = Math.round((stats.withoutComments / stats.postCount) * 100);
  const firstReplyText =
    stats.firstReply.medianMinutes === null
      ? 'nenhuma resposta nos posts lidos'
      : `mediana de ${formatMinutes(stats.firstReply.medianMinutes)}`;

  lines.push(
    `POSTS (${stats.postCount} lidos)`,
    `Posts por semana: ${decimal(stats.postsPerWeek)}`,
    `Comentarios por post (media): ${decimal(stats.avgComments)}`,
    `Pontos por post (media): ${decimal(stats.avgScore)}`,
    `Posts sem comentario: ${stats.withoutComments} (${share}%)`,
    '',
    'QUANDO RENDE (horario de Brasilia)',
    `Melhor dia: ${formatSlot(stats.bestDay)}`,
    `Melhor horario: ${formatSlot(stats.bestHour)}`,
    '',
    'PARTICIPACAO (posts mais recentes)',
    `Primeira resposta: ${firstReplyText}`,
    `Posts com resposta: ${stats.firstReply.answered} de ${stats.firstReply.sampled}`,
    `Autores diferentes nos ultimos 7 dias: ${stats.authorsLast7Days}`
  );
  return lines.join('\n');
}
