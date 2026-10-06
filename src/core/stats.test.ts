import assert from 'node:assert/strict';
import { test } from 'node:test';
import { computeStats, formatReport } from './stats.ts';
import type { PostSample } from './stats.ts';

// Monday, 12 Oct 2026, 09:00 in Brasilia
const NOW = new Date('2026-10-12T12:00:00Z');
const DAY_MS = 24 * 60 * 60 * 1000;

const daysAgo = (days: number) => new Date(NOW.getTime() - days * DAY_MS);
const minutesAfter = (date: Date, minutes: number) =>
  new Date(date.getTime() + minutes * 60000);

const post = (overrides: Partial<PostSample> = {}): PostSample => ({
  authorName: 'author',
  createdAt: daysAgo(1),
  score: 1,
  numberOfComments: 0,
  comments: null,
  ...overrides,
});

test('averages and posts per week cover only the 28-day window', () => {
  const stats = computeStats({
    posts: [
      post({ createdAt: daysAgo(1), score: 2, numberOfComments: 4 }),
      post({ createdAt: daysAgo(3), score: 4, numberOfComments: 0 }),
      post({ createdAt: daysAgo(40), score: 100, numberOfComments: 100 }),
    ],
    now: NOW,
    truncated: false,
  });

  assert.equal(stats.postCount, 2);
  assert.equal(stats.postsPerWeek, 0.5);
  assert.equal(stats.avgComments, 2);
  assert.equal(stats.avgScore, 3);
  assert.equal(stats.withoutComments, 1);
});

test('a truncated read shortens the window to the oldest post read', () => {
  const stats = computeStats({
    posts: [post({ createdAt: daysAgo(1) }), post({ createdAt: daysAgo(7) })],
    now: NOW,
    truncated: true,
  });

  assert.equal(stats.windowDays, 7);
  assert.equal(stats.postsPerWeek, 2);
});

test('first reply ignores the author and uses the median', () => {
  const start = daysAgo(1);
  const replied = (minutes: number) =>
    post({
      createdAt: start,
      numberOfComments: 2,
      comments: [
        { authorName: 'author', createdAt: minutesAfter(start, 1) },
        { authorName: 'someone', createdAt: minutesAfter(start, minutes) },
      ],
    });

  const stats = computeStats({
    posts: [replied(10), replied(30), replied(50), post({ comments: [] })],
    now: NOW,
    truncated: false,
  });

  assert.equal(stats.firstReply.medianMinutes, 30);
  assert.equal(stats.firstReply.answered, 3);
  assert.equal(stats.firstReply.sampled, 4);
});

test('best day and hour use Brasilia time and need two posts per slot', () => {
  // Monday 21:30 and 21:45 in Brasilia, and one Tuesday 12:00 post
  const stats = computeStats({
    posts: [
      post({
        createdAt: new Date(Date.UTC(2026, 9, 6, 0, 30)),
        numberOfComments: 4,
      }),
      post({
        createdAt: new Date(Date.UTC(2026, 9, 6, 0, 45)),
        numberOfComments: 6,
      }),
      post({
        createdAt: new Date(Date.UTC(2026, 9, 6, 15, 0)),
        numberOfComments: 20,
      }),
    ],
    now: NOW,
    truncated: false,
  });

  assert.deepEqual(stats.bestDay, { label: 'segunda', avgComments: 5 });
  assert.deepEqual(stats.bestHour, { label: '21h', avgComments: 5 });
});

test('authors in the last 7 days count each person once', () => {
  const stats = computeStats({
    posts: [
      post({
        authorName: 'a',
        createdAt: daysAgo(1),
        comments: [
          { authorName: 'b', createdAt: daysAgo(1) },
          { authorName: 'a', createdAt: daysAgo(1) },
          { authorName: '[deleted]', createdAt: daysAgo(1) },
        ],
      }),
      post({
        authorName: 'c',
        createdAt: daysAgo(10),
        comments: [{ authorName: 'd', createdAt: daysAgo(10) }],
      }),
    ],
    now: NOW,
    truncated: false,
  });

  assert.equal(stats.authorsLast7Days, 2);
});

test('the report says so when there are no posts', () => {
  const stats = computeStats({ posts: [], now: NOW, truncated: false });
  const report = formatReport({ subredditName: 'devjr', members: null, stats });

  assert.ok(report.includes('Nenhum post'));
  assert.ok(report.includes('indisponivel'));
});
