import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { syntheticCall, syntheticLlmReview } from "@/data/fixtures/synthetic";
import { toCallView } from "@/lib/callView";
import { STORAGE_KEY } from "@/lib/decisions";
import { buildReview } from "@/lib/review";
import type { ReviewResponse } from "@/types/review";
import { ReviewWorkspace } from "./ReviewWorkspace";

const view = toCallView(syntheticCall);
const okResponse: ReviewResponse = {
  ok: true,
  review: buildReview(syntheticLlmReview, syntheticCall, "test-model"),
};

describe("ReviewWorkspace", () => {
  it("renders the transcript–summary pair and automatic checks before any AI call", () => {
    const reviewFn = vi.fn();
    render(<ReviewWorkspace calls={[view]} reviewFn={reviewFn} />);
    expect(
      screen.getByRole("heading", { name: "SYN-001" }),
    ).toBeInTheDocument();
    expect(document.querySelector("blockquote")).toHaveTextContent(
      syntheticCall.summary,
    );
    const transcript = screen.getByRole("list", { name: "Transcript turns" });
    expect(within(transcript).getAllByRole("listitem")).toHaveLength(10);
    expect(
      within(transcript).getByText(/Likely hold\/transcription artefact/),
    ).toBeInTheDocument();
    expect(screen.getByText("Automatic rule checks (1)")).toBeInTheDocument();
    expect(reviewFn).not.toHaveBeenCalled();
  });

  it("runs the AI review and shows verdicts with text labels and evidence", async () => {
    const user = userEvent.setup();
    let resolve: (r: ReviewResponse) => void = () => {};
    const reviewFn = vi.fn(
      () => new Promise<ReviewResponse>((r) => (resolve = r)),
    );
    render(<ReviewWorkspace calls={[view]} reviewFn={reviewFn} />);

    await user.click(screen.getByRole("button", { name: "Run AI review" }));
    expect(screen.getByText(/Reviewing the summary/)).toBeInTheDocument();
    expect(reviewFn).toHaveBeenCalledWith("SYN-001");

    resolve(okResponse);
    expect(await screen.findByTestId("overall")).toHaveTextContent(
      "Issues found",
    );
    expect(screen.getAllByText("Contradicted")).toHaveLength(2);
    expect(screen.getByText("Uncertain")).toBeInTheDocument();

    // Evidence chip highlights and focuses the cited turn.
    const chips = screen.getAllByRole("button", {
      name: "Show turn T01 in transcript",
    });
    await user.click(chips[0]);
    const turn = document.getElementById("turn-T01");
    expect(turn).toHaveClass("ring-yellow-500");
    expect(turn).toHaveFocus();
  });

  it("shows an error state with retry when the review fails", async () => {
    const user = userEvent.setup();
    const reviewFn = vi
      .fn<(id: string) => Promise<ReviewResponse>>()
      .mockResolvedValueOnce({
        ok: false,
        error: { code: "timeout", message: "The AI review timed out." },
      })
      .mockResolvedValueOnce(okResponse);
    render(<ReviewWorkspace calls={[view]} reviewFn={reviewFn} />);

    await user.click(screen.getByRole("button", { name: "Run AI review" }));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("The AI review timed out.");

    await user.click(within(alert).getByRole("button", { name: "Try again" }));
    expect(await screen.findByTestId("overall")).toBeInTheDocument();
  });

  it("records the reviewer's decision and persists it", async () => {
    const user = userEvent.setup();
    render(<ReviewWorkspace calls={[view]} reviewFn={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Save decision" }));
    expect(screen.getByRole("alert")).toHaveTextContent(/Choose a decision/);

    await user.click(screen.getByRole("radio", { name: "Needs correction" }));
    await user.type(
      screen.getByLabelText("Notes (optional)"),
      "Promise amount wrong",
    );
    await user.click(screen.getByRole("button", { name: "Save decision" }));

    const form = screen.getByRole("form", { name: "Your decision" });
    expect(within(form).getByRole("status")).toHaveTextContent(
      "Saved: Needs correction.",
    );
    const nav = screen.getByRole("navigation", { name: "Calls" });
    expect(nav).toHaveTextContent("Needs correction");
    expect(nav).toHaveTextContent("1 of 1 decided");

    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}");
    expect(stored["SYN-001"]).toMatchObject({
      decision: "needs-correction",
      note: "Promise amount wrong",
    });
  });

  it("shows an empty state when there are no calls", () => {
    render(<ReviewWorkspace calls={[]} reviewFn={vi.fn()} />);
    expect(screen.getByText(/No calls to review/)).toBeInTheDocument();
  });
});
