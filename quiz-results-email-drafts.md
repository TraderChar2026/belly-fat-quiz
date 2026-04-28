# Quiz Results Email Drafts

These are draft emails to be sent to quiz takers immediately after submission.
Each tier has its own subject line and body. Placeholders in [brackets] are filled
in dynamically at send time. Please edit the copy as needed before implementation.

---

## RED ALERT (Score 23–54)

**Subject:** [First Name], your quiz results are in — this is urgent

**Body:**

Hi [First Name],

Thank you for taking the Stubborn Belly Fat Quiz.

I have reviewed your results, and I want to be honest with you — your score places you in the **Red Alert** category.

**Your Results Summary**

| | |
|---|---|
| **Total Score** | [Total Score] out of 51 |
| **Alert Level** | Red Alert |
| **Digestive Comfort** | [Digestive Score] out of 18 |
| **Appetite & Metabolism** | [Appetite Score] out of 12 |
| **Gut Health** | [Gut Score] out of 27 |

This means your gut health is significantly disrupted, and it is very likely the reason stubborn belly fat keeps coming back no matter what you try. This is not about willpower. It is not your age. It is your hormones and your gut — and they are working against you right now.

The good news? This is reversible.

I have put together a short video specifically for women in your situation that explains exactly what is happening in your body and the natural GLP-1 boosting protocol that is helping women just like you finally lose the weight — without medications or shots.

**[Watch Your Personalised Video Now →]**

Please watch it as soon as possible — it explains everything.

Warmly,
Char

P.S. Your results showed disruption across your digestive comfort, appetite regulation, and gut health. The video addresses all three.

---

## YELLOW ALERT (Score 12–22)

**Subject:** [First Name], your quiz results — here is what they mean

**Body:**

Hi [First Name],

Thank you for taking the Stubborn Belly Fat Quiz.

Your results place you in the **Yellow Alert** category.

**Your Results Summary**

| | |
|---|---|
| **Total Score** | [Total Score] out of 51 |
| **Alert Level** | Yellow Alert |
| **Digestive Comfort** | [Digestive Score] out of 18 |
| **Appetite & Metabolism** | [Appetite Score] out of 12 |
| **Gut Health** | [Gut Score] out of 27 |

This tells me that your gut health is moderately disrupted — enough to be slowing your metabolism, triggering cravings, and making it much harder to lose belly fat. You may have noticed that diets work for a while and then stop, or that your energy crashes in the afternoon, or that the scale just will not budge.

That is not a coincidence. It is your gut and your GLP-1 hormone levels.

The great news is that you are not in the red zone yet — and with the right approach, you can turn this around faster than you think.

I have made a short video for women in your exact situation that walks you through what is happening and how to naturally boost your GLP-1 levels to unlock fat loss — no medications, no shots.

**[Watch Your Personalised Video Now →]**

I think you will find it very eye-opening.

Warmly,
Char

P.S. Small changes to your gut health can make a dramatic difference to how your body burns fat. The video shows you exactly where to start.

---

## GREEN ALERT (Score 0–11)

**Subject:** [First Name], great news — your quiz results are inside

**Body:**

Hi [First Name],

Thank you for taking the Stubborn Belly Fat Quiz.

Your results place you in the **Green Alert** category — which means your gut health indicators are relatively strong. That is genuinely good news, and it tells me you have some solid foundations to build on.

**Your Results Summary**

| | |
|---|---|
| **Total Score** | [Total Score] out of 51 |
| **Alert Level** | Green Alert |
| **Digestive Comfort** | [Digestive Score] out of 18 |
| **Appetite & Metabolism** | [Appetite Score] out of 12 |
| **Gut Health** | [Gut Score] out of 27 |

That said, if you are still struggling to lose stubborn belly fat, it likely means there is one specific area that needs attention. Even small imbalances in your GLP-1 levels can make fat loss feel impossible — even when everything else looks fine.

I have put together a short video that explains how to naturally optimise your GLP-1 levels so your body can finally burn fat the way it is supposed to — without medications or shots.

**[Watch Your Personalised Video Now →]**

You are closer than you think.

Warmly,
Char

P.S. Maintaining your gut health while addressing your GLP-1 levels is the key to losing those last stubborn pounds. The video explains exactly how.

---

## Notes for Implementation

- **[First Name]** — first name from the quiz contact form
- **[Total Score]** — overall quiz score (0–51)
- **[Digestive Score]** — Digestive Comfort category score (max 18)
- **[Appetite Score]** — Appetite & Metabolism category score (max 12)
- **[Gut Score]** — Gut Health category score (max 27)
- **[Watch Your Personalised Video Now →]** — links to the VSL page for that tier:
  - Red Alert → `/red-alert-preview.html` (with session/UTM params preserved)
  - Yellow Alert → `/yellow-alert-preview.html` (with session/UTM params preserved)
  - Green Alert → destination TBD (please confirm)
- **From address** — needs to be a verified domain in Resend (e.g. `char@charwinnen.com`)
- **Resend API key** — required before implementation can begin
