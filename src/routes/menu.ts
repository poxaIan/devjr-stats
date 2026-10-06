import { Hono } from 'hono';
import type { MenuItemRequest, UiResponse } from '@devvit/web/shared';
import { context } from '@devvit/web/server';
import { readSubreddit } from '../core/read-subreddit';
import { computeStats, formatReport } from '../core/stats';

export const menu = new Hono();

menu.post('/stats', async (c) => {
  await c.req.json<MenuItemRequest>();

  try {
    const reading = await readSubreddit(context.subredditName);
    const stats = computeStats({
      posts: reading.posts,
      now: new Date(),
      truncated: reading.truncated,
    });
    const report = formatReport({
      subredditName: context.subredditName,
      members: reading.members,
      stats,
    });

    return c.json<UiResponse>(
      {
        showForm: {
          name: 'stats',
          form: {
            title: 'Estatisticas',
            acceptLabel: 'Fechar',
            cancelLabel: 'Cancelar',
            fields: [
              {
                name: 'report',
                label: 'Resultado',
                type: 'paragraph',
                defaultValue: report,
                disabled: true,
                lineHeight: report.split('\n').length,
              },
            ],
          },
        },
      },
      200
    );
  } catch (err: unknown) {
    console.error(err);
    return c.json<UiResponse>(
      { showToast: 'Nao consegui ler os posts. Tente de novo.' },
      200
    );
  }
});
