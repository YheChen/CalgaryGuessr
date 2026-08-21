import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

/**
 * Shared test setup, applied to every suite.
 *
 * Most suites run in the node environment and have no DOM, so everything that
 * touches one is guarded.
 */

afterEach(() => {
  // With `globals: false` this is not automatic. Without it, React trees from
  // earlier tests stay in the document and queries match stale nodes, which
  // shows up as tests that pass alone and fail in a suite.
  if (typeof document !== "undefined") {
    cleanup();
    try {
      window.localStorage.clear();
    } catch {
      // A suite may have deliberately broken storage to test that path.
    }
  }
});

if (typeof document !== "undefined") {
  // jsdom implements none of these, and Radix primitives call them while
  // positioning a popover or restoring focus. Missing them surfaces as an
  // opaque "not a function" inside a component that works fine in a browser.
  if (!("ResizeObserver" in globalThis)) {
    (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      };
  }

  if (!("IntersectionObserver" in globalThis)) {
    // Reveal observes its own node. A stub that never fires would leave every
    // revealed subtree at opacity 0; firing immediately matches what a browser
    // does for content already in view, which is the case under test.
    (globalThis as unknown as { IntersectionObserver: unknown })
      .IntersectionObserver = class {
      constructor(private cb: (entries: unknown[]) => void) {}
      observe() {
        this.cb([{ isIntersecting: true }]);
      }
      unobserve() {}
      disconnect() {}
    };
  }

  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => undefined;
  }

  // window.localStorage sometimes arrives in this environment without Storage's
  // methods at all: getItem undefined, and any call throwing "not a function".
  // It is environment dependent rather than version dependent, so it can pass
  // on one machine and fail in CI with the same lockfile.
  //
  // The consequence that matters: do NOT vi.spyOn a localStorage method. The spy
  // binds to whichever implementation the machine happens to have. Replace the
  // whole object instead, as below.
  const needsStorage =
    typeof window.localStorage !== "object" ||
    window.localStorage === null ||
    typeof (window.localStorage as Partial<Storage>).getItem !== "function";

  if (needsStorage) {
    const entries = new Map<string, string>();
    const storage: Storage = {
      get length() {
        return entries.size;
      },
      key: (index: number) => [...entries.keys()][index] ?? null,
      getItem: (key: string) => entries.get(String(key)) ?? null,
      setItem: (key: string, value: string) => {
        entries.set(String(key), String(value));
      },
      removeItem: (key: string) => {
        entries.delete(String(key));
      },
      clear: () => {
        entries.clear();
      },
    };
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: storage,
    });
    Object.defineProperty(window, "sessionStorage", {
      configurable: true,
      value: storage,
    });
  }

  if (!window.matchMedia) {
    // CountUp asks for prefers-reduced-motion on every mount.
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    })) as typeof window.matchMedia;
  }
}
