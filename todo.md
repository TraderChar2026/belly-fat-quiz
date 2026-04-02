# Stubborn Belly Fat Quiz — TODO

- [x] Database schema: quiz_submissions table with answers JSON, scores, contact info, CRM tag
- [x] tRPC procedure: submitQuiz (upsert GHL contact + apply tag + save to DB)
- [x] Quiz data: 17 questions across 3 categories with hidden point values
- [x] Intro page with compelling CTA
- [x] Single-question-per-page flow with progress bar
- [x] Answer selection with radio-style UI (no point values shown)
- [x] Back/Next navigation between questions
- [x] Contact form (name, email, optional phone) after Q17
- [x] Results page: total score, color-coded alert badge, category breakdown
- [x] GoHighLevel CRM: upsert contact + apply yellow_alert / red_alert tag
- [x] Elegant design system: warm neutrals, serif headings, smooth transitions
- [x] Responsive layout for mobile and desktop
- [x] Vitest tests for scoring logic and CRM tag assignment
- [x] Fix CRM tags to use correct values: "Red Alert", "Yellow Alert", "Green Alert" (all three levels, proper casing)
