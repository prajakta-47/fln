# SRS Delta — v0.1 "Teacher MVP"

**Base version:** none (first release)
**Status:** Draft
**Parent document:** SRS_FLN_v-final.md (§ references below point to the full spec)
**Revision note (rev. 2):** This version was revised a second time to split it into a working *shell* and a follow-on *wiring* pass. Curriculum content/loading and the worksheet generation pipeline (including SVG assets) are no longer both required for v0.1 to ship — the "Generate Worksheets" button exists in the UI from day one but stays non-functional until curriculum and the worksheet generator are added in a fast-follow update. Manual level updates are removed entirely (they don't return until the AI evaluation engine exists, v0.5). See §8 for the full list of what changed and why.

*(Revision note, rev. 1, retained for history: an earlier draft deferred ICR to v0.5 and used manual per-question marking, a flat 1–5 `level` field, and a small categorized SVG library. That revision moved ICR ingestion and the real level/sublevel structure into v0.1 from day one. Rev. 2, above, does not touch either of those decisions.)*

---

## 1. Version Goal
Prove the core loop — a teacher logs in, manages a class, and sheets get scanned and scored — before any of the surrounding governance, hierarchy, or AI-evaluation-narrative machinery exists. The AI-personalized worksheet generation piece (curriculum + generator + SVG assets) ships as UI scaffolding in this version and becomes functional in a fast-follow update once curriculum content and the generator are ready, so login/roster/ICR/scoring aren't blocked waiting on it.

## 2. What's New in This Version
- **Single role: Teacher.** No Superadmin/Admin/District Admin/Block Admin/School/Volunteer yet. Teacher accounts are seeded directly in the database (a script, not an in-app flow) — no account-creation UI at all in this version.
- **App header.** Every screen (login and dashboard) carries a fixed header reading **"FLN Assessment Portal"** — the first piece of consistent branding in the product.
- **Login.** Email + password, JWT session (7-day expiry). No role dropdown (only one role exists, so this is trivial but the pattern is set for later).
- **Class roster.** Teacher can add/view/remove students in their own class: Name, Student ID (auto-generated, unique), Class/Grade. No Aadhar/Birth Certificate field yet — that's a v0.6 requirement.
- **Curriculum — deferred to a fast-follow update.** The full level/sublevel hierarchy (59 levels, each with sublevels) is *not* built or loaded in this initial v0.1 release. `Students.level`/`sublevel` exist as fields (defaulted at creation) but nothing reads or writes against real curriculum content yet. Curriculum loading is added in the follow-up update described in §2's "Generate Worksheets" note below, once content authoring has actually produced levels to load.
- **Worksheet generation — button present, not yet functional.** The "Generate Worksheets" action is visible on the Teacher dashboard from day one (so the workflow shape is real and testable), but clicking it returns a "not available yet" state in this initial release. It becomes functional only once both curriculum (above) and the worksheet generator pipeline exist — at which point this SRS's own acceptance criteria (§6) for generation start to apply.
- **SVG assets — arrive with the generator, not before.** The single consolidated SVG asset file is no longer a standalone, earlier build step. It is built and wired in together with the worksheet generator in the same follow-up update, since neither is independently useful without the other. When it does ship: if a referenced asset ID is missing from the file, generation fails with a clear error — no same-category substitution logic yet (that's v0.9, R-9).
- **Rendering.** HTML → A4 PDF export, one PDF per student. Ships as part of the same follow-up update as generation (a PDF has nothing to render until a worksheet exists). No combined batch PDF option yet.
- **Answer capture via ICR.** Dedicated ICR scanner hardware/software produces structured JSON per student (e.g. `{"Q1":"A","Q2":"5"}`), ingested directly by the platform — no manual marking step at all, not even as a fallback. This does **not** depend on worksheet generation being functional yet: ICR ingestion, storage, and status tracking ship in the initial release and can be exercised against a manually-seeded answer key if needed for testing. No scan-history UI polish yet (basic ingest + status only; the richer Scan Interface view is still v0.5).
- **Scoring (basic, no AI narrative).** Submitted ICR answers are compared against the stored answer key programmatically → `correct/total` per student. No AI-generated narrative report, no strengths/weaknesses breakdown, no next-level recommendation engine yet — those are v0.5's 3-stage evaluation engine.
- **No manual level updates.** Level/sublevel bumping by the Teacher is removed from this version entirely — it is *not* a v0.1 feature. Levels only start changing once the AI evaluation engine exists and drives that change automatically (v0.5); there is no manual stand-in for it in the meantime. A student's level is set once at creation and stays fixed until v0.5 ships.
- **No exam-date/scheduling by Teacher.** There is no assessment-calendar or exam-date-setting concept in this version — the Teacher does not choose or set an exam date anywhere in v0.1. Scheduling capability first appears in v0.4 as part of the 3-cycle assessment calendar, and even then it belongs to School, not Teacher — the Teacher never sets an exam date at any version.
- **Teacher dashboard.** One screen, under the "FLN Assessment Portal" header: class roster table (Name, Student ID, Level, Sublevel, Last Worksheet Date, Last Score) + a "Generate Worksheets" action (inert until the fast-follow update lands) + per-student scan-status view (no manual "Enter Answers" action — ICR is the only path in, and no manual level-edit control anywhere on this screen).

## 3. Explicitly Out of Scope for v0.1
- Any role other than Teacher (School, Block Admin, Volunteer, District Admin, Admin, Superadmin) — v0.3, v0.6, v0.7.
- Three-cycle assessment calendar (Baseline/Mid/End) and syllabus-coverage rules — v0.4. Exam-date-setting itself is never a Teacher capability at any version; it belongs to School (from v0.4) and higher tiers thereafter.
- Curriculum content and the curriculum loader — deferred to the fast-follow update immediately after this release (still v0.1 in spirit, not a numbered future version, but explicitly not in the initial cut).
- A working worksheet-generation pipeline and SVG asset resolution — same fast-follow update as curriculum, immediately after the initial release; the button exists now, the pipeline behind it does not.
- Manual level/sublevel updates of any kind — removed from v0.1 entirely; the first level-changing mechanism is the AI evaluation engine in v0.5.
- Generation locks of any kind (only one role can generate, so no lock is needed yet) — first lock arrives v0.3.
- The polished Scan Interface (connect-scanner status screen, full scan history, reprocess action) and the full 3-stage AI evaluation engine (classification, narrative report, next-level recommendation) — v0.5. v0.1 only does raw ICR ingestion + answer-key comparison.
- Full competency/topic/subtopic/difficulty tagging on questions — v0.5 (moot until curriculum itself lands in the fast-follow update).
- Aadhar/Birth Certificate mandatory ID + masking — v0.6.
- Delayed-attempt/defaulter tracking — v0.8 (moot until v0.4 introduces windows/timing at all).
- Ticketing system, announcements, certification, level auto-flag — v0.8.
- Public landing/home page — v0.7.
- Logbook/audit trail, SVG substitution logging — v0.9.
- Formal NFR hardening (security, performance, reliability targets, retry-with-backoff) — v1.0.

## 4. Data Model (this version only)
| Collection | Fields |
|---|---|
| **Users** | `_id`, `email`, `passwordHash`, `role` (fixed: `"teacher"`) |
| **Students** | `_id`, `studentId` (unique), `name`, `class`, `teacherId`, `level` (int, 1–59, set once at creation, not user-editable), `sublevel` (int, default 1, not user-editable) |
| **Curriculum** | *not implemented in the initial release* — schema/loader land with the fast-follow update once content exists |
| **Worksheets** | `_id`, `studentId`, `level`, `sublevel`, `worksheetJson`, `pdfPath`, `createdAt` — collection exists but stays empty until the generator ships |
| **ScanBatches** | `_id`, `classId`, `rawIcrJson`, `status` (`received\|processed\|error`), `receivedAt` |
| **AnswerSubmissions** | `_id`, `worksheetId`, `studentId`, `icrAnswers` (from ScanBatch), `score`, `evaluatedAt` |

## 5. API (this version only)
```
POST /api/auth/login

GET    /api/students              (teacher's own class only)
POST   /api/students
DELETE /api/students/:id

POST /api/worksheets/generate-class     (batch, current teacher's class)
  → in the initial release, returns 501/"not available yet"; becomes functional
    once curriculum + generator ship in the fast-follow update
GET  /api/worksheets/student/:studentId

POST /api/scan/upload                   (ICR structured JSON, per class batch)
GET  /api/scan/:id/status

GET  /api/answers/student/:studentId    (score, once ICR-derived comparison runs)
```
`POST /api/students/:id/level` (manual level update) is **removed** from this version's API surface. It does not exist until it's reintroduced, automatically-driven, as part of v0.5's evaluation engine.

## 6. Acceptance Criteria (v0.1)
- [ ] Every screen displays the "FLN Assessment Portal" header.
- [ ] Teacher can log in with seeded credentials and reach their dashboard.
- [ ] Teacher can add/view/remove students in their own class only.
- [ ] The "Generate Worksheets" action is visible on the dashboard and clearly communicates it isn't available yet (initial release); once the fast-follow update lands, it produces one valid worksheet per student using each student's level + sublevel, each rendered as a print-ready A4 PDF with all SVG assets resolved from the single consolidated asset file, with invalid AI output regenerated once automatically before surfacing an error.
- [ ] Structured ICR JSON can be uploaded and is correctly linked to the right student and worksheet — no manual answer-marking path exists anywhere in this version.
- [ ] System computes and displays a `correct/total` score per student from the ICR-derived comparison.
- [ ] There is no way, anywhere in the UI or API, for a Teacher to manually change a student's level or sublevel.
- [ ] A teacher cannot see or affect another teacher's students (basic per-teacher data isolation, enforced at the API level).

## 7. Why This Slice
This is deliberately the smallest version that gets a Teacher logged in, managing a real class, and capturing/scoring real answers via ICR — without waiting on the two hardest, most externally-dependent pieces (curriculum content authoring, and a working AI worksheet generator) to be ready first. Splitting "ship the shell" from "wire in generation" means login, roster, and the ICR/scoring loop can be built, tested, and even used for scanning-pipeline validation before a single worksheet has ever been generated. Every later version still adds either (a) a new role sitting above/beside Teacher, or (b) a piece of automation layered on top of what's here — this revision just changes *when within v0.1* the generation piece itself lands, not what comes after it.

## 8. What Changed From the Original v0.1 Draft
An earlier draft of this document (rev. 0) deferred ICR to v0.5 and used manual per-question marking, a flat 1–5 `level` field, and a small categorized SVG library. Rev. 1 (documented above) moved ICR to day one and adopted the real 1–59 `level` + `sublevel` structure. This revision (rev. 2) makes a further set of changes, based on direct input:
- **Curriculum content and loading are no longer part of the initial v0.1 cut.** They land in a fast-follow update once content authoring has actually produced levels — engineering doesn't build the loader against content that doesn't exist yet.
- **The worksheet generator and SVG asset resolution move together, and later.** Both ship in that same fast-follow update, not as separate earlier build steps. The "Generate Worksheets" button is present in the UI from day one, but is inert until that update lands — this keeps the workflow shape visible and testable without blocking the rest of the release on it.
- **Manual level updates are removed entirely**, not just deferred. Earlier drafts had the Teacher manually bump a student's level after reviewing a score; that stand-in is gone. The first time a student's level changes at all is v0.5, driven automatically by the AI evaluation engine — there is no manual mechanism at any point before that.
- **No exam-date/scheduling responsibility for the Teacher exists in v0.1** — confirmed explicitly, to head off any assumption that generation is tied to a scheduled date before v0.4 introduces the assessment calendar.
- **A persistent "FLN Assessment Portal" header** is added as a baseline UI requirement from the very first screen.
