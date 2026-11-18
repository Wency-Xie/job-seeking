# Support matrix

Updated: 2026-11-19.

“Planned” means the platform is in the first adapter scope. “Verified” requires a real page, a recorded extension version, field-by-field write/readback evidence, and confirmation that no application was submitted.

| Platform | Job capture | Application form assistance | Current evidence |
| --- | --- | --- | --- |
| Beisen / `*.zhiye.com` | Typed contract added; selected sites tested | Partial live-page evidence | Capture `v0.5.4` normalizes platform and job fields. On 2026-11-19, Safari loaded the Hanyao job page review panel and directly identified the missing company as the reason import was disabled; no job was saved. Sync `v0.6.0` adds a typed confirmed-profile boundary, but form-filling support still needs platform-specific readback. |
| WuXi Biologics / `job.wuxibiologics.com.cn` | Dedicated extraction rule; Chrome and Edge verified | Not in the first adapter scope | On 2026-11-19, capture `v0.5.2` read the legal company, exact title, Shanghai location, 2027 recruiting batch, stable UUID, canonical URL, and a 1,098-character JD from the real job page in Chrome 157 and Edge 157. Both browsers displayed four required and three optional fields; clearing the company, shortening the JD, and changing the source to HTTP produced three field-specific errors and disabled import. Restoring valid values re-enabled import. No job was saved. |
| Moka / `app.mokahr.com` | Typed contract added; extraction rules present | Not yet verified | Capture `v0.5.4` normalizes extracted fields. A previous form version produced an incorrect gender-field mapping; fixes still require live-page readback. |
| Moseeker / `*.moseeker.com` | Typed contract added; extraction rules present | Not yet verified | Capture `v0.5.4` normalizes extracted fields. A capture rule is not evidence that application-form assistance works; a real application form remains to be tested. |
| Zhaopin | Not in the first adapter scope | Not in the first adapter scope | Zhaopin is a separate platform from Beisen and requires its own adapter and acceptance record. |

## Acceptance record

Every live-site validation should record:

- company, job, URL, and recruiting-system identity;
- extension version and browser;
- original value and readback value for each tested field;
- unmatched controls and any pre-existing page content;
- whether attachments, draft saving, or submission were intentionally excluded.

Aggregate fill counts and synthetic tests do not replace visible page readback.

## Browser compatibility

The job-capture extension uses one Manifest V3 source tree and one `v0.5.4` ZIP for Safari, Chrome, and Edge. Chrome and Edge download the same ZIP. Workspace settings use `browser.storage.local` in Safari and fall back to `chrome.storage.local` in Chrome and Edge.

| Browser | Developer-mode installation | Current evidence |
| --- | --- | --- |
| Safari | In Safari's Developer settings, allow unsigned extensions and add the unpacked directory as a temporary extension | Safari loaded `v0.5.4` on the Hanyao job page on 2026-11-19. The review panel passed workspace initialization through the Safari storage namespace and showed one direct import-blocking reason for the missing company. The final one-message layout still requires a reload of the temporary extension directory after source replacement. No job was saved. |
| Chrome | Load unpacked from `chrome://extensions` | Chrome 157 loaded `v0.5.4` in an isolated profile, used the Chrome storage fallback, showed one import-blocking reason for a missing company, and enabled import after the company was filled. The earlier `v0.5.2` real WuXi Biologics extraction record remains valid. No job was saved. |
| Edge | Load unpacked from `edge://extensions` | Edge 157 loaded `v0.5.4` in an isolated profile and passed the same storage fallback and one-message validation flow without extension console errors. The earlier `v0.5.2` real WuXi Biologics extraction record remains valid. No job was saved. |

## Workspace binding

One extension installation binds to one JobSeekingOS workspace. It defaults to `http://127.0.0.1:4173`. The user can open the extension settings once and replace that address with a Railway HTTPS origin; remote HTTP origins and embedded credentials are rejected. The extension stores only the workspace origin and does not store account credentials. A shared deployment still needs its own login and per-user data isolation.

## Release gate

Job-capture releases follow this order: focused source tests, production build, read-only real-page acceptance against the current 4173 workbench, then publication of the accepted source and ZIP. Saving a captured job or filling a real application form is a separate, user-controlled action and is not part of a version promotion.
