# Security Policy

## Reporting a vulnerability

If you discover a security vulnerability in this scaffold, **please report it privately** rather than as a public issue.

**Preferred — GitHub Security Advisories:**

Open a private advisory at <https://github.com/AIDRAN/aidran/security/advisories/new>. We monitor advisories and will respond within five business days.

**Alternate — Email:**

Send a report to `hello@aidran.ai` with `[SECURITY]` in the subject line. Include:

- A description of the vulnerability
- Steps to reproduce
- The affected file, package, or pattern
- (Optional) Suggested remediation

We will acknowledge receipt within five business days and aim to provide a remediation timeline within ten business days.

## Scope

This repository is a curated scaffold of patterns and schemas — not a running service. Vulnerabilities in scope include:

- Dependency vulnerabilities transmitted through the workspace (we run Dependabot to surface these continuously)
- Code injection, SQL injection, or unsafe deserialization in published code
- Type-system bypasses that could let unsanitized input reach a downstream system
- Misconfigured workspace settings that could affect cloners

## Out of scope

- Vulnerabilities in the proprietary AIDRAN production system (the scaffold intentionally excludes those components — see `NOTICE.md`)
- Issues caused by user-supplied configuration (e.g., a misconfigured `DATABASE_URL` or weak Postgres role permissions)
- Best-practice suggestions that aren't actual vulnerabilities — please open an issue or discussion instead

## Disclosure

We follow coordinated disclosure. Once a vulnerability is patched, we will:

1. Publish a security advisory with credits to the reporter (unless the reporter requests anonymity)
2. Reference the fix commit and any affected version range
3. Add the advisory to the public security advisory feed for this repository

We will not file a CVE for issues confined to scaffolding code that no one runs in production. We will file a CVE for transitive dependency vulnerabilities that warrant one upstream.

## Acknowledgement

We will publicly thank reporters in the relevant advisory unless they request otherwise.
