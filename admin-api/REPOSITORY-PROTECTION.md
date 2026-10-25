# Protect main before configuring the admin write token

**Deployment gate:** Do not create or install the admin Worker's GitHub write token until an active ruleset protecting main has been created and verified. A fine-grained token with Contents: write is still able to write code or workflow files if repository rules let it; the API-side file allowlist is defense in depth, not a replacement for a GitHub ruleset.

## Current verified state

Checked through the GitHub rulesets API on 2026-10-25:

- Ruleset **Protect main — require PR**, ID `25821290`, is `active` and targets only `refs/heads/main`.
- The bypass list is empty and the connected account cannot bypass the ruleset.
- Pull requests, stale-approval dismissal, conversation resolution, force-push blocking, deletion restriction, and strict `validate-and-build` status checking are enabled.
- **Approval requirement verified:** a fresh API readback on 2026-10-25 shows `required_approving_review_count: 1`, with the ruleset active and the bypass list empty. Re-open the [ruleset settings](https://github.com/erfan8km/Health-Data-Hub/rules/25821290) and verify the saved value before any credential setup. Do not configure the GitHub write token or deploy the Worker without explicit authorization and a separate trusted reviewer.
- The connected GitHub integration can read the ruleset but does not expose a ruleset-write action. Verify the saved value by reopening [the ruleset](https://github.com/erfan8km/Health-Data-Hub/rules/25821290) after saving.

If there is no second trusted reviewer, do not work around this by adding a bypass actor. Arrange a separate reviewer first; otherwise a one-approval requirement will prevent the sole PR author from merging their own PR.

## Create the ruleset only if the existing ruleset is absent

1. Open the repository's **Settings → Rules → Rulesets**:
   https://github.com/erfan8km/Health-Data-Hub/settings/rules
2. Select **New branch ruleset**.
3. Name it **Protect main — require PR**; set enforcement status to **Active**.
4. Under target branches, include the branch **main** (or the repository's default branch if it is main; do not target only the feature branches).
5. Leave the **Bypass list empty**. Do not add repository administrators, the admin Worker, a token, or any role as a bypass actor. This is important: the intention is to force the Worker and the repository owner through the normal PR route.
6. Enable **Require a pull request before merging**. This is the essential rule that prevents direct updates to main.
7. Enable **Block force pushes** and **Restrict deletions**.
8. Under required status checks, require the GitHub Actions check named **validate-and-build** (verified on the current main branch's check runs). This ensures the catalogue validation/typecheck/tests/build workflow completes before a PR can merge.
9. Save the ruleset and confirm its status is **Active**, the target includes main, the bypass list is empty, and the rule is visible in the repository's Rulesets list.
10. Open the ruleset from the Rulesets list and verify that it is still Active. A test push directly to main should be rejected, while a branch push and PR should be allowed. Do not test by attempting to change production files; use a harmless test branch or rely on GitHub's ruleset status and audit details.

GitHub's official instructions: https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/creating-rulesets-for-a-repository

## Human review and automatic deployment

- Every admin-generated PR must be inspected in full before merge, especially the **Files changed** tab. Check that only the registry JSON data file changed and that no code, workflow, dependency, configuration, or build file changed.
- The site's deployment workflow runs when main receives a push. Merge is therefore a production deployment decision, not merely an approval action.
- Require the **Validate static catalogue / validate-and-build** CI check to pass before merging if GitHub offers it as a required status check. Verify the exact check name shown by GitHub before adding it.
- The admin API itself is designed to create a branch and a PR only. It must never merge a PR or trigger deployment deliberately.

## Token restrictions and expiry

- Create the GitHub fine-grained token only after this ruleset is active.
- Limit it to **only** erfan8km/Health-Data-Hub.
- Grant only **Contents: Read and write** and **Pull requests: Read and write**, plus GitHub's required Metadata read-only. The server-side API write allowlist narrows operations further to: create an admin/registry-update-xxxxxxxx branch from main, update the single registry JSON file on that branch, and open a PR back to main.
- Set an explicit 90-day expiry when creating the token. Record the actual creation and expiration dates privately.
- A reminder is scheduled separately for 2027-01-08, 75 days after this preparation date, to leave time before a 90-day token expires. If token creation occurs later, move the reminder to before the actual expiry date; do not create a token just because a reminder fires.
- When rotating: create a replacement with the same minimal scope, replace the Worker secret only when deployment/configuration is authorized, verify proposal creation, and revoke the old token. In future, consider a GitHub App installation token with a short lifetime.

## Limits of these controls

GitHub's ruleset is the control that prevents direct writes to main. The Worker's hard-coded allowlist is additional defense in depth; it cannot protect main if the write token is stolen and GitHub permits direct pushes. A repository ruleset does not prevent a malicious PR from proposing code or workflow changes, so manual review of each PR remains mandatory.
