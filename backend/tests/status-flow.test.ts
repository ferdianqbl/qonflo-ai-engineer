import { describe, expect, it } from "vitest";
import { canTransition, getNextStatus, TASK_STATUSES } from "../src/core/task-status";

describe("status flow", () => {
  it("walks to_do → pending → in_progress → done and then stops", () => {
    expect(getNextStatus("to_do")).toBe("pending");
    expect(getNextStatus("pending")).toBe("in_progress");
    expect(getNextStatus("in_progress")).toBe("done");
    expect(getNextStatus("done")).toBeNull();
  });

  it("allows exactly the three one-step-forward transitions out of all sixteen pairs", () => {
    const allowed = TASK_STATUSES.flatMap((from) =>
      TASK_STATUSES.filter((to) => canTransition(from, to)).map((to) => `${from} → ${to}`),
    );

    expect(allowed).toEqual(["to_do → pending", "pending → in_progress", "in_progress → done"]);
  });
});
