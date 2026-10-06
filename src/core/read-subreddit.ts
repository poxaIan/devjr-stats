import { reddit } from '@devvit/web/server';
import type { Post } from '@devvit/web/server';
import type { CommentSample, PostSample } from './stats';

// Comments cost one request per post, so only the newest posts get them read.
const POST_LIMIT = 100;
const COMMENT_SAMPLE_SIZE = 30;

export type SubredditReading = {
  members: number | null;
  posts: PostSample[];
  truncated: boolean;
};

const readComments = async (post: Post): Promise<CommentSample[]> => {
  const comments = await post.comments.all();
  return comments
    .filter((comment) => !comment.removed)
    .map((comment) => ({
      authorName: comment.authorName,
      createdAt: comment.createdAt,
    }));
};

export async function readSubreddit(
  subredditName: string
): Promise<SubredditReading> {
  const [info, posts] = await Promise.all([
    reddit.getSubredditInfoByName(subredditName),
    reddit.getNewPosts({ subredditName, limit: POST_LIMIT }).all(),
  ]);

  const visible = posts.filter((post) => !post.removed);
  const samples = await Promise.all(
    visible.map(async (post, index): Promise<PostSample> => {
      const comments =
        index < COMMENT_SAMPLE_SIZE ? await readComments(post) : null;
      return {
        authorName: post.authorName,
        createdAt: post.createdAt,
        score: post.score,
        numberOfComments: post.numberOfComments,
        comments,
      };
    })
  );

  return {
    members: info.subscribersCount ?? null,
    posts: samples,
    truncated: posts.length >= POST_LIMIT,
  };
}
