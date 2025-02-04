import { type Stack, callerStack, descriptionFrom } from "@starbeam/debug";
import type { UNINITIALIZED } from "@starbeam/peer";
import {
  type MutableInternals,
  type Reactive,
  type ReactiveProtocol,
  Frame,
  REACTIVE,
  TIMELINE,
  Timestamp,
} from "@starbeam/timeline";

export interface Cell<T> extends ReactiveProtocol {
  current: T;
  read(stack: Stack): T;
}

export interface FreezableCell<T> extends Cell<T> {
  freeze(): void;
}

export function Cell<T>(value: T): Cell<T> {
  let lastUpdated = TIMELINE.bump();
  const internals: MutableInternals = {
    type: "mutable",
    get lastUpdated(): Timestamp {
      return lastUpdated;
    },
  };

  return {
    [REACTIVE]: internals,
    read(stack?: Stack) {
      TIMELINE.frame.didConsume(this, stack);
      return value;
    },
    get current() {
      return this.read(callerStack());
    },
    set current(newValue: T) {
      value = newValue;

      lastUpdated = TIMELINE.bump(internals);
    },
  };
}

export function FreezableCell<T>(value: T): FreezableCell<T> {
  let lastUpdated = Timestamp.zero();
  let isFrozen = false;

  const internals: MutableInternals = {
    type: "mutable",
    get lastUpdated(): Timestamp {
      return lastUpdated;
    },
    isFrozen: () => isFrozen,
  };

  return {
    [REACTIVE]: internals,
    read(stack?: Stack) {
      TIMELINE.frame.didConsume(this, stack);
      return value;
    },
    get current() {
      return this.read(callerStack());
    },
    set current(newValue: T) {
      value = newValue;

      lastUpdated = TIMELINE.bump(internals);
    },
    freeze() {
      isFrozen = true;
    },
  };
}

export function Static<T>(value: T): Reactive<T> {
  return {
    [REACTIVE]: {
      type: "static",
    },
    read() {
      return value;
    },
  };
}

/**
 * A simplistic Formula implementation that we're using to test the fundamentals of the TIMELINE
 * API.
 */
export function Formula<T>(computation: () => T): {
  frame: Frame<T | UNINITIALIZED>;
  poll: () => T;
} {
  const frame = Frame.uninitialized<T>(
    TIMELINE.bump(),
    descriptionFrom({
      type: "formula",
      api: "Formula",
    })
  );

  function poll(): T {
    const validation = frame.validate();

    if (validation.status === "valid") {
      TIMELINE.frame.didConsume(frame);
      return validation.value;
    }

    const result = Frame.value(
      TIMELINE.frame.update({
        updating: frame,
        evaluate: computation,
      })
    );
    TIMELINE.update(frame);
    TIMELINE.frame.didConsume(frame);
    return result;
  }

  return { frame, poll };
}

export function Marker(): {
  instance: ReactiveProtocol;
  update: () => void;
} {
  let lastUpdated = TIMELINE.bump();
  const internals: MutableInternals = {
    type: "mutable",
    get lastUpdated() {
      return lastUpdated;
    },
  };

  return {
    instance: {
      [REACTIVE]: internals,
    },
    update: () => {
      lastUpdated = TIMELINE.bump(internals);
    },
  };
}
