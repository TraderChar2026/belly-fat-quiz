import { describe, expect, it } from "vitest";
import {
  computeScores,
  getCrmTag,
  getAlertLevel,
  QUESTIONS,
  CATEGORY_META,
  TOTAL_MAX_SCORE,
} from "../shared/quizData";

// ── Helper: build a full answer set from option indices ──────────────────────
function buildAnswers(optionIndices: number[]) {
  return QUESTIONS.map((q, i) => ({
    questionId: q.id,
    points: q.options[optionIndices[i] ?? 0]!.points,
  }));
}

// ── Scoring ──────────────────────────────────────────────────────────────────
describe("computeScores", () => {
  it("returns zero scores when all option 2 (0 pts) are selected", () => {
    const answers = buildAnswers(Array(17).fill(2));
    const scores = computeScores(answers);
    expect(scores.totalScore).toBe(0);
    expect(scores.digestiveScore).toBe(0);
    expect(scores.appetiteScore).toBe(0);
    expect(scores.gutScore).toBe(0);
  });

  it("returns max scores when all option 0 (3 pts) are selected", () => {
    const answers = buildAnswers(Array(17).fill(0));
    const scores = computeScores(answers);
    expect(scores.digestiveScore).toBe(CATEGORY_META.digestive.maxScore); // 12
    expect(scores.appetiteScore).toBe(CATEGORY_META.appetite.maxScore);   // 12
    expect(scores.gutScore).toBe(CATEGORY_META.gut.maxScore);             // 27
    expect(scores.totalScore).toBe(TOTAL_MAX_SCORE);                      // 51
  });

  it("correctly sums mixed answers", () => {
    // Q1–Q4 digestive: 3+2+0+3 = 8
    // Q5–Q8 appetite:  2+2+2+2 = 8
    // Q9–Q17 gut:      3+0+0+0+0+0+0+0+0 = 3
    const answers = [
      { questionId: 1, points: 3 },
      { questionId: 2, points: 2 },
      { questionId: 3, points: 0 },
      { questionId: 4, points: 3 },
      { questionId: 5, points: 2 },
      { questionId: 6, points: 2 },
      { questionId: 7, points: 2 },
      { questionId: 8, points: 2 },
      { questionId: 9, points: 3 },
      { questionId: 10, points: 0 },
      { questionId: 11, points: 0 },
      { questionId: 12, points: 0 },
      { questionId: 13, points: 0 },
      { questionId: 14, points: 0 },
      { questionId: 15, points: 0 },
      { questionId: 16, points: 0 },
      { questionId: 17, points: 0 },
    ];
    const scores = computeScores(answers);
    expect(scores.digestiveScore).toBe(8);
    expect(scores.appetiteScore).toBe(8);
    expect(scores.gutScore).toBe(3);
    expect(scores.totalScore).toBe(19);
  });
});

// ── Alert level ───────────────────────────────────────────────────────────────
describe("getAlertLevel", () => {
  it("returns green for scores 0–8", () => {
    expect(getAlertLevel(0)).toBe("green");
    expect(getAlertLevel(8)).toBe("green");
  });

  it("returns yellow for scores 9–22", () => {
    expect(getAlertLevel(9)).toBe("yellow");
    expect(getAlertLevel(22)).toBe("yellow");
  });

  it("returns red for scores 23+", () => {
    expect(getAlertLevel(23)).toBe("red");
    expect(getAlertLevel(51)).toBe("red");
  });
});

// ── CRM tag ───────────────────────────────────────────────────────────────────
describe("getCrmTag", () => {
  it("returns 'green alert' for green range (0–8)", () => {
    expect(getCrmTag(0)).toBe("green alert");
    expect(getCrmTag(8)).toBe("green alert");
  });

  it("returns 'yellow alert' for scores 9–22", () => {
    expect(getCrmTag(9)).toBe("yellow alert");
    expect(getCrmTag(22)).toBe("yellow alert");
  });

  it("returns 'red alert' for scores 23+", () => {
    expect(getCrmTag(23)).toBe("red alert");
    expect(getCrmTag(51)).toBe("red alert");
  });
});

// ── Quiz data integrity ───────────────────────────────────────────────────────
describe("QUESTIONS data integrity", () => {
  it("has exactly 17 questions", () => {
    expect(QUESTIONS).toHaveLength(17);
  });

  it("each question has exactly 3 options", () => {
    QUESTIONS.forEach((q) => {
      expect(q.options).toHaveLength(3);
    });
  });

  it("option points are always 3, 2, or 0 in that order", () => {
    QUESTIONS.forEach((q) => {
      expect(q.options[0]!.points).toBe(3);
      expect(q.options[1]!.points).toBe(2);
      expect(q.options[2]!.points).toBe(0);
    });
  });

  it("question IDs are sequential 1–17", () => {
    QUESTIONS.forEach((q, i) => {
      expect(q.id).toBe(i + 1);
    });
  });

  it("category question counts match spec", () => {
    const digestive = QUESTIONS.filter((q) => q.category === "digestive");
    const appetite = QUESTIONS.filter((q) => q.category === "appetite");
    const gut = QUESTIONS.filter((q) => q.category === "gut");
    expect(digestive).toHaveLength(4);
    expect(appetite).toHaveLength(4);
    expect(gut).toHaveLength(9);
  });

  it("total max score is 51", () => {
    expect(TOTAL_MAX_SCORE).toBe(51);
  });
});
