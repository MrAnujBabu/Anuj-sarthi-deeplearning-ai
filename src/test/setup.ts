import "@testing-library/jest-dom/vitest";
import { beforeEach } from "vitest";
import { setSarvamAvailable } from "@/lib/sarvam-status";

// Speech tests assume Sarvam is connected unless a test says otherwise.
beforeEach(() => setSarvamAvailable(true));

if (typeof window !== 'undefined') {
Object.defineProperty(window, "scrollTo", {
  writable: true,
  value: () => {},
});

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});
}
