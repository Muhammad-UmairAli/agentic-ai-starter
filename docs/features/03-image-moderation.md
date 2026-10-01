# 03 · Image moderation on upload

## 1. Purpose
Block inappropriate images (nudity, violence, etc.) before they appear as avatars, group logos, announcement images or chat attachments.

## 2. Status in this sample
**Spec only.** It depends on your media vendor. The sample has no upload pipeline.

## 3. User flow
1. The user picks an image.
2. The client gets a **signed upload** from the server and uploads directly to the media service.
3. The media service runs moderation as part of the upload.
4. If the image is rejected, the client shows "This image can't be used because it may contain inappropriate content." and nothing is saved.
5. If it is approved, or moderation is pending (see R4), the URL is saved as normal.

## 4. Functional rules
- **R1 Enforce on the vendor side**, in the account's **default upload preset** or upload policy, not as a client-supplied parameter. A client-side parameter can be removed. A server-side default can't.
- **R2** The server signs uploads (timestamp and folder only). The client never holds the API secret. The folder is fixed per signature (sign the server's default and ignore the client's folder).
- **R3** One shared upload helper checks the moderation result for **every** surface: profile and avatar, group logo, onboarding (including public pre-auth onboarding signatures), group photo, announcement images, chat images.
- **R4** Only an explicit `rejected` status fails the upload. A missing moderation field means moderation isn't configured, so the upload proceeds as before. Decide whether `pending` (asynchronous review) should hide the image until it is approved.
- **R5** Typed error: `ImageRejectedError`, so every caller can show the specific message instead of a generic "upload failed".
- **R6** Uploads that go to a different store (for example bug-report screenshots in object storage) are **not** covered. Either route them through the same moderation or restrict who can see them.

## 5. Data contracts
- `GET /media/signature` (authenticated) returns `{ signature, timestamp, apiKey, cloudName, folder }`. There is a separate signature endpoint for public onboarding with tighter limits.
- The upload response includes `moderation: [{ kind, status: "approved" | "rejected" | "pending" }]` (vendor-specific shape).

## 6. AI design
A vendor ML add-on (for example AWS Rekognition through the media vendor), with no LLM. **Alternative:** server-side classification with a vision model for richer categories. That adds latency and cost per upload.

## 7. Security and privacy
- Never ship the vendor secret to the client.
- Images of minors: confirm the vendor's data-processing terms and region.
- Log the rejection event and surface, not the image.

## 8. Failure modes
| Failure | Behavior |
|---|---|
| Rejected | Specific message; nothing saved |
| Signature fetch fails | "Failed to get upload signature"; retry |
| Vendor outage | Generic upload error. **Decision:** fail closed for public surfaces |

## 9. Configuration
Vendor upload preset with moderation enabled. Allowed file types and size per surface.

## 10. Acceptance checks
- A known-unsafe test image is rejected on every listed surface.
- A safe image passes.
- Removing client parameters doesn't bypass moderation (R1).

## 11. Rebuild checklist
1. Enable moderation in the vendor's default preset or policy.
2. Add the server signing endpoint.
3. Write one client upload helper with a `throwIfRejected` step.
4. Use the helper on every upload call site.
5. Add the typed error and message, then test with known images.

## 12. Pitfalls seen in the source system
- An earlier design passed the moderation flag as a signed upload parameter from the client, which a modified client could drop. It moved to the vendor's default preset.
- Bug-report screenshots used a separate storage path with no moderation.
