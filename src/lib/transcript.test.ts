import { describe, expect, it } from "vitest";
import {
  isTranscriptEmpty,
  parseTranscript,
  quoteAppearsInTurn,
} from "./transcript";

const SAMPLE = [
  "T01 [00:00] Agent: Good morning, vehicle finance collections.",
  "T02 [00:06] Customer: Hi, it's about the letter.",
  "T03 [02:14] Transcript note: Hold music begins.",
  "T04 [02:18] Agent: This is Advantage Finance. I'm your agent.",
  "T05 [02:24] Transcript note: Hold music ends.",
  "T06 [02:27] Unclear speaker: Thank you for watching.",
  "T07 [02:30] Customer: I've got no money for food just now.",
].join("\n");

describe("parseTranscript", () => {
  it("parses id, time, speaker, text and kind", () => {
    const turns = parseTranscript(SAMPLE);
    expect(turns).toHaveLength(7);
    expect(turns[0]).toMatchObject({
      id: "T01",
      time: "00:00",
      speaker: "Agent",
      text: "Good morning, vehicle finance collections.",
      kind: "speech",
    });
    expect(turns[2].kind).toBe("note");
    expect(turns[5].kind).toBe("unclear");
  });

  it("flags turns inside a hold block and unclear speakers as suspected artefacts", () => {
    const flagged = parseTranscript(SAMPLE)
      .filter((t) => t.suspectedArtefact)
      .map((t) => t.id);
    expect(flagged).toEqual(["T04", "T06"]);
  });

  it("appends wrapped lines to the previous turn", () => {
    const turns = parseTranscript("T01 [00:00] Agent: Hello\nthere");
    expect(turns[0].text).toBe("Hello there");
  });

  it("returns no turns for an empty transcript", () => {
    expect(parseTranscript("")).toEqual([]);
    expect(isTranscriptEmpty(parseTranscript(""))).toBe(true);
    expect(isTranscriptEmpty(parseTranscript("   \n  "))).toBe(true);
  });

  it("treats a transcript of only notes as empty", () => {
    expect(
      isTranscriptEmpty(
        parseTranscript("T01 [00:00] Transcript note: Silence."),
      ),
    ).toBe(true);
  });
});

describe("quoteAppearsInTurn", () => {
  const turn = parseTranscript(SAMPLE)[6];
  it("matches ignoring case, punctuation and curly quotes", () => {
    expect(quoteAppearsInTurn("I’ve got NO money for food", turn)).toBe(true);
  });
  it("supports ellipsis-separated fragments", () => {
    expect(quoteAppearsInTurn("I've got... for food", turn)).toBe(true);
  });
  it("rejects fabricated quotes", () => {
    expect(quoteAppearsInTurn("I have plenty of money", turn)).toBe(false);
    expect(quoteAppearsInTurn("", turn)).toBe(false);
  });
});
