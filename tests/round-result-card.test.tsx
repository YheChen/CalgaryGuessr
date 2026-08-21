/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RoundResultCard } from "@/components/round-result-card";

const GUESS = { lat: 51.045, lng: -114.062 };

function renderCard(props: Partial<Parameters<typeof RoundResultCard>[0]> = {}) {
  const onNextRound = vi.fn();
  render(
    <RoundResultCard
      guessLocation={GUESS}
      score={3200}
      distance={0.82}
      onNextRound={onNextRound}
      isLastRound={false}
      roundNumber={2}
      totalRounds={5}
      {...props}
    />,
  );
  return { onNextRound };
}

describe("RoundResultCard, timed-out round", () => {
  // The regression this suite exists for: the card used to assert the guess was
  // non-null and render formatDistance(0), so a round nobody guessed showed
  // "0.00 km" next to a zero score. That reads as a pixel-perfect guess that
  // somehow scored nothing.
  const timedOut = { guessLocation: null, score: 0, distance: null };

  it("says the distance is absent rather than zero", () => {
    renderCard(timedOut);
    expect(screen.getByText("No guess")).toBeDefined();
    expect(screen.queryByText("0.00 km")).toBeNull();
    expect(screen.queryByText("0 m")).toBeNull();
  });

  it("shows the out-of-time verdict", () => {
    renderCard(timedOut);
    expect(screen.getByText("Out of time")).toBeDefined();
  });

  it("explains what happened instead of showing a two-pin legend", () => {
    renderCard(timedOut);
    expect(screen.getByText(/timer ran out/i)).toBeDefined();
    // No pin was placed, so there is no "your guess" swatch to explain.
    expect(screen.queryByText("Your guess")).toBeNull();
  });
});

describe("RoundResultCard, scored round", () => {
  it("formats the distance and repeats the score as a figure", () => {
    renderCard({ score: 3200, distance: 0.82 });
    expect(screen.getByText("820 m")).toBeDefined();
    expect(screen.getByText("3,200")).toBeDefined();
  });

  it("shows the legend for the two pins on the map", () => {
    renderCard();
    expect(screen.getByText("Your guess")).toBeDefined();
    expect(screen.getByText("Actual location")).toBeDefined();
    expect(screen.queryByText(/timer ran out/i)).toBeNull();
  });

  it("names the round it is reporting on", () => {
    renderCard({ roundNumber: 3, totalRounds: 5 });
    expect(screen.getByText("Round 3 of 5")).toBeDefined();
  });

  it.each([
    [5000, "Bang on!"],
    [4000, "Bang on!"],
    [3999, "Great guess"],
    [2500, "Great guess"],
    [2499, "Not bad"],
    [1000, "Not bad"],
    [999, "Keep exploring"],
    [1, "Keep exploring"],
  ])("scores %i as %s", (score, verdict) => {
    renderCard({ score, distance: 1 });
    expect(screen.getByText(verdict)).toBeDefined();
  });

  it("treats a scored zero as a bad guess, not a timeout", () => {
    // Distinct from the timed-out case above: a pin WAS placed, it was just
    // hopeless. The verdict and the copy must not claim the timer expired.
    renderCard({ score: 0, distance: 240, guessLocation: GUESS });
    expect(screen.getByText("Keep exploring")).toBeDefined();
    expect(screen.queryByText("Out of time")).toBeNull();
    expect(screen.getByText("240.00 km")).toBeDefined();
  });
});

describe("RoundResultCard, advancing", () => {
  it("offers the next round mid-game", () => {
    renderCard({ isLastRound: false });
    expect(screen.getByRole("button", { name: /next round/i })).toBeDefined();
  });

  it("offers the final results on the last round", () => {
    renderCard({ isLastRound: true });
    expect(
      screen.getByRole("button", { name: /see final results/i }),
    ).toBeDefined();
    expect(screen.queryByRole("button", { name: /next round/i })).toBeNull();
  });

  it("calls back when advanced", async () => {
    const user = userEvent.setup();
    const { onNextRound } = renderCard();
    await user.click(screen.getByRole("button", { name: /next round/i }));
    expect(onNextRound).toHaveBeenCalledTimes(1);
  });
});
