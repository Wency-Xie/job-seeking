# Job Seeking Toolkit

`job-seeking` is the public source repository for the experimental JobSeekingOS assistants and browser extensions maintained by [Wency-Xie](https://github.com/Wency-Xie).

The repository separates browser-side collection and form assistance from evidence-based Codex Skills. Nothing in this repository submits an application, changes an application status, contacts a recruiter, or accepts an offer on the user's behalf.

## Repository layout

```text
skills/
  matcher-assistant/             Four-layer JD analysis and evidence matching
  salary-negotiation-assistant/  Compensation research and negotiation preparation
extensions/
  job-capture/                   Browser extension for collecting job descriptions
  application-sync/              Browser extension for assisted form filling
integrations/
  jobseekingos/                  Integration contract for pending proposals
docs/
  support-matrix.md              Verified support versus planned coverage
  privacy-and-safety.md          Data and approval boundaries
```

## Languages

- The browser extensions use JavaScript because Safari, Chrome, and Edge execute extension UI, content, and background scripts in JavaScript. TypeScript may be introduced later, but browser packages are still compiled to JavaScript.
- The Skills use Markdown instructions plus Python for deterministic validation, scoring, and `proposal.json` generation.
- JobSeekingOS itself is not included in this public repository. The `integrations/` directory documents only the file contract required to review Skill proposals safely.

## Current status

All components are experimental. A source rule or passing synthetic test does not establish support for a live recruiting site. Consult [the support matrix](docs/support-matrix.md) before relying on an adapter.

The two Skills are `v0.1.0` test versions. They work on one job at a time, generate reviewable proposals, and do not directly modify application intent or workflow state.

## Validation

Run the Skill tests from the repository root:

```bash
python3 -m unittest discover -s skills/matcher-assistant/tests -p 'test_*.py'
python3 -m unittest discover -s skills/salary-negotiation-assistant/tests -p 'test_*.py'
```

Browser-extension support requires live-page readback in addition to source tests. No extension should upload attachments, save a draft, or submit an application during validation unless the user explicitly requests that action.

