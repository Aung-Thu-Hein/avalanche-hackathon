import { Navbar } from "@/components/Navbar";
import { HomeExperience } from "@/components/HomeExperience";
import { allTokens, toPublic, isFreeSymbol, coverage } from "@/lib/tokens";

// Scores and "days until" depend on today's date - render per request.
export const dynamic = "force-dynamic";

export default function Home() {
  const tokens = allTokens();

  // Only free tokens are passed with full data: props are serialised into the
  // page HTML, so anything locked must go through toPublic() first.
  // The free tokens walk the whole score range, safest to riskiest.
  const story = tokens.filter((t) => isFreeSymbol(t.symbol)).sort((a, b) => b.verdict.score - a.verdict.score);

  const bySoonest = [...tokens].sort(
    (a, b) => (a.nextUnlock?.daysUntil ?? 9999) - (b.nextUnlock?.daysUntil ?? 9999),
  );
  const preview = bySoonest.slice(0, 8).map((t) => toPublic(t, false));

  return (
    <>
      <Navbar variant="home" />
      <HomeExperience story={story} preview={preview} total={tokens.length} freeCount={coverage.freeCount} />
    </>
  );
}
