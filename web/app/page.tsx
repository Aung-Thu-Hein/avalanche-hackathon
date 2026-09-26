import { Navbar } from "@/components/Navbar";
import { HomeExperience } from "@/components/HomeExperience";
import { allTokens, toPublic, FREE_TOKEN_IDS } from "@/lib/tokens";

// Scores and "days until" depend on today's date - render per request.
export const dynamic = "force-dynamic";

export default function Home() {
  const tokens = allTokens();

  // Only free tokens are passed with full data: props are serialised into the
  // page HTML, so anything locked must go through toPublic() first.
  const free = tokens.filter((t) => FREE_TOKEN_IDS.includes(t.id));
  const story = ["avalanche-2", "gunz", "doublezero"]
    .map((id) => free.find((t) => t.id === id))
    .filter((t): t is NonNullable<typeof t> => Boolean(t))
    .sort((a, b) => b.verdict.score - a.verdict.score);

  const bySoonest = [...tokens].sort(
    (a, b) => (a.nextUnlock?.daysUntil ?? 9999) - (b.nextUnlock?.daysUntil ?? 9999),
  );
  const preview = bySoonest.slice(0, 8).map((t) => toPublic(t, false));
  const freeCount = tokens.filter((t) => FREE_TOKEN_IDS.includes(t.id)).length;

  return (
    <>
      <Navbar variant="home" />
      <HomeExperience story={story} preview={preview} total={tokens.length} freeCount={freeCount} />
    </>
  );
}
