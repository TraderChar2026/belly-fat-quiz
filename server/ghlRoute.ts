import { Router } from "express";
import { exec } from "child_process";
import { promisify } from "util";
import { computeScores, getCrmTag, getAlertLevel, CATEGORY_META, QUESTIONS } from "../shared/quizData";
import { saveQuizSubmission } from "./db";
import { notifyOwner } from "./_core/notification";

const execAsync = promisify(exec);
const ghlRouter = Router();

// GoHighLevel location ID for Gateway Solutions / charwinnen.com
const GHL_LOCATION_ID = "Md5Bp8ZfS4SI5pEFdV7e";

interface GhlSubmitBody {
  fullName: string;
  email: string;
  phone?: string;
  answers: { questionId: number; points: number }[];
}

ghlRouter.post("/api/ghl-submit", async (req, res) => {
  try {
    const body = req.body as GhlSubmitBody;
    const { fullName, email, phone, answers } = body;

    if (!fullName || !email || !Array.isArray(answers) || answers.length !== 17) {
      return res.status(400).json({ error: "Invalid payload" });
    }

    const { digestiveScore, appetiteScore, gutScore, totalScore } = computeScores(answers);
    const crmTag = getCrmTag(totalScore);
    const alertLevel = getAlertLevel(totalScore);

    // Only send the single alert tag — no extra tags that could interfere with automations
    const tags: string[] = [crmTag];

    // Upsert contact in GoHighLevel via MCP
    let ghlContactId: string | null = null;
    try {
      const nameParts = fullName.trim().split(/\s+/);
      const firstName = nameParts[0] ?? fullName;
      const lastName = nameParts.slice(1).join(" ") || undefined;

      const inputPayload: Record<string, unknown> = {
        body_firstName: firstName,
        body_email: email,
        body_locationId: GHL_LOCATION_ID,
        body_source: "belly_fat_quiz",
        body_tags: tags,
      };
      if (lastName) inputPayload.body_lastName = lastName;
      if (phone) inputPayload.body_phone = phone;

      // Escape single quotes in JSON for shell safety
      const inputJson = JSON.stringify(inputPayload).replace(/'/g, "'\\''");
      const { stdout, stderr } = await execAsync(
        `manus-mcp-cli tool call contacts_upsert-contact --server prod-ghl-mcp --input '${inputJson}'`,
        { timeout: 30000 }
      );

      if (stderr) console.warn("[GHL] MCP stderr:", stderr.slice(0, 300));

      // MCP CLI prints a "Tool execution result saved to: <path>" line then the JSON.
      // Extract the JSON block from stdout.
      try {
        const jsonMatch = stdout.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          ghlContactId =
            parsed?.data?.contact?.id ??
            parsed?.contact?.id ??
            parsed?.id ??
            null;
          console.log("[GHL] Upserted contact ID:", ghlContactId);
        } else {
          console.warn("[GHL] No JSON block found in MCP output:", stdout.slice(0, 300));
        }
      } catch {
        console.warn("[GHL] Could not parse MCP response as JSON:", stdout.slice(0, 300));
      }
    } catch (mcpError) {
      // GHL failure is non-fatal — we still save the submission and send notification
      console.error("[GHL] MCP upsert failed:", mcpError);
    }

    // Persist submission to database
    await saveQuizSubmission({
      fullName,
      email,
      phone: phone ?? null,
      answers: JSON.stringify(answers),
      totalScore,
      digestiveScore,
      appetiteScore,
      gutScore,
      crmTag,
      ghlContactId,
    });

    // Send owner notification email
    const alertEmoji = alertLevel === "red" ? "🔴" : alertLevel === "yellow" ? "🟡" : "🟢";
    const alertLabel = alertLevel === "red" ? "Red Alert" : alertLevel === "yellow" ? "Yellow Alert" : "Green Alert";

    // Build a lookup: questionId -> selected answer text
    const pointsToAnswerText = (questionId: number, points: number): string => {
      const question = QUESTIONS.find((q) => q.id === questionId);
      if (!question) return `(unknown question ${questionId})`;
      const option = question.options.find((o) => o.points === points);
      return option ? option.text : `(unknown answer, points: ${points})`;
    };

    // Build question/answer lines grouped by category
    const qaLines: string[] = [];
    const categories: Array<{ key: "digestive" | "appetite" | "gut"; label: string }> = [
      { key: "digestive", label: CATEGORY_META.digestive.label },
      { key: "appetite", label: CATEGORY_META.appetite.label },
      { key: "gut", label: CATEGORY_META.gut.label },
    ];
    for (const cat of categories) {
      qaLines.push(`--- ${cat.label} ---`);
      const catQuestions = QUESTIONS.filter((q) => q.category === cat.key);
      for (const q of catQuestions) {
        const answer = answers.find((a) => a.questionId === q.id);
        const answerText = answer ? pointsToAnswerText(q.id, answer.points) : "(no answer)";
        qaLines.push(`Q${q.id}. ${q.text}`);
        qaLines.push(`   → ${answerText}`);
      }
      qaLines.push("");
    }

    const notificationContent = [
      `Name: ${fullName}`,
      `Email: ${email}`,
      phone ? `Phone: ${phone}` : null,
      ``,
      `Total Score: ${totalScore} / 51`,
      `Alert Level: ${alertEmoji} ${alertLabel}`,
      ``,
      `Score Breakdown:`,
      `  ${CATEGORY_META.digestive.label}: ${digestiveScore} / ${CATEGORY_META.digestive.maxScore}`,
      `  ${CATEGORY_META.appetite.label}: ${appetiteScore} / ${CATEGORY_META.appetite.maxScore}`,
      `  ${CATEGORY_META.gut.label}: ${gutScore} / ${CATEGORY_META.gut.maxScore}`,
      ``,
      `Quiz Answers:`,
      ...qaLines,
    ]
      .filter((line) => line !== null)
      .join("\n");

    notifyOwner({
      title: `${fullName} Quiz Submitted`,
      content: notificationContent,
    }).catch((err) => console.warn("[Notification] Failed to notify owner:", err));

    return res.json({
      success: true,
      totalScore,
      digestiveScore,
      appetiteScore,
      gutScore,
      crmTag,
      contactId: ghlContactId,
    });
  } catch (err) {
    console.error("[GHL Submit] Error:", err);
    return res.status(500).json({ error: "Submission failed" });
  }
});

export { ghlRouter };
