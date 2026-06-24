/**
 * AERO — Bulk Jira Ticket Creator
 * Creates exactly 80 tickets (Scenario A: 12 silent failures) in project KAN.
 * Run: npx tsx scripts/create-jira-tickets.ts
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const DOMAIN = process.env.ATLASSIAN_DOMAIN!;
const EMAIL  = process.env.ATLASSIAN_EMAIL!;
const TOKEN  = process.env.ATLASSIAN_API_TOKEN!;
const PROJECT = process.env.ATLASSIAN_PROJECT_KEY ?? 'KAN';
const AUTH   = Buffer.from(`${EMAIL}:${TOKEN}`).toString('base64');

// ── Indices that are "silent failures" (same as mockData.ts) ─────────────────
const FAILURE_INDICES = new Set([4, 11, 19, 25, 32, 39, 44, 51, 58, 63, 72, 79]);

// ── Ticket templates (cycle through 6 subjects) ───────────────────────────────
const NORMAL_TICKETS = [
  {
    title: 'SSO Login Failure - Token Expired',
    description:
      'SAML token validation timed out on the corporate authentication portal. ' +
      'Users are unable to log in through the SSO provider after the session cookie expires. ' +
      'The issue reproduces consistently after 8 hours of inactivity. ' +
      'Affected environment: Production. ' +
      'Steps to reproduce: 1) Log in via SSO. 2) Wait 8+ hours without activity. 3) Attempt to access any Jira/Confluence page. ' +
      'Expected: Silent token refresh. Actual: Hard logout with generic 401 error.',
    category: 'Auth',
    priority: 'High',
    status: 'Done',
    issueType: 'Support',
    reporter: 'Sarah Jenkins',
  },
  {
    title: 'Password Reset Failing with Error 403',
    description:
      'Admin user is unable to submit a new password through the self-service portal. ' +
      'The reset form returns HTTP 403 Forbidden after clicking "Submit new password". ' +
      'The user confirms they received the reset email and the link is valid. ' +
      'Browser console shows: "Access denied - CSRF token mismatch". ' +
      'Affects all users on Chrome 124+. Firefox and Safari are not impacted. ' +
      'Temporary workaround: Use Firefox.',
    category: 'Auth',
    priority: 'High',
    status: 'Done',
    issueType: 'Incident',
    reporter: 'Alex Rivera',
  },
  {
    title: 'Confluence Pages Load Slowly on Remote VPN',
    description:
      'High latency detected when loading Confluence documentation pages with heavy media attachments. ' +
      'Pages with >5 embedded images or >3 attached PDFs take 15-45 seconds to load over VPN. ' +
      'Same pages load in under 2 seconds on the corporate network. ' +
      'VPN provider: Cisco AnyConnect. Region: EU-West. ' +
      'Performance trace shows the bottleneck is at the CDN layer, not the VPN tunnel itself. ' +
      'Affects ~40% of remote workers.',
    category: 'Infrastructure',
    priority: 'Medium',
    status: 'Done',
    issueType: 'Tâche',
    reporter: 'Kenji Sato',
  },
  {
    title: 'Jira Issue Transition Blocked by Approval Workflow',
    description:
      'Unable to close a ticket that requires a mandatory peer approval before the "Done" transition. ' +
      'The approval step is correctly configured, but the transition button remains greyed out even after peer approval is granted. ' +
      'Affects tickets in the "Legal Review" workflow specifically. ' +
      'Workaround: Admin can force-transition via the workflow editor. ' +
      'This is a blocking issue for the Q2 compliance audit — 23 tickets are stuck.',
    category: 'Workflow',
    priority: 'High',
    status: 'Done',
    issueType: 'Incident',
    reporter: 'Elena Rostova',
  },
  {
    title: 'SSO Login Blocked After Invoice Payment Failure',
    description:
      'User\'s SSO access was revoked because a Stripe invoice payment failed silently. ' +
      'The subscription lapse deactivated the Atlassian account, but the user received no email warning. ' +
      'Impact: 12 users across 3 teams lost Jira/Confluence access for 2 business days. ' +
      'Root cause: Billing webhook from Stripe to Atlassian was not delivered (502 error on Atlassian side). ' +
      'Request: implement a grace period of 48h before account suspension.',
    category: 'Billing',
    priority: 'High',
    status: 'Done',
    issueType: 'Support',
    reporter: 'John Doe',
  },
  {
    title: 'New Account Provisioning Required for Contracting Team',
    description:
      'Requesting Jira and Confluence account creation for 5 new contractors joining the infrastructure team. ' +
      'Start date: next Monday. ' +
      'Required access: Jira (KAN project, Developer role), Confluence (Engineering space, Editor). ' +
      'Names and emails: alice.m@contractor.io, bob.j@contractor.io, carol.p@contractor.io, ' +
      'dan.r@contractor.io, eve.s@contractor.io. ' +
      'Manager approval attached. SSO integration via company IdP required.',
    category: 'Provisioning',
    priority: 'Medium',
    status: 'Done',
    issueType: 'Tâche',
    reporter: 'Emily Chen',
  },
];

// ── Silent failure definitions ────────────────────────────────────────────────
function getSilentFailureTicket(index: number) {
  if (index === 4) {
    return {
      title: 'SSO Reset Fails — Card Declined Error Displayed',
      description:
        'User attempts to reset authentication credentials via corporate SSO portal but is redirected to Stripe payment page. ' +
        'The SSO reset flow incorrectly triggers a billing validation step, showing a "Card Declined" error on an auth screen. ' +
        'This is a critical UX and security issue: payment information should never appear in an authentication flow. ' +
        'The agent mis-classified this ticket as a Billing issue and generated a FAQ advising users to update their payment method — ' +
        'this is incorrect and potentially dangerous. Root cause: billing and auth contexts were merged during knowledge retrieval. ' +
        'Severity: HIGH — PCI compliance risk.',
      category: 'Auth/Billing Mismatch',
      priority: 'High',
      status: 'To Do',
      issueType: 'Incident',
      reporter: 'Kenji Sato',
    };
  }
  if (index === 11) {
    return {
      title: 'LDAP Sync Timeout in JSM Workspace — No Alert Fired',
      description:
        'The LDAP directory sync agent is throwing SSL certificate trace errors on every scheduled sync (every 15 min). ' +
        'The sync has been silently failing for 72 hours. Admin did not receive any email or Jira notification. ' +
        'As a result, 8 new user accounts created in Active Directory are not visible in Jira. ' +
        'The agent classified this as an "Infrastructure" issue and generated a generic VPN troubleshooting FAQ — completely irrelevant. ' +
        'Failure attribution: Step 2 (Semantic Intent Analysis) misclassified LDAP sync errors as network connectivity issues. ' +
        'Impact: New employees cannot access any Atlassian tools.',
      category: 'Sync Hub',
      priority: 'High',
      status: 'To Do',
      issueType: 'Incident',
      reporter: 'Elena Rostova',
    };
  }
  // Generic silent failure
  const num = 400 + index;
  return {
    title: `Silent Compliance Deviation Detected — Ticket #${num}`,
    description:
      `Automated agent mis-classified ticket #${num} as a general FAQ request, ` +
      'but the ticket contained active corporate security credential references and potential data exposure risk. ' +
      'The generated Confluence article included partial authentication token structures that should never appear in public knowledge base articles. ' +
      'The agent completed all tool calls without raising any error — the failure is only detectable by reviewing the output content. ' +
      'This is the definition of a "silent failure": the agent appeared to succeed, but the output contains a security violation. ' +
      'Recommended action: quarantine the generated article and re-run with stricter content safety constraints. ' +
      'This ticket was flagged retroactively by the AERO continuous evaluation system.',
    category: 'Security Bypass',
    priority: 'High',
    status: 'To Do',
    issueType: 'Incident',
    reporter: 'Alex Rivera',
  };
}

// ── Jira priority mapping ─────────────────────────────────────────────────────
const JIRA_PRIORITY: Record<string, string> = {
  High: 'High',
  Medium: 'Medium',
  Low: 'Low',
  Critical: 'Highest',
};

// ── Create a single Jira issue ────────────────────────────────────────────────
async function createIssue(ticket: {
  title: string;
  description: string;
  priority: string;
  issueType: string;
}, index: number): Promise<{ key: string } | null> {
  const body = {
    fields: {
      project: { key: PROJECT },
      summary: ticket.title,
      description: {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: ticket.description }],
          },
        ],
      },
      issuetype: { name: ticket.issueType },
      priority: { name: JIRA_PRIORITY[ticket.priority] ?? 'Medium' },
    },
  };

  try {
    const res = await fetch(`https://${DOMAIN}/rest/api/3/issue`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${AUTH}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`  ❌ [${index}] HTTP ${res.status}: ${err.slice(0, 200)}`);
      return null;
    }

    const data = (await res.json()) as { key: string };
    return data;
  } catch (e: any) {
    console.error(`  ❌ [${index}] Network error: ${e.message}`);
    return null;
  }
}

// ── Transition a Jira issue to "Done" ─────────────────────────────────────────
async function transitionToDone(issueKey: string): Promise<void> {
  // First, get available transitions
  const res = await fetch(`https://${DOMAIN}/rest/api/3/issue/${issueKey}/transitions`, {
    headers: { Authorization: `Basic ${AUTH}`, Accept: 'application/json' },
  });
  if (!res.ok) return;

  const data = (await res.json()) as { transitions: { id: string; name: string }[] };
  const doneTransition = data.transitions.find(
    (t) => t.name.toLowerCase().includes('done') || t.name.toLowerCase().includes('resolved') || t.name.toLowerCase().includes('close'),
  );

  if (!doneTransition) return;

  await fetch(`https://${DOMAIN}/rest/api/3/issue/${issueKey}/transitions`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${AUTH}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ transition: { id: doneTransition.id } }),
  });
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🚀 AERO Ticket Creator`);
  console.log(`   Project : ${PROJECT} @ ${DOMAIN}`);
  console.log(`   Creating: 80 tickets (68 normal + 12 silent failures)\n`);

  if (!DOMAIN || !EMAIL || !TOKEN) {
    console.error('❌ Missing Atlassian credentials in .env.local');
    process.exit(1);
  }

  const created: string[] = [];
  const failed: number[] = [];

  for (let i = 0; i < 80; i++) {
    const isFailure = FAILURE_INDICES.has(i);
    const ticket = isFailure
      ? getSilentFailureTicket(i)
      : NORMAL_TICKETS[i % NORMAL_TICKETS.length];

    const label = isFailure ? '🔴 SILENT FAILURE' : '✅ NORMAL         ';
    process.stdout.write(`  [${String(i + 1).padStart(2, '0')}/80] ${label} — ${ticket.title.slice(0, 55).padEnd(55)} `);

    const result = await createIssue(ticket, i);

    if (result) {
      // Transition "Done" tickets to resolved status
      if (ticket.status === 'Done') {
        await transitionToDone(result.key);
      }
      created.push(result.key);
      console.log(`→ ${result.key} ✓`);
    } else {
      failed.push(i);
      console.log('→ FAILED');
    }

    // Small delay to avoid Atlassian rate limits (10 req/s)
    await new Promise((r) => setTimeout(r, 120));
  }

  console.log(`\n─────────────────────────────────────────`);
  console.log(`✅ Created : ${created.length} tickets`);
  if (failed.length > 0) {
    console.log(`❌ Failed  : ${failed.length} tickets (indices: ${failed.join(', ')})`);
  }
  console.log(`\n🎯 Silent failure tickets (open/To Do):`);
  created.filter((_, i) => FAILURE_INDICES.has(i)).forEach((k) => console.log(`   • ${k}`));
  console.log(`\n✔  Reload AERO → Silent Failures tab to see all 80 tickets.\n`);
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
