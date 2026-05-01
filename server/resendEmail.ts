import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_ADDRESS = "char@quiz.charwinnen.com";
const FROM_NAME = "Char Winnen Ed.D.";

const RED_VSL_URL = "https://quiz.charwinnen.com/red-alert-preview.html";
const YELLOW_VSL_URL = "https://quiz.charwinnen.com/yellow-alert-preview.html";
const GREEN_VSL_URL = "https://quiz.charwinnen.com/yellow-alert-preview.html";

interface ScoreData {
  firstName: string;
  email: string;
  totalScore: number;
  maxScore: number;
  digestiveScore: number;
  appetiteScore: number;
  gutScore: number;
  alertLevel: "red" | "yellow" | "green";
}

function scoreTable(data: ScoreData, alertEmoji: string, alertLabel: string) {
  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse; margin:24px 0; font-family:Arial,sans-serif; font-size:15px;">
      <tr>
        <td colspan="2" style="background:#2d5a27; color:#ffffff; font-weight:700; padding:10px 16px; font-size:16px;">
          Your Results Summary
        </td>
      </tr>
      <tr style="background:#f5f5f5;">
        <td style="padding:10px 16px; color:#444; border-bottom:1px solid #ddd;">Total Score</td>
        <td style="padding:10px 16px; font-weight:600; border-bottom:1px solid #ddd;">${data.totalScore} out of ${data.maxScore}</td>
      </tr>
      <tr>
        <td style="padding:10px 16px; color:#444; border-bottom:1px solid #ddd;">Alert Level</td>
        <td style="padding:10px 16px; font-weight:600; border-bottom:1px solid #ddd;">${alertEmoji} ${alertLabel}</td>
      </tr>
      <tr style="background:#f5f5f5;">
        <td style="padding:10px 16px; color:#444; border-bottom:1px solid #ddd;">Digestive Comfort</td>
        <td style="padding:10px 16px; font-weight:600; border-bottom:1px solid #ddd;">${data.digestiveScore} out of 18</td>
      </tr>
      <tr>
        <td style="padding:10px 16px; color:#444; border-bottom:1px solid #ddd;">Appetite &amp; Metabolism</td>
        <td style="padding:10px 16px; font-weight:600; border-bottom:1px solid #ddd;">${data.appetiteScore} out of 12</td>
      </tr>
      <tr style="background:#f5f5f5;">
        <td style="padding:10px 16px; color:#444;">Gut Health</td>
        <td style="padding:10px 16px; font-weight:600;">${data.gutScore} out of 27</td>
      </tr>
    </table>
  `;
}

function emailWrapper(body: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;max-width:600px;width:100%;">
        <tr>
          <td style="background:#2d5a27;padding:24px 32px;text-align:center;">
            <p style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">Char Winnen Ed.D.</p>
            <p style="margin:4px 0 0;color:#c8e6c9;font-size:14px;">Nutritionist &amp; Weight Loss Coach</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            ${body}
            <hr style="border:none;border-top:1px solid #eee;margin:32px 0;">
            <p style="font-size:11px;color:#999;line-height:1.6;">
              *These statements have not been evaluated by the Food and Drug Administration. These products are not intended to diagnose, treat, cure, or prevent any disease.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function ctaButton(url: string, label: string) {
  return `
    <div style="text-align:center;margin:28px 0;">
      <a href="${url}" style="background:#2d5a27;color:#ffffff;text-decoration:none;padding:16px 32px;border-radius:6px;font-size:17px;font-weight:700;display:inline-block;">
        ${label}
      </a>
    </div>
  `;
}

function buildRedAlertEmail(data: ScoreData): { subject: string; html: string } {
  const subject = `${data.firstName}, Your quiz results are ready — here's what they mean`;
  const html = emailWrapper(`
    <p style="font-size:16px;color:#222;line-height:1.7;">Hi ${data.firstName},</p>
    <p style="font-size:16px;color:#222;line-height:1.7;">
      Thank you for taking the Stubborn Belly Fat Quiz — I know it takes a little courage to answer those questions honestly.
    </p>
    <p style="font-size:16px;color:#222;line-height:1.7;">
      I've looked at your results, and I want to share them with you straight. No sugarcoating — because you deserve to know what's really going on.
    </p>
    ${scoreTable(data, "🔴", "Red Alert")}
    <p style="font-size:16px;color:#222;line-height:1.7;">
      Your score puts you in the Red Alert category — and I want you to hear this clearly:
    </p>
    <p style="font-size:18px;font-weight:700;color:#2d5a27;line-height:1.7;">This is not your fault.</p>
    <p style="font-size:16px;color:#222;line-height:1.7;">
      It's not your willpower. It's not your age. And it's definitely not because you haven't tried hard enough.
    </p>
    <p style="font-size:16px;color:#222;line-height:1.7;">
      What your results are telling me is that your gut is under a lot of stress right now. And when that happens, your body holds onto belly fat — especially around the middle — no matter what you eat or how much you exercise. It's like trying to drive with the parking brake on.
    </p>
    <p style="font-size:16px;color:#222;line-height:1.7;"><strong>The good news? This can turn around.</strong></p>
    <p style="font-size:16px;color:#222;line-height:1.7;">
      I put together a short video just for women in your situation. It explains what's happening in your body — in plain English, I promise — and walks you through a natural approach that's helping women just like you finally start losing the weight that's been stuck for years.
    </p>
    ${ctaButton(RED_VSL_URL, "Watch Your Personalized Video Now →")}
    <p style="font-size:16px;color:#222;line-height:1.7;">Please watch it soon. It will make a lot of things click.</p>
    <p style="font-size:16px;color:#222;line-height:1.7;">Warmly,<br><strong>Char</strong></p>
    <p style="font-size:14px;color:#555;line-height:1.7;font-style:italic;">
      P.S. Your results showed stress across all three areas — digestive comfort, appetite, and gut health. The video addresses all three, so don't skip around. 😊
    </p>
  `);
  return { subject, html };
}

function buildYellowAlertEmail(data: ScoreData): { subject: string; html: string } {
  const subject = `${data.firstName}, Your quiz results are here.`;
  const html = emailWrapper(`
    <p style="font-size:16px;color:#222;line-height:1.7;">Hi ${data.firstName},</p>
    <p style="font-size:16px;color:#222;line-height:1.7;">
      Thank you for taking the Stubborn Belly Fat Quiz — I'm really glad you did.
    </p>
    <p style="font-size:16px;color:#222;line-height:1.7;">Your results are in, and here's where you stand:</p>
    ${scoreTable(data, "🟡", "Yellow Alert")}
    <p style="font-size:16px;color:#222;line-height:1.7;">
      Yellow Alert means your gut health is starting to slip — not in crisis mode, but sending you some clear warning signals.
    </p>
    <p style="font-size:16px;color:#222;line-height:1.7;">
      You know the kind. Diets that work for a few weeks and then suddenly stop. Energy that crashes in the afternoon for no good reason. The scale that just sits there like it's glued down. Cravings that feel like they have a mind of their own.
    </p>
    <p style="font-size:16px;color:#222;line-height:1.7;">That's not a character flaw. That's your gut talking.</p>
    <p style="font-size:16px;color:#222;line-height:1.7;">
      Here's what I find really interesting about Yellow Alert: you caught this early. And that matters — a lot. Because the women I've seen turn things around fastest are usually the ones who took action before things got worse.
    </p>
    <p style="font-size:16px;color:#222;line-height:1.7;">
      I made a short video for women right where you are. It explains what's going on in your body and shows you a natural way to support your GLP-1 hormone levels — which is basically your body's own fat-burning signal. No shots, no medications, no crazy diet.
    </p>
    ${ctaButton(YELLOW_VSL_URL, "Watch Your Personalized Video Now →")}
    <p style="font-size:16px;color:#222;line-height:1.7;">I think you'll find it really eye-opening.</p>
    <p style="font-size:16px;color:#222;line-height:1.7;">Warmly,<br><strong>Char</strong></p>
    <p style="font-size:14px;color:#555;line-height:1.7;font-style:italic;">
      P.S. Small shifts in gut health can make a surprisingly big difference in how your body burns fat. The video shows you exactly where to start.
    </p>
  `);
  return { subject, html };
}

function buildGreenAlertEmail(data: ScoreData): { subject: string; html: string } {
  const subject = `${data.firstName}, Your quiz results are here.`;
  const html = emailWrapper(`
    <p style="font-size:16px;color:#222;line-height:1.7;">Hi ${data.firstName},</p>
    <p style="font-size:16px;color:#222;line-height:1.7;">
      Thank you for taking the Stubborn Belly Fat Quiz — your results made me smile.
    </p>
    ${scoreTable(data, "🟢", "Green Alert")}
    <p style="font-size:16px;color:#222;line-height:1.7;">
      Green Alert means your gut health is likely in a good range right now. You can probably manage your weight, keep cravings in check, and hold onto decent energy through the day. That's genuinely great.
    </p>
    <p style="font-size:16px;color:#222;line-height:1.7;"><strong>Here's the catch.</strong></p>
    <p style="font-size:16px;color:#222;line-height:1.7;">
      After 40, inflammation rises quietly — even in women doing everything right. Your body's fat-burning signals can start dropping before you notice. The scale creeps. Energy dips. A few stubborn pounds show up out of nowhere.
    </p>
    <p style="font-size:16px;color:#222;line-height:1.7;">
      Every woman I know who ended up frustrated with 30+ pounds to lose once had a score just like yours. She thought she had time.
    </p>
    <p style="font-size:16px;color:#222;line-height:1.7;">
      I made a short video for women right where you are — healthy now and wanting to stay that way.
    </p>
    ${ctaButton(GREEN_VSL_URL, "Watch Your Personalized Video Now →")}
    <p style="font-size:16px;color:#222;line-height:1.7;">You're in the best possible position. Let's keep you there.</p>
    <p style="font-size:16px;color:#222;line-height:1.7;">Warmly,<br><strong>Char</strong></p>
    <p style="font-size:14px;color:#555;line-height:1.7;font-style:italic;">
      P.S. Prevention is always easier than repair. The video shows you exactly what I personally do to stay ahead of the curve.
    </p>
  `);
  return { subject, html };
}

export async function sendResultsEmail(data: ScoreData): Promise<boolean> {
  try {
    let emailContent: { subject: string; html: string };

    if (data.alertLevel === "red") {
      emailContent = buildRedAlertEmail(data);
    } else if (data.alertLevel === "yellow") {
      emailContent = buildYellowAlertEmail(data);
    } else {
      emailContent = buildGreenAlertEmail(data);
    }

    const result = await resend.emails.send({
      from: `${FROM_NAME} <${FROM_ADDRESS}>`,
      to: data.email,
      subject: emailContent.subject,
      html: emailContent.html,
    });

    if (result.error) {
      console.error("[Resend] Error sending email:", result.error);
      return false;
    }

    console.log("[Resend] Email sent successfully to", data.email, "id:", result.data?.id);
    return true;
  } catch (err) {
    console.error("[Resend] Exception sending email:", err);
    return false;
  }
}
