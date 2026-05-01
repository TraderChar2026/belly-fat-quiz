import { Router } from "express";
import { computeScores, getCrmTag, getAlertLevel, CATEGORY_META, QUESTIONS } from "../shared/quizData";
import { saveQuizSubmission, checkIsRepeatSubmission } from "./db";
import { ENV } from "./_core/env";
import { sendResultsEmail } from "./resendEmail";

/** Send owner notification directly via Manus notification service (avoids TRPCError in Express context) */
async function sendOwnerNotification(title: string, content: string): Promise<void> {
  try {
    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      console.warn("[Notification] Missing forge API config — skipping owner notification");
      return;
    }
    const normalizedBase = ENV.forgeApiUrl.endsWith("/") ? ENV.forgeApiUrl : `${ENV.forgeApiUrl}/`;
    const endpoint = new URL("webdevtoken.v1.WebDevService/SendNotification", normalizedBase).toString();
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
        "connect-protocol-version": "1",
      },
      body: JSON.stringify({ title, content }),
    });
    if (res.ok) {
      console.log("[Notification] Owner notification sent successfully");
    } else {
      const detail = await res.text().catch(() => "");
      console.warn(`[Notification] Failed (${res.status}): ${detail.slice(0, 200)}`);
    }
  } catch (err) {
    console.warn("[Notification] Error sending owner notification:", err);
  }
}

const ghlRouter = Router();

// GoHighLevel location ID for Gateway Solutions / charwinnen.com
const GHL_LOCATION_ID = "Md5Bp8ZfS4SI5pEFdV7e";
// GHL_API_KEY is a v1 private integration token — use the v1 REST base
const GHL_BASE = "https://rest.gohighlevel.com/v1";

/**
 * Maps each quiz question ID to its corresponding GHL custom field ID.
 * Field IDs retrieved from locations_get-custom-fields (parentId: yQDwalloDButzz58ElJK).
 */
const QUESTION_TO_CUSTOM_FIELD: Record<number, string> = {
  1:  "RiCSRIBdcmgvuersMUQy", // How would you describe your digestion?
  2:  "uY0lZJy5Lly7AtOrJY5W", // Do you have heartburn after meals?
  3:  "rYBc2sMoS7yzypqQuAW7", // How do you experience unexplained weight changes?
  4:  "H758XGs3mgbaZXicXlzz", // How do you feel after meals?
  5:  "oCVFP1w7vX1iTNwQERGb", // How would you rate your energy levels throughout the day?
  6:  "uRD9qyDRhECvnEx9E0iC", // How well do you control your eating?
  7:  "KRwgTa0IrAaAELh909dO", // How difficult is it for you to lose weight?
  8:  "OhldEzczmvsmi8bCY038", // What do you typically eat for breakfast?
  9:  "9N5T3G7N8Q8ozXmyRZy8", // Do you have problems sleeping?
  10: "9BuWqOv6riYfGxDDqSvM", // Do you often experience brain fog?
  11: "t57QcGqjVEaz33JOu4dS", // Do you experience mood swings?
  12: "jMjoeu3yOsbiOoUM1qw8", // How would you describe your typical diet?
  13: "wldZY43hp0JmF13kOiZ7", // How often do you eat fermented foods?
  14: "ReUO2vVL2k5x6vwNMICL", // How often do you eat prebiotic foods?
  15: "ltQfDO6T2s3YBuLqQckQ", // Do you take antacids or acid blockers?
  16: "SUDDSiB02WFLsChmTdLE", // Do you take pain pills?
  17: "SiVmEW9qNGXos25LoiME", // Recent antibiotic use?
};

interface GhlSubmitBody {
  fullName: string;
  email: string;
  phone?: string;
  answers: { questionId: number; points: number; optionIndex?: number }[];
  // Attribution & session fields
  sessionId?: string;
  timezone?: string;
  adName?: string;
  adNameRaw?: string;
  referrerUrl?: string;
  referrerPlatform?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmId?: string;
  utmContent?: string;
  utmTerm?: string;
  fbclid?: string;
  fbEventId?: string;
  pageUrl?: string;
}

/** Helper: make a GHL v1 REST API call using the injected GHL_API_KEY */
async function ghlFetch(
  method: string,
  path: string,
  body?: unknown
): Promise<{ ok: boolean; status: number; data: unknown }> {
  const apiKey = process.env.GHL_API_KEY || "";
  const res = await fetch(`${GHL_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data: unknown;
  try { data = await res.json(); } catch { data = null; }
  return { ok: res.ok, status: res.status, data };
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
  utmSource?: string;
}): string {
  const {
    fullName, email, phone, answers,
    totalScore, digestiveScore, appetiteScore, gutScore,
    alertLabel, highestCat, lowestCat, submissionDate, utmSource,
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
    ${utmSource ? row("Ad / UTM Source", utmSource) : ""}
    ${row("Submission Date", submissionDate)}
  </table>
</div>`;
}

ghlRouter.post("/api/ghl-submit", async (req, res) => {
  try {
    const body = req.body as GhlSubmitBody;
    const {
      fullName, email, phone, answers,
      sessionId, timezone, adName, adNameRaw, referrerUrl, referrerPlatform,
      utmSource, utmMedium, utmCampaign, utmId, utmContent, utmTerm, fbclid, fbEventId, pageUrl,
    } = body;

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

      // Build custom fields array — map each answer to its GHL custom field ID
      const customFields = answers
        .filter((a) => QUESTION_TO_CUSTOM_FIELD[a.questionId])
        .map((a) => {
          const q = QUESTIONS.find((q) => q.id === a.questionId);
          let answerText = "";
          if (q) {
            if (a.optionIndex !== undefined && q.options[a.optionIndex]) {
              answerText = q.options[a.optionIndex]!.text;
            } else {
              answerText = q.options.find((o) => o.points === a.points)?.text ?? "";
            }
          }
          return { id: QUESTION_TO_CUSTOM_FIELD[a.questionId], field_value: answerText };
        })
        .filter((cf) => cf.field_value !== "");

      const upsertBody: Record<string, unknown> = {
        firstName,
        email,
        locationId: GHL_LOCATION_ID,
        source: "belly_fat_quiz",
        customFields,
      };
      if (lastName) upsertBody.lastName = lastName;
      if (phone) upsertBody.phone = phone;

      // v1 API: POST /contacts/ creates or updates (upsert by email)
      // Note: customFields in the POST body are ignored by GHL v1 — must PUT separately
      const upsertResult = await ghlFetch("POST", "/contacts/", upsertBody);
      if (upsertResult.ok) {
        const d = upsertResult.data as any;
        ghlContactId = d?.contact?.id ?? d?.id ?? null;
        console.log("[GHL] Upserted contact ID:", ghlContactId);
      } else {
        console.warn("[GHL] Upsert failed:", upsertResult.status, JSON.stringify(upsertResult.data).slice(0, 200));
      }

      // ── Step 1b: PUT custom fields separately (GHL v1 ignores customFields on POST) ─
      if (ghlContactId && customFields.length > 0) {
        const putResult = await ghlFetch("PUT", `/contacts/${ghlContactId}`, { customField: customFields });
        if (putResult.ok) {
          console.log(`[GHL] Mapped ${customFields.length} custom fields to contact ${ghlContactId}`);
        } else {
          console.warn("[GHL] Custom field mapping failed:", putResult.status, JSON.stringify(putResult.data).slice(0, 200));
        }
      }

      // ── Step 2: Remove then re-add alert tag so automation fires for existing contacts ─
      // GHL automations only trigger when a tag is ADDED. If the contact already has
      // the tag (e.g. repeat quiz taker), adding it again does nothing. Removing first
      // ensures the add always fires the automation.
      if (ghlContactId) {
        // Remove all three possible alert tags first (in case they have a different tier from before)
        const allAlertTags = ["red alert", "yellow alert", "green alert"];
        try {
          const removeResult = await ghlFetch("DELETE", `/contacts/${ghlContactId}/tags/`, { tags: allAlertTags });
          if (removeResult.ok) {
            console.log(`[GHL] Removed existing alert tags from contact ${ghlContactId}`);
          } else {
            // Non-fatal — tag may not exist yet, proceed to add
            console.log(`[GHL] Tag removal returned ${removeResult.status} (may not have had tags yet)`);
          }
        } catch (removeErr) {
          console.warn("[GHL] Tag removal error (non-fatal):", removeErr);
        }

        // Short delay to ensure GHL processes the removal before the add
        await new Promise((resolve) => setTimeout(resolve, 500));

        const tagResult = await ghlFetch("POST", `/contacts/${ghlContactId}/tags/`, { tags: [crmTag] });
        if (tagResult.ok) {
          console.log(`[GHL] Added tag "${crmTag}" to contact ${ghlContactId}`);
        } else {
          console.warn("[GHL] Tag add failed:", tagResult.status, JSON.stringify(tagResult.data).slice(0, 200));
        }

        // ── Step 2b: Add activity note with UTM/tracking data to contact timeline ──
        try {
          const noteLines = [
            `Quiz Submitted — Stubborn Belly Fat Quiz`,
            ``,
            `Score: ${totalScore} / 51  |  Alert: ${alertLevel.charAt(0).toUpperCase() + alertLevel.slice(1)} Alert`,
            ``,
            `--- Ad / Tracking Data ---`,
            `Ad Name (utm_medium): ${utmMedium ?? "—"}`,
            `Ad Source (utm_source): ${utmSource ?? "—"}`,
            `Campaign (utm_campaign): ${utmCampaign ?? "—"}`,
            `UTM Content: ${utmContent ?? "—"}`,
            `UTM ID: ${utmId ?? "—"}`,
            `UTM Term: ${utmTerm ?? "—"}`,
            `fbclid: ${fbclid ?? "—"}`,
            `Referrer: ${referrerUrl ?? "—"}`,
            `Page URL: ${pageUrl ?? "—"}`,
          ];
          const noteBody = noteLines.join("\n");
          const noteResult = await ghlFetch("POST", `/contacts/${ghlContactId}/notes/`, {
            body: noteBody,
            userId: ghlContactId,
          });
          if (noteResult.ok) {
            console.log(`[GHL] Activity note added to contact ${ghlContactId}`);
          } else {
            console.warn("[GHL] Note creation failed:", noteResult.status, JSON.stringify(noteResult.data).slice(0, 200));
          }
        } catch (noteErr) {
          console.warn("[GHL] Note creation error (non-fatal):", noteErr);
        }

        // ── Step 3: Submit to GHL Forms API so entry appears in Quiz Submissions ─
        try {
          const GHL_FORM_ID = "e5R9PsrieIyZg7lqVcU5";

          const formFields: Record<string, string> = {
            full_name: fullName,
            first_name: firstName,
            email: email,
          };
          if (lastName) formFields.last_name = lastName;
          if (phone) formFields.phone = phone;

          for (const a of answers) {
            const fieldId = QUESTION_TO_CUSTOM_FIELD[a.questionId];
            if (!fieldId) continue;
            const q = QUESTIONS.find((q) => q.id === a.questionId);
            if (!q) continue;
            let answerText = "";
            if (a.optionIndex !== undefined && q.options[a.optionIndex]) {
              answerText = q.options[a.optionIndex]!.text;
            } else {
              answerText = q.options.find((o) => o.points === a.points)?.text ?? "";
            }
            if (answerText) formFields[fieldId] = answerText;
          }

          const formResult = await ghlFetch("POST", "/forms/submit", {
            formId: GHL_FORM_ID,
            locationId: GHL_LOCATION_ID,
            contactId: ghlContactId,
            fieldData: formFields,
          });

          if (formResult.ok) {
            console.log("[GHL] Form submission recorded in Quiz Submissions");
          } else {
            console.warn("[GHL] Form submission failed:", formResult.status, JSON.stringify(formResult.data).slice(0, 200));
          }
        } catch (formErr) {
          console.warn("[GHL] Form submission error (non-fatal):", formErr);
        }

        // ── Step 4: Send HTML notification email via GHL Conversations API ───────
        try {
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

          // Step 4: Send owner notification via Manus built-in notification service
          // Build HTML so each field and Q&A renders on its own line in the email
          const qaRows = QUESTIONS.map((q) => {
            const a = answers.find((ans) => ans.questionId === q.id);
            let answerText = "(no answer)";
            if (a) {
              if (a.optionIndex !== undefined && q.options[a.optionIndex]) {
                answerText = q.options[a.optionIndex]!.text;
              } else {
                answerText = q.options.find((o) => o.points === a.points)?.text ?? answerText;
              }
            }
            return `<tr><td style="padding:4px 12px 4px 0;vertical-align:top;color:#555;width:55%"><b>${q.text}</b></td><td style="padding:4px 0;vertical-align:top">${answerText}</td></tr>`;
          }).join("");

          const highestMaxScore = highestCat.label === CATEGORY_META.digestive.label ? CATEGORY_META.digestive.maxScore : highestCat.label === CATEGORY_META.appetite.label ? CATEGORY_META.appetite.maxScore : CATEGORY_META.gut.maxScore;
          const lowestMaxScore = lowestCat.label === CATEGORY_META.digestive.label ? CATEGORY_META.digestive.maxScore : lowestCat.label === CATEGORY_META.appetite.label ? CATEGORY_META.appetite.maxScore : CATEGORY_META.gut.maxScore;

          const notifContent = `
<p>You have received a quiz submission. Please review the details below.</p>
<table style="border-collapse:collapse;font-family:sans-serif;font-size:14px;width:100%">
  <tr><td style="padding:4px 12px 4px 0;color:#555"><b>Full Name</b></td><td style="padding:4px 0">${fullName}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:#555"><b>Phone</b></td><td style="padding:4px 0">${phone ?? "(not provided)"}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:#555"><b>Email</b></td><td style="padding:4px 0">${email}</td></tr>
  <tr><td colspan="2" style="padding:12px 0 4px"><b>— Quiz Answers —</b></td></tr>
  ${qaRows}
  <tr><td colspan="2" style="padding:12px 0 4px"><b>— Scores —</b></td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:#555"><b>Overall Score</b></td><td style="padding:4px 0">${totalScore} / 51</td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:#555"><b>${CATEGORY_META.digestive.label} (max ${CATEGORY_META.digestive.maxScore})</b></td><td style="padding:4px 0">${digestiveScore}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:#555"><b>${CATEGORY_META.appetite.label} (max ${CATEGORY_META.appetite.maxScore})</b></td><td style="padding:4px 0">${appetiteScore}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:#555"><b>${CATEGORY_META.gut.label} (max ${CATEGORY_META.gut.maxScore})</b></td><td style="padding:4px 0">${gutScore}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:#555"><b>Highest Score</b></td><td style="padding:4px 0">${highestCat.score}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:#555"><b>Lowest Score</b></td><td style="padding:4px 0">${lowestCat.score}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:#555"><b>Highest Score Category</b></td><td style="padding:4px 0">${highestCat.label} (max ${highestMaxScore})</td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:#555"><b>Lowest Score Category</b></td><td style="padding:4px 0">${lowestCat.label} (max ${lowestMaxScore})</td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:#555"><b>Timezone</b></td><td style="padding:4px 0">${timezone ?? "Unknown"}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:#555"><b>Submission Date</b></td><td style="padding:4px 0">${submissionDate}</td></tr>
  ${pageUrl ? `<tr><td style="padding:4px 12px 4px 0;color:#555"><b>URL</b></td><td style="padding:4px 0">${pageUrl}</td></tr>` : ""}
</table>`;

          try {
            await sendOwnerNotification(`Quiz Submitted: ${fullName}`, notifContent);
            console.log("[GHL] Sent owner notification");
          } catch (notifErr) {
            console.warn("[GHL] Owner notification failed (non-fatal):", notifErr);
          }
        } catch (emailErr) {
          console.warn("[GHL] Email send error (non-fatal):", emailErr);
        }
      } else {
        console.warn("[GHL] Could not add tag or send email — no contact ID returned from upsert");
      }
    } catch (ghlError) {
      // GHL failure is non-fatal — we still save the submission
      console.error("[GHL] API call failed:", ghlError);
    }

    // ── Compute category insights ─────────────────────────────────────────────
    const catScoresForDb = [
      { label: CATEGORY_META.digestive.label, score: digestiveScore },
      { label: CATEGORY_META.appetite.label, score: appetiteScore },
      { label: CATEGORY_META.gut.label, score: gutScore },
    ];
    const highestCatDb = catScoresForDb.reduce((a, b) => (a.score >= b.score ? a : b));
    const lowestCatDb = catScoresForDb.reduce((a, b) => (a.score <= b.score ? a : b));

    // ── Compute score band ────────────────────────────────────────────────────
    const scoreBand =
      totalScore <= 8 ? "Green" :
      totalScore <= 22 ? "Yellow" :
      totalScore <= 30 ? "Lower_Red" : "Upper_Red";

    // ── Check for repeat submission ───────────────────────────────────────────
    const isRepeat = await checkIsRepeatSubmission(email);

    // ── Build individual question answer map ─────────────────────────────────
    const getAnswerText = (qId: number): string | undefined => {
      const a = answers.find((a) => a.questionId === qId);
      if (!a) return undefined;
      const q = QUESTIONS.find((q) => q.id === qId);
      if (!q) return undefined;
      if (a.optionIndex !== undefined && q.options[a.optionIndex]) return q.options[a.optionIndex]!.text;
      return q.options.find((o) => o.points === a.points)?.text;
    };

    // ── Normalize ad name ─────────────────────────────────────────────────────
    const normalizeAdName = (raw?: string): string => {
      if (!raw || raw.trim() === "") return "Direct / Unknown";
      return raw.trim().replace(/\s+/g, " ");
    };
    const normalizedAdName = normalizeAdName(adName);

    // ── Persist submission to database ────────────────────────────────────────
    const tagAppliedAt = new Date();
    await saveQuizSubmission({
      fullName,
      email,
      phone: phone ?? null,
      answers: JSON.stringify(answers),
      totalScore,
      alertTier: alertLevel.charAt(0).toUpperCase() + alertLevel.slice(1),
      scoreBand,
      digestiveScore,
      appetiteScore,
      gutScore,
      highestScoreCategory: highestCatDb.label,
      lowestScoreCategory: lowestCatDb.label,
      tagApplied: crmTag,
      tagAppliedAt,
      isRepeatSubmission: isRepeat,
      awesomecrmContactId: ghlContactId ?? undefined,
      crmTag,
      ghlContactId,
      q1Digestion: getAnswerText(1),
      q2Heartburn: getAnswerText(2),
      q3WeightChanges: getAnswerText(3),
      q4Energy: getAnswerText(4),
      q5AfterMeals: getAnswerText(5),
      q6EatingControl: getAnswerText(6),
      q7LoseWeight: getAnswerText(7),
      q8Breakfast: getAnswerText(8),
      q9Sleep: getAnswerText(9),
      q10BrainFog: getAnswerText(10),
      q11MoodSwings: getAnswerText(11),
      q12Diet: getAnswerText(12),
      q13FermentedFoods: getAnswerText(13),
      q14PrebioticFoods: getAnswerText(14),
      q15Antacids: getAnswerText(15),
      q16PainPills: getAnswerText(16),
      q17Antibiotics: getAnswerText(17),
      sessionId,
      timezone,
      adName: normalizedAdName,
      adNameRaw: adNameRaw ?? adName,
      referrerUrl,
      referrerPlatform,
      utmSource,
      utmMedium,
      utmCampaign,
      utmId,
      utmContent,
      utmTerm,
      fbclid,
      fbEventId,
      pageUrl,
    });

    // ── Send personalised results email to quiz taker via Resend ────────────
    const nameParts2 = fullName.trim().split(/\s+/);
    const firstName2 = nameParts2[0] ?? fullName;
    try {
      await sendResultsEmail({
        firstName: firstName2,
        email,
        totalScore,
        maxScore: 51,
        digestiveScore,
        appetiteScore,
        gutScore,
        alertLevel,
      });
    } catch (emailErr) {
      console.warn("[Resend] Results email failed (non-fatal):", emailErr);
    }

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
