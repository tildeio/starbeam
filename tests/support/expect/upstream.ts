import * as globals from "@jest/globals";
import { MatcherState } from "expect";
import { diff } from "jest-diff";
import { exhaustive } from "starbeam";
import type {
  ChildFailure,
  Failure,
  MatchResult,
  PatternDetails,
  ValueDescription,
} from "./report";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    interface Matchers<R> {
      starbeam(): CustomMatcherResult;
    }
  }
}

class JestAssertionError extends Error {
  readonly matcherResult: jest.CustomMatcherResult;

  constructor(result: jest.CustomMatcherResult, callsite: Function) {
    super(result.message());
    this.matcherResult = result;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, callsite);
    }
  }
}

export function starbeam(
  state: MatcherState,
  result: MatchResult
): jest.CustomMatcherResult {
  let processed = processResult(state, result);

  if (!processed.pass) {
    throw new JestAssertionError(processed, starbeam);
  }

  return processed;
}

globals.expect.extend({
  starbeam,
});

function processResult(
  ctx: MatcherState,
  result: MatchResult | ChildFailure<Failure>
): jest.CustomMatcherResult {
  if (result.kind === "success") {
    let message = () => hint(ctx.utils, result.pattern);

    return { message, pass: true };
  } else {
    if ("pattern" in result) {
      switch (result.kind) {
        case "equality":
        case "mismatch": {
          return notEqual(ctx, result);
        }

        case "multiple": {
          let { message, failures, pattern } = result;

          let output = () => {
            let out = [message, hint(ctx.utils, pattern)];

            for (let failure of failures) {
              let { message } = processResult(ctx, failure);
              out.push(message());
            }

            return out.join("\n\n");
          };

          return { message: output, pass: false };
        }

        case "invalid": {
          throw Error("todo: invalid");
        }

        case "wrong-type": {
          throw Error("todo: wrong-type");
        }

        default: {
          exhaustive(result, "Failure");
        }
      }
    } else {
      switch (result.kind) {
        case "equality":
        case "mismatch": {
          if ("pattern" in result) {
            return notEqualChild(ctx, result);
          }
          throw Error("todo: mismatch without pattern");
        }

        case "multiple": {
          throw Error("todo: multiple child of multiple");
        }

        case "invalid": {
          throw Error("todo: invalid child of multiple");
        }

        case "wrong-type": {
          throw Error("todo: wrong-type child of multiple");
        }

        default: {
          exhaustive(result, "Failure");
        }
      }
    }
  }
}

function notEqual(
  ctx: MatcherState,
  {
    actual,
    expected,
    pattern,
  }: {
    actual: ValueDescription;
    expected: ValueDescription;
    pattern: PatternDetails;
  }
): jest.CustomMatcherResult {
  let message = () => {
    return (
      hint(ctx.utils, pattern, { actual, expected }) +
      "\n\n" +
      formatDiff(actual, expected, ctx.utils)
    );
  };

  return { message, pass: false };
}

function notEqualChild(
  ctx: MatcherState,
  {
    actual,
    expected,
    description,
  }: {
    actual: ValueDescription;
    expected: ValueDescription;
    description: string;
  }
): jest.CustomMatcherResult {
  let message = () => {
    return (
      ctx.utils.EXPECTED_COLOR(description) +
      "\n\n" +
      formatDiff(actual, expected, ctx.utils)
    );
  };

  return { message, pass: false };
}

function scenario(
  utils: MatcherState["utils"],
  pattern: PatternDetails
): string {
  if (pattern.scenario) {
    return (
      utils.INVERTED_COLOR(`Scenario`) +
      ` ` +
      utils.DIM_COLOR(pattern.scenario) +
      `\n\n`
    );
  } else {
    return ``;
  }
}

function hint(
  utils: MatcherState["utils"],
  pattern: PatternDetails,
  values?: {
    actual: ValueDescription;
    expected: ValueDescription;
  }
): string {
  let actual = values
    ? format(values.actual, utils.RECEIVED_COLOR("actual"), utils.DIM_COLOR)
    : utils.RECEIVED_COLOR("actual");

  let expected = values
    ? format(values.expected, utils.EXPECTED_COLOR("expected"), utils.DIM_COLOR)
    : utils.EXPECTED_COLOR("expected");

  return (
    scenario(utils, pattern) +
    (utils.DIM_COLOR("expect(") +
      actual +
      utils.DIM_COLOR(", ") +
      pattern.name +
      utils.DIM_COLOR("(") +
      expected +
      utils.DIM_COLOR(`)) // ${pattern.description}`))
  );
}

// See: https://jestjs.io/docs/expect#thisutils
function formatDiff(
  actual: ValueDescription,
  expected: ValueDescription,
  utils: MatcherState["utils"]
): string {
  let diffs = diff(expected.is, actual.is);

  if (diffs && diffs.includes("- Expect")) {
    return `Difference:\n\n${diffs}`;
  } else {
    let expectedString = utils.printExpected(expected.is);
    let expectedTitle = expected.comment
      ? `Expected (${expected.comment})`
      : `Expected`;
    let actualString = utils.printReceived(actual.is);

    return `${expectedTitle}: ${expectedString}\n\n  Actual: ${actualString}`;
  }
}

function format(
  description: ValueDescription,
  purpose: string,
  formatComment: (value: string) => string
): string {
  if (description.comment) {
    let comment = formatComment(`/* ${description.comment} */`);
    return `${purpose} ${comment}`;
  } else {
    return purpose;
  }
}
