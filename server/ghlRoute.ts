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
  answers: { questionId: number; points: number; optionIndex?: number }[];
}

/** Run an MCP tool call and return the parsed JSON result, or null on failure. */
async function mcpCall(toolName: string, inputPayload: Record<string, unknown>): Promise<unknown> {
  const inputJson = JSON.stringify(inputPayload).replace(/'/g, "'\\''");
  const { stdout, stderr } = await execAsync(
    `manus-mcp-cli tool call ${toolName} --server prod-ghl-mcp --input '${inputJson}'`,
    { timeout: 30000 }
  );
  if (stderr) console.warn(`[GHL/${toolName}] stderr:`, stderr.slice(0, 200));
  const jsonMatch = stdout.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.warn(`[GHL/${toolName}] No JSON in output:`, stdout.slice(0, 200));
    return null;
  }
  return JSON.parse(jsonMatch[0]);
}

/** Build the HTML table email body matching the preferred two-column format */
function buildHtmlEmail(params: {
  fullName: string;
  email: string;
  phone?: string;
  answers: { questionId: number; points: number; optionIndex?: number }[];
  totalScore: number;
  digestiveScore: number;
  appetiteScore: number;
  gutScore: number;
  alertLabel: string;
  highestCat: { label: string; score: number };
  lowestCat: { label: string; score: number };
  submissionDate: string;
}): string {
  const {
    fullName, email, phone, answers,
    totalScore, digestiveScore, appetiteScore, gutScore,
    alertLabel, highestCat, lowestCat, submissionDate,
  } = params;

  const rowStyle = `padding:8px 12px;border-bottom:1px solid #e0e0e0;`;
  const labelStyle = `${rowStyle}color:#555;width:50%`;
  const valueStyle = `${rowStyle}color:#222`;

  const row = (label: string, value: string) =>
    `<tr><td style="${labelStyle}">${label}</td><td style="${valueStyle}">${value}</td></tr>`;

  // Q&A rows
  const qaRows = QUESTIONS.map((q) => {
    const answer = answers.find((a) => a.questionId === q.id);
    let answerText = "(no answer)";
    if (answer) {
      // Prefer optionIndex lookup; fall back to points match
      if (answer.optionIndex !== undefined && q.options[answer.optionIndex]) {
        answerText = q.options[answer.optionIndex]!.text;
      } else {
        answerText = q.options.find((o) => o.points === answer.points)?.text ?? answerText;
      }
    }
    return row(q.text, answerText);
  }).join("");

  return `
<div style="font-family:Arial,sans-serif;font-size:14px;color:#333;max-width:700px">
  <p style="font-weight:bold;margin-bottom:16px">
    You have received a quiz submission. Please review the quiz details below.
  </p>
  <table style="width:100%;border-collapse:collapse;border:1px solid #e0e0e0">
    ${row("Full Name", fullName)}
    ${phone ? row("Phone", phone) : ""}
    ${row("Email", `<a href="mailto:${email}" style="color:#1a73e8">${email}</a>`)}
    ${qaRows}
    ${row("Overall Score", `${totalScore} / 51`)}
    ${row(`${CATEGORY_META.digestive.label} — Max score ${CATEGORY_META.digestive.maxScore}`, String(digestiveScore))}
    ${row(`${CATEGORY_META.appetite.label} — Max score ${CATEGORY_META.appetite.maxScore}`, String(appetiteScore))}
    ${row(`${CATEGORY_META.gut.label} — Max score ${CATEGORY_META.gut.maxScore}`, String(gutScore))}
    ${row("Alert Level", alertLabel)}
    ${row("Highest Score Category", `${highestCat.label} — ${highestCat.score}`)}
    ${row("Lowest Score Category", `${lowestCat.label} — ${lowestCat.score}`)}
    ${row("Submission Date", submissionDate)}
  </table>
</div>`;
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
    const alertLabel = alertLevel === "red" ? "Red Alert" : alertLevel === "yellow" ? "Yellow Alert" : "Green Alert";

    let ghlContactId: string | null = null;

    try {
      // ── Step 1: Upsert contact WITHOUT tags ──────────────────────────────────
      // Tags included in upsert do NOT fire tag-based automations in GHL.
      // We must add the tag as a separate API call after the contact exists.
      const nameParts = fullName.trim().split(/\s+/);
      const firstName = nameParts[0] ?? fullName;
      const lastName = nameParts.slice(1).join(" ") || undefined;

      const upsertPayload: Record<string, unknown> = {
        body_firstName: firstName,
        body_email: email,
        body_locationId: GHL_LOCATION_ID,
        body_source: "belly_fat_quiz",
      };
      if (lastName) upsertPayload.body_lastName = lastName;
      if (phone) upsertPayload.body_phone = phone;

      const upsertResult = await mcpCall("contacts_upsert-contact", upsertPayload) as Record<string, unknown> | null;
      ghlContactId =
        (upsertResult as any)?.data?.contact?.id ??
        (upsertResult as any)?.contact?.id ??
        (upsertResult as any)?.id ??
        null;

      console.log("[GHL] Upserted contact ID:", ghlContactId);

      // ── Step 2: Add alert tag via dedicated endpoint ─────────────────────────
      // This is what fires the "Gut Health Trial Workflow" automation in GHL.
      if (ghlContactId) {
        await mcpCall("contacts_add-tags", {
          path_contactId: ghlContactId,
          body_tags: [crmTag],
        });
        console.log(`[GHL] Added tag "${crmTag}" to contact ${ghlContactId}`);

        // ── Step 3: Send HTML notification email via GHL ─────────────────────
        // GHL's conversations_send-a-new-message supports body_html, which renders
        // a proper two-column table in the owner's email — matching the preferred format.
        const catScores = [
          { label: CATEGORY_META.digestive.label, score: digestiveScore },
          { label: CATEGORY_META.appetite.label, score: appetiteScore },
          { label: CATEGORY_META.gut.label, score: gutScore },
        ];
        const highestCat = catScores.reduce((a, b) => (a.score >= b.score ? a : b));
        const lowestCat = catScores.reduce((a, b) => (a.score <= b.score ? a : b));

        const submissionDate = new Date().toLocaleString("en-US", {
          timeZone: "America/Chicago",
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        });

        const htmlBody = buildHtmlEmail({
          fullName, email, phone, answers,
          totalScore, digestiveScore, appetiteScore, gutScore,
          alertLabel, highestCat, lowestCat, submissionDate,
        });

        await mcpCall("conversations_send-a-new-message", {
          body_type: "Email",
          body_contactId: ghlContactId,
          body_emailTo: "cjwinnen@comcast.net",
          body_subject: `${fullName} Quiz Submitted`,
          body_html: htmlBody,
        });
        console.log("[GHL] Sent HTML notification email to owner");
      } else {
        console.warn("[GHL] Could not add tag or send email — no contact ID returned from upsert");
      }
    } catch (mcpError) {
      // GHL failure is non-fatal — we still save the submission and send fallback notification
      console.error("[GHL] MCP call failed:", mcpError);
    }

    // ── Persist submission to database ────────────────────────────────────────
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

    // ── Fallback: also send plain-text Manus notification ─────────────────────
    // This ensures the owner always gets notified even if the GHL email fails.
    notifyOwner({
      title: `${fullName} Quiz Submitted`,
      content: `New quiz submission received.\n\nName: ${fullName}\nEmail: ${email}${phone ? `\nPhone: ${phone}` : ""}\n\nScore: ${totalScore}/51 — ${alertLabel}\nDigestive: ${digestiveScore} | Appetite: ${appetiteScore} | Gut Health: ${gutScore}`,
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
