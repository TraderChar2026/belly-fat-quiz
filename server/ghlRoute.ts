import { Router } from "express";
import { exec } from "child_process";
import { promisify } from "util";
import { computeScores, getCrmTag } from "../shared/quizData";
import { saveQuizSubmission } from "./db";

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

    // Build tags array — always include the alert tag and quiz source tag
    const tags: string[] = [crmTag, "belly_fat_quiz"];

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
      // Extract only the JSON block (first { ... } in stdout).
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
      // GHL failure is non-fatal — we still save the submission
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
