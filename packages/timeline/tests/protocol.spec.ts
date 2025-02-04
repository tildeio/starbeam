import type { CompositeInternals } from "@starbeam/timeline";
import {
  REACTIVE,
  ReactiveProtocol,
  TIMELINE,
  Timestamp,
} from "@starbeam/timeline";
import { beforeAll, describe, expect, it } from "vitest";

import { Cell, FreezableCell, Static } from "./support/mini-reactives.js";

describe("ReactiveProtocol", () => {
  beforeAll(() => {
    // make sure the timeline is not at 0, which would make a comparison with TIMELINE.now sometimes
    // equivalent to Timestamp.zero(), and we want to test the difference.
    TIMELINE.bump({ type: "mutable", lastUpdated: Timestamp.zero() });
  });
  describe("Static", () => {
    it("has the zero timestamp for lastUpdated", () => {
      const tom = Static("Tom Dale");

      expect(String(ReactiveProtocol.lastUpdated(tom))).toBe(
        String(Timestamp.zero())
      );
      expect(String(ReactiveProtocol.lastUpdatedIn([tom]))).toBe(
        String(Timestamp.zero())
      );
    });

    it("has no dependencies", () => {
      const tom = Static("Tom Dale");

      expect([...ReactiveProtocol.dependencies(tom)]).toEqual([]);
      expect([...ReactiveProtocol.dependenciesInList([tom])]).toEqual([]);
    });
  });

  describe("Cell", () => {
    it("has the current timestamp for lastUpdated", () => {
      const original = TIMELINE.now;
      const tom = Cell("Tom");
      expect(String(ReactiveProtocol.lastUpdated(tom))).toBe(
        String(TIMELINE.now)
      );
      const nullvox = Cell("nullvox");
      const nullvoxTimestamp = TIMELINE.now;

      expect(String(ReactiveProtocol.lastUpdated(nullvox))).toBe(
        String(nullvoxTimestamp)
      );
      expect(String(ReactiveProtocol.lastUpdatedIn([tom, nullvox]))).toBe(
        String(TIMELINE.now)
      );

      expect(String(TIMELINE.now)).not.toBe(String(original));

      tom.current = "Tom Dale";
      expect(String(TIMELINE.now)).not.toBe(String(original));
      expect(String(ReactiveProtocol.lastUpdated(tom))).toBe(
        String(TIMELINE.now)
      );
      expect(String(ReactiveProtocol.lastUpdated(nullvox))).toBe(
        String(nullvoxTimestamp)
      );
      expect(String(ReactiveProtocol.lastUpdatedIn([tom, nullvox]))).toBe(
        String(TIMELINE.now)
      );
    });

    it("has itself as a dependency", () => {
      const tom = Cell("Tom");
      const nullvox = Cell("nullvox");

      expect([...ReactiveProtocol.dependencies(tom)]).toEqual([tom[REACTIVE]]);
      expect([...ReactiveProtocol.dependenciesInList([tom, nullvox])]).toEqual([
        tom[REACTIVE],
        nullvox[REACTIVE],
      ]);
    });

    it("has no dependencies if it's frozen", () => {
      const tom = FreezableCell("tom");
      const nullvox = FreezableCell("nullvox");
      tom.freeze();

      nullvox.current = "@nullvoxpopuli";

      expect([...ReactiveProtocol.dependencies(tom)]).toEqual([]);
      expect([...ReactiveProtocol.dependenciesInList([tom, nullvox])]).toEqual([
        nullvox[REACTIVE],
      ]);
    });
  });

  describe("Composite", () => {
    it("has the maximum timestamp of its dependencies", () => {
      const tom = Cell("Tom");
      const nullvox = Cell("nullvox");

      const composite: CompositeInternals = {
        type: "composite",
        children() {
          return [tom, nullvox];
        },
      };

      const Both: ReactiveProtocol = {
        [REACTIVE]: composite,
      };

      expect(String(ReactiveProtocol.lastUpdated(Both))).toBe(
        String(TIMELINE.now)
      );

      expect([...ReactiveProtocol.dependencies(Both)]).toEqual([
        tom[REACTIVE],
        nullvox[REACTIVE],
      ]);

      tom.current = "Tom Dale";

      expect(String(ReactiveProtocol.lastUpdated(Both))).toBe(
        String(TIMELINE.now)
      );
    });
  });
});
