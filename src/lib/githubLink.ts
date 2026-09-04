// GitHub's blob viewer accepts "HEAD" as the ref, resolving to whatever the
// repo's actual default branch is (main/master/etc.) — avoids guessing wrong
// and linking to a 404. Only built for github.com source URLs; other git
// hosts (or a URL ECDAT doesn't recognize) just get no link, not a
// guessed-wrong one. Shared by Migration Planner and the Evidence feed.
export function githubBlobUrl(repoUrl: string | undefined | null, filePath: string | undefined | null, lineNumber: number | undefined | null): string | null {
  if (!repoUrl || !filePath) return null;
  const match = repoUrl.match(/^https?:\/\/github\.com\/([^\/]+)\/([^\/]+?)(\.git)?\/?$/);
  if (!match) return null;
  const [, owner, repo] = match;
  return `https://github.com/${owner}/${repo}/blob/HEAD/${filePath}${lineNumber ? `#L${lineNumber}` : ""}`;
}
