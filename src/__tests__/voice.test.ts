import { requestMicPermission } from "../lib/voice/stt";
import { speakText, stopSpeaking, isSpeaking } from "../lib/voice/tts";
import { Audio } from "expo-av";
import * as Speech from "expo-speech";

describe("stt", () => {
  beforeEach(() => jest.clearAllMocks());

  describe("requestMicPermission", () => {
    it("returns true when permission granted", async () => {
      (Audio.requestPermissionsAsync as jest.Mock).mockResolvedValueOnce({
        status: "granted",
      });
      expect(await requestMicPermission()).toBe(true);
    });

    it("returns false when permission denied", async () => {
      (Audio.requestPermissionsAsync as jest.Mock).mockResolvedValueOnce({
        status: "denied",
      });
      expect(await requestMicPermission()).toBe(false);
    });
  });
});

describe("tts", () => {
  beforeEach(() => jest.clearAllMocks());

  describe("speakText", () => {
    it("falls back to native speech when edge function fails", async () => {
      // The createClient mock returns error by default
      await speakText("Hello there");
      expect(Speech.speak).toHaveBeenCalled();
    });

    it("trims text longer than 300 chars", async () => {
      const longText = "a".repeat(400);
      await speakText(longText);
      const calledWith = (Speech.speak as jest.Mock).mock.calls[0][0];
      expect(calledWith.length).toBeLessThanOrEqual(300);
      expect(calledWith).toContain("...");
    });

    it("does not trim text under 300 chars", async () => {
      const text = "Short text";
      await speakText(text);
      const calledWith = (Speech.speak as jest.Mock).mock.calls[0][0];
      expect(calledWith).toBe(text);
    });
  });

  describe("stopSpeaking", () => {
    it("calls Speech.stop", async () => {
      await stopSpeaking();
      expect(Speech.stop).toHaveBeenCalled();
    });
  });

  describe("isSpeaking", () => {
    it("returns false initially", () => {
      expect(isSpeaking()).toBe(false);
    });
  });
});
