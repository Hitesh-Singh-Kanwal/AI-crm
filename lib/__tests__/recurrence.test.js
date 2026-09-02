import { describe, it, expect } from "vitest";
import { validateRecurrence } from "@/lib/recurrence";

const base = {
  date: "2026-09-08",
  recurrence_frequency: "weekly",
  recurrence_end_date: "2026-10-06",
  recurrence_days_of_week: [2],
  recurrence_monthly_weekday: null,
  recurrence_monthly_weeks: [],
};

describe("validateRecurrence", () => {
  it("accepts a complete weekly rule", () => {
    expect(validateRecurrence(base)).toBeNull();
  });

  it("rejects a missing end date instead of dropping the recurrence", () => {
    expect(validateRecurrence({ ...base, recurrence_end_date: "" })).toMatch(
      /stop on/,
    );
  });

  it("rejects an end date before the event date", () => {
    expect(
      validateRecurrence({ ...base, recurrence_end_date: "2026-09-01" }),
    ).toMatch(/before the event date/);
  });

  it("accepts an end date on the event date itself", () => {
    expect(
      validateRecurrence({ ...base, recurrence_end_date: "2026-09-08" }),
    ).toBeNull();
  });

  it("rejects weekly with no days selected", () => {
    expect(
      validateRecurrence({ ...base, recurrence_days_of_week: [] }),
    ).toMatch(/day of the week/);
  });

  it("rejects a missing frequency", () => {
    expect(validateRecurrence({ ...base, recurrence_frequency: "" })).toMatch(
      /how often/,
    );
  });

  it("accepts daily without day selections", () => {
    expect(
      validateRecurrence({
        ...base,
        recurrence_frequency: "daily",
        recurrence_days_of_week: [],
      }),
    ).toBeNull();
  });

  describe("monthly", () => {
    const monthly = {
      ...base,
      recurrence_frequency: "monthly",
      recurrence_days_of_week: [],
      recurrence_monthly_weekday: 2,
      recurrence_monthly_weeks: [2],
    };

    it("accepts a complete rule", () => {
      expect(validateRecurrence(monthly)).toBeNull();
    });

    it("rejects a missing weekday", () => {
      expect(
        validateRecurrence({ ...monthly, recurrence_monthly_weekday: null }),
      ).toMatch(/weekday/);
    });

    it("treats Sunday (0) as a real selection", () => {
      expect(
        validateRecurrence({ ...monthly, recurrence_monthly_weekday: 0 }),
      ).toBeNull();
    });

    it("rejects no weeks selected", () => {
      expect(
        validateRecurrence({ ...monthly, recurrence_monthly_weeks: [] }),
      ).toMatch(/week of the month/);
    });
  });
});
