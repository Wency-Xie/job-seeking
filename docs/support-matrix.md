# Support matrix

Updated: 2026-10-01.

“Planned” means the platform is in the first adapter scope. “Verified” requires a real page, a recorded extension version, field-by-field write/readback evidence, and confirmation that no application was submitted.

| Platform | Job capture | Application form assistance | Current evidence |
| --- | --- | --- | --- |
| Beisen / `*.zhiye.com` | Typed contract added; selected sites tested | Partial live-page evidence | Capture `v0.4.0` normalizes platform and job fields. Sync `v0.6.0` adds a typed confirmed-profile boundary, but WuXi AppTec and BGI still have only limited form readback; BGI search-box exclusion needs final live retest. |
| Moka / `app.mokahr.com` | Typed contract added; extraction rules present | Not yet verified | Capture `v0.4.0` normalizes extracted fields. A previous form version produced an incorrect gender-field mapping; fixes still require live-page readback. |
| Moseeker / `*.moseeker.com` | Typed contract added; extraction rules present | Not yet verified | Capture `v0.4.0` normalizes extracted fields. A capture rule is not evidence that application-form assistance works; a real application form remains to be tested. |
| Zhaopin | Not in the first adapter scope | Not in the first adapter scope | Zhaopin is a separate platform from Beisen and requires its own adapter and acceptance record. |

## Acceptance record

Every live-site validation should record:

- company, job, URL, and recruiting-system identity;
- extension version and browser;
- original value and readback value for each tested field;
- unmatched controls and any pre-existing page content;
- whether attachments, draft saving, or submission were intentionally excluded.

Aggregate fill counts and synthetic tests do not replace visible page readback.

## Release gate

Both extensions follow the same order: `4174 development test -> 4173 read-only real-data acceptance -> publish the accepted files through the 4173 formal workbench`. Saving a captured job or filling a real application form is a separate, user-controlled action and is not part of a version promotion.
