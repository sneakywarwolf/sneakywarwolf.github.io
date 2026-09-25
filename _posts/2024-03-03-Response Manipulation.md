---
title: "Response Manipulation: Bypassing Client-Side Trust Decisions"
author: nirmal
date: 2024-03-03 16:35:00 +0530
categories: [Security, VAPT]
tags: [Testing, Response-Manipulation, Authentication, Burp Suite]
pin: false
description: How response manipulation works in web and mobile testing, why it succeeds, how to test for it with Burp Suite, how to rate it, and how to fix the root cause on the server.
image:
  path: /assets/img/posts/response-manipulation.jpg
  alt: Response Manipulation
---

## TL;DR

Response manipulation is a testing technique, not a vulnerability class by itself. The tester intercepts a server response in a proxy and changes it (`"success": false` → `true`, `403` → `200`, `"role": "user"` → `"admin"`) to see whether the **client** is the only thing enforcing a security decision.

- If the client proceeds **but the server rejects the next request**, the change is cosmetic. It is not a finding, or at most an informational note.
- If the client proceeds **and the server accepts the next request**, the real weakness is that the server does not enforce state or authorisation. That is the finding: typically CWE-602 (Client-Side Enforcement of Server-Side Security) or a broken authentication/authorisation issue.

The rest of this post covers where it shows up, how to test it, how to avoid over-reporting it, and how to fix it.

## Why it works

Single-page apps and mobile clients often make security-relevant decisions in client code:

```text
POST /api/otp/verify      →  {"verified": false}
client:  if (resp.verified) navigate("/dashboard") else showError()
```

The response is data that the client trusts. Anyone who controls the device or the proxy between the client and the server controls that data. The tester's question is not whether the UI can be fooled (it always can) but **whether the server re-checks the decision on every subsequent request**.

## Where to look

| Flow | Client-side decision typically made on | What the server must enforce |
|---|---|---|
| OTP / 2FA verification | `verified`, `status`, HTTP status code | Session is only elevated after a server-validated OTP |
| Login | `success`, `token` presence | Token is only issued for valid credentials |
| Password reset | `valid_token`, redirect target | Reset only accepted with a valid, unexpired, single-use token |
| Role / feature gating | `role`, `isAdmin`, `features[]` | Every privileged endpoint checks authorisation server-side |
| Payment / checkout | `payment_status`, `amount` | Order state only changes on verified payment-provider callback |
| Subscription / licence checks | `plan`, `expired` | Premium endpoints check entitlement server-side |
| Mobile root/jailbreak or version checks | `allowed`, `min_version` | Treat as hardening only; never as a security boundary |

## Testing methodology (Burp Suite)

1. **Map the flow.** Complete it once legitimately and record every request. Note which request the server uses to change state (session elevation, token issue, order status).
2. **Fail it deliberately.** For example, submit a wrong OTP and capture the failure response.
3. **Intercept and modify the response.** In Burp: *Proxy → Options → Intercept Server Responses*, or right-click the request → *Do intercept → Response to this request*. Change the failure indicators to the values from the successful run:
   - body flags (`false` → `true`, `"FAILED"` → `"SUCCESS"`)
   - HTTP status (`401`/`403` → `200`)
   - missing fields the client expects (copy a token or object shape from the legitimate run)
4. **Observe the client.** Does the UI move to the next step?
5. **Validate server-side impact. This step decides whether there is a finding.** Replay the *next* request (the one that reads protected data or performs the privileged action) with the session you have now. Check whether the server returns protected data or performs the action.
6. **Confirm with a clean session.** Repeat from a fresh session, without any legitimately obtained tokens, to rule out state carried over from step 1.

### Illustrative example

The flow below is **generic and simplified for explanation**. It is not taken from a specific engagement.

```http
POST /api/v1/otp/verify HTTP/1.1
Host: app.example
Content-Type: application/json
Cookie: session=abc123

{"otp":"000000"}
```

Original response:

```http
HTTP/1.1 200 OK
Content-Type: application/json

{"verified":false,"message":"Invalid OTP"}
```

Modified in Burp before it reaches the client:

```http
HTTP/1.1 200 OK
Content-Type: application/json

{"verified":true,"message":"OTP verified"}
```

The client navigates to `/dashboard`. The decisive check is the next request:

```http
GET /api/v1/account/profile HTTP/1.1
Host: app.example
Cookie: session=abc123
```

- `401`/`403`, or a redirect back to OTP → the server enforces the step. **No finding**; at most note that the client relies on the response flag.
- `200` with account data → the session was never required to pass OTP server-side. **Finding: 2FA bypass**. The root cause is missing server-side state enforcement, not the response itself.

## Rating it without inflating severity

Rate the server-side weakness you proved in step 5, not the response edit.

| Observed result | Classification | Typical severity driver |
|---|---|---|
| UI changes, server rejects the next request | Not a vulnerability; informational at most | None |
| Hidden UI elements shown, but the endpoints enforce authorisation | Information disclosure (UI/feature names) or informational | Sensitivity of what the UI reveals |
| Next step succeeds and bypasses OTP/2FA | Broken authentication (CWE-602 / CWE-603) | Needs the first factor already; impact is account takeover when combined with leaked credentials |
| Privileged endpoint accepts the request after a role flag is flipped | Broken access control / privilege escalation | Privilege gained and data or functions exposed |
| Order or payment state changes without verified payment | Business logic flaw | Direct financial impact |

Also consider how the attack starts. Response manipulation needs the attacker to control the client or their own traffic. For account-takeover scenarios that means the attacker already has the first factor (for example, the password). That precondition belongs in the CVSS vector (Privileges Required, Attack Complexity) and in the written attack scenario.

## Remediation

Fix it on the server. Client-side changes do not fix it.

1. **Server-side state machine.** Store the authentication stage in the server-side session (for example, `password_ok` → `otp_ok`). Every protected endpoint checks for the final stage, not for a client-sent flag.
2. **Issue credentials only after success.** Do not issue the fully privileged session or token until the server has validated every factor. A pre-2FA session should only be able to call the OTP endpoints.
3. **Authorise every request.** Role and entitlement checks belong in server middleware on every endpoint, not in UI routing.
4. **Treat business state as server-owned.** Payment status comes from the payment provider's verified callback or API, never from the client.
5. **Rate-limit and expire OTPs** so that a proper server-side check cannot simply be brute-forced instead.

Controls that do **not** fix this issue: TLS and certificate pinning (the tester controls their own device), response signing checked on the client, code obfuscation, WAF rules. They can raise the effort needed but leave the server trusting the client.

## Retest checklist

- [ ] Repeat the exact manipulation; the next protected request must fail with `401`/`403`.
- [ ] Call the protected endpoints directly with a pre-2FA / low-privilege session.
- [ ] Confirm that tokens issued before full authentication have a restricted scope.
- [ ] Check related flows (password reset, email change, device registration) for the same pattern.

## References

- MITRE CWE-602: Client-Side Enforcement of Server-Side Security — <https://cwe.mitre.org/data/definitions/602.html>
- MITRE CWE-603: Use of Client-Side Authentication — <https://cwe.mitre.org/data/definitions/603.html>
- OWASP Web Security Testing Guide — Testing for Bypassing Authentication Schema (WSTG-ATHN-04) — <https://owasp.org/www-project-web-security-testing-guide/>
