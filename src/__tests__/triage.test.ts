import { triageTranscript, RED_DISCLAIMER } from "../lib/ai/triage";

describe("triageTranscript", () => {
  // ---- Red zone: immediate stop ----

  it("detects 'sharp pain' as red", () => {
    expect(triageTranscript("I have a sharp pain in my knee")).toBe("red");
  });

  it("detects 'chest pain' as red", () => {
    expect(triageTranscript("I'm getting chest pain")).toBe("red");
  });

  it("detects 'dizzy' as red", () => {
    expect(triageTranscript("I feel really dizzy")).toBe("red");
  });

  it("detects 'can't breathe' as red", () => {
    expect(triageTranscript("I can't breathe properly")).toBe("red");
  });

  it("detects 'nauseous' as red", () => {
    expect(triageTranscript("I'm feeling nauseous")).toBe("red");
  });

  it("detects 'numbness' as red", () => {
    expect(triageTranscript("There's numbness in my arm")).toBe("red");
  });

  it("detects 'tingling' as red", () => {
    expect(triageTranscript("I have tingling in my fingers")).toBe("red");
  });

  it("detects 'shooting pain' as red", () => {
    expect(triageTranscript("shooting pain down my leg")).toBe("red");
  });

  it("detects 'blacking out' as red", () => {
    expect(triageTranscript("I feel like I'm blacking out")).toBe("red");
  });

  it("detects 'can't move' as red", () => {
    expect(triageTranscript("I can't move my shoulder")).toBe("red");
  });

  // ---- Yellow zone: modify ----

  it("detects 'hurts' as yellow", () => {
    expect(triageTranscript("My back hurts a bit")).toBe("yellow");
  });

  it("detects 'sore' as yellow", () => {
    expect(triageTranscript("I'm pretty sore today")).toBe("yellow");
  });

  it("detects 'uncomfortable' as yellow", () => {
    expect(triageTranscript("This feels uncomfortable")).toBe("yellow");
  });

  it("detects 'tight' as yellow", () => {
    expect(triageTranscript("My hamstrings are tight")).toBe("yellow");
  });

  it("detects 'too hard' as yellow", () => {
    expect(triageTranscript("This is too hard for me")).toBe("yellow");
  });

  it("detects 'modify' as yellow", () => {
    expect(triageTranscript("Can you modify this exercise")).toBe("yellow");
  });

  it("detects 'easier' as yellow", () => {
    expect(triageTranscript("Something easier please")).toBe("yellow");
  });

  it("detects 'can't do this' as yellow", () => {
    expect(triageTranscript("I can't do this")).toBe("yellow");
  });

  // ---- Green zone: continue / push harder ----

  it("detects 'feeling good' as green", () => {
    expect(triageTranscript("I'm feeling good")).toBe("green");
  });

  it("detects 'too easy' as green", () => {
    expect(triageTranscript("This is too easy")).toBe("green");
  });

  it("detects 'harder' as green", () => {
    expect(triageTranscript("Make it harder")).toBe("green");
  });

  it("detects 'great' as green", () => {
    expect(triageTranscript("That felt great")).toBe("green");
  });

  // ---- Priority: red > yellow > green ----

  it("prioritizes red over yellow keywords", () => {
    expect(
      triageTranscript("My back hurts and I have sharp pain")
    ).toBe("red");
  });

  it("prioritizes red over green keywords", () => {
    expect(
      triageTranscript("Feeling good but now I'm dizzy")
    ).toBe("red");
  });

  it("prioritizes yellow over green keywords", () => {
    expect(
      triageTranscript("Feeling good but my knee hurts")
    ).toBe("yellow");
  });

  // ---- Defaults ----

  it("defaults to green for neutral speech", () => {
    expect(triageTranscript("Okay ready for the next one")).toBe("green");
  });

  it("defaults to green for empty string", () => {
    expect(triageTranscript("")).toBe("green");
  });

  // ---- Case insensitivity ----

  it("is case-insensitive", () => {
    expect(triageTranscript("I HAVE SHARP PAIN")).toBe("red");
    expect(triageTranscript("My Back HURTS")).toBe("yellow");
    expect(triageTranscript("FEELING GOOD")).toBe("green");
  });
});

describe("RED_DISCLAIMER", () => {
  it("is a non-empty string", () => {
    expect(typeof RED_DISCLAIMER).toBe("string");
    expect(RED_DISCLAIMER.length).toBeGreaterThan(0);
  });

  it("mentions stopping the workout", () => {
    expect(RED_DISCLAIMER.toLowerCase()).toContain("stop");
  });

  it("mentions consulting a healthcare professional", () => {
    expect(RED_DISCLAIMER.toLowerCase()).toContain("healthcare professional");
  });

  it("includes a not-medical-advice disclaimer", () => {
    expect(RED_DISCLAIMER.toLowerCase()).toContain("not medical advice");
  });
});
