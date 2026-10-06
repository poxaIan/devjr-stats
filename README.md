# devjr-stats

A moderator tool that shows engagement numbers for a community, right inside Reddit.

It was built for r/devjr, a Portuguese-speaking community for junior developers, and works on any subreddit where it is installed. The text inside the app is in Portuguese (without accents).

## What it does

It adds one item, **Estatisticas** ("Statistics"), to the subreddit menu. The item is visible only to moderators. Clicking it opens a window with these numbers:

| Number | What it tells you |
| --- | --- |
| Members today | Current subscriber count |
| Posts per week | How active the community is |
| Comments per post (average) | How much conversation each post gets |
| Points per post (average) | How well posts are received |
| Posts without comments | How many posts nobody answered, and their share |
| Best day and best hour | When posts get the most comments (Brasilia time, UTC-3) |
| First reply | The median time until someone other than the author replies, and how many posts got a reply |
| Different authors in the last 7 days | How many people posted or commented |

The window is read-only: it only shows the numbers.

## How to use

1. Install the app on a subreddit you moderate.
2. Open the subreddit page and click the three dots (...) next to **Mod Tools**.
3. Click **Estatisticas** and wait a few seconds.
4. Read the numbers and click **Fechar** (close).

## Data and privacy

- It uses only these fields of the posts and comments of the subreddit where it is installed: author name, date, points, number of comments and whether the item was removed. It does not use the text of posts or comments.
- It does not read private messages, the mod queue, the mod log or any other subreddit.
- It does not store anything and does not send data outside Reddit.
- It does not post, comment, vote, remove, lock or change any setting. The code only reads.

## Limits

- It looks at the newest 100 posts, within the last 28 days.
- The reply time and the authors in comments come from the 30 newest posts, and only from top-level comments (replies to comments are not counted).
- Best day and best hour need at least two posts in the same slot, otherwise they show "sem dados suficientes" (not enough data).
- Visits and page views over time are not included. They are in Reddit's own Insights.

## Development

Requires Node 24 or newer.

- `npm install`: installs the dependencies
- `npm run dev`: runs the app in the test subreddit set in `devvit.json`, reloading on every change
- `npm run test:unit`: runs the tests of the calculation
- `npm run deploy`: checks types and lint, then uploads a new version to Reddit
- `npm run launch`: deploys and submits the app for review

The calculation lives in `src/core/stats.ts` and does not know Reddit. Reading from Reddit is in `src/core/read-subreddit.ts`, and the menu is in `src/routes/menu.ts`.
