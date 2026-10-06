import { Hono } from 'hono';
import type { UiResponse } from '@devvit/web/shared';

export const forms = new Hono();

// The stats form only shows numbers; "Fechar" has nothing to save.
forms.post('/stats-close', (c) => c.json<UiResponse>({}, 200));
