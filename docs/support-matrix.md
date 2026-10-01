# Support matrix

Updated: 2026-10-01.

“Planned” means the platform is in the first adapter scope. “Verified” requires a real page, a recorded extension version, field-by-field write/readback evidence, and confirmation that no application was submitted.

| Platform | Job capture | Application form assistance | Current evidence |
| --- | --- | --- | --- |
| Beisen / `*.zhiye.com` | Planned; selected sites tested | Partial live-page evidence | WuXi AppTec and BGI have limited field readback. BGI `v0.5.10` search-box exclusion still needs final live retest. |
| Moka / `app.mokahr.com` | Planned; extraction rules present | Not yet verified | A previous version produced an incorrect gender-field mapping. Candidate fixes still require live-page readback. |
| Moseeker / `*.moseeker.com` | Planned; extraction rules present | Not yet verified | A capture rule is not evidence that application-form assistance works. A real application form remains to be tested. |
| Zhaopin | Not in the first adapter scope | Not in the first adapter scope | Zhaopin is a separate platform from Beisen and requires its own adapter and acceptance record. |

## Acceptance record

Every live-site validation should record:

- company, job, URL, and recruiting-system identity;
- extension version and browser;
- original value and readback value for each tested field;
- unmatched controls and any pre-existing page content;
- whether attachments, draft saving, or submission were intentionally excluded.

Aggregate fill counts and synthetic tests do not replace visible page readback.

