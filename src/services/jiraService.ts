// ─── Jira Service ────────────────────────────────────────────────────────────
// Fetches real tickets from Atlassian Jira API using the REST API v3.

export interface ProcessedJiraTicket {
  id: string;
  key?: string;
  title: string;
  description: string;
  status: string;
  category: string;
  reporter: string;
  createdAt: string;
}

function mapJiraStatus(jiraStatus: string): string {
  const s = (jiraStatus ?? '').toLowerCase().trim();
  if (['done', 'resolved', 'closed', 'résolu', 'terminé', 'complete'].includes(s)) return 'PROCESSED';
  if (['in progress', 'en cours', 'in review', 'processing'].includes(s)) return 'PENDING';
  if (['failed', 'error', 'échec'].includes(s)) return 'FAILED';
  if (['flagged', 'blocked'].includes(s)) return 'FLAGGED';
  // "To Do" / "Open" / "Backlog" → treat as FAILED for visibility in audit map
  return 'FAILED';
}

export async function fetchJiraTickets(): Promise<ProcessedJiraTicket[]> {
  const domain   = process.env.ATLASSIAN_DOMAIN;
  const email    = process.env.ATLASSIAN_EMAIL;
  const token    = process.env.ATLASSIAN_API_TOKEN;
  const project  = process.env.ATLASSIAN_PROJECT_KEY ?? 'KAN';

  if (!domain || !email || !token) {
    console.log('⚠️  [Jira] Missing credentials — skipping.');
    return [];
  }

  // Properly encode JQL query
  const jql = encodeURIComponent(`project = ${project} ORDER BY created DESC`);
  const fields = 'summary,description,status,priority,reporter,created,issuetype';
  const url = `https://${domain}/rest/api/3/search/jql?jql=${jql}&maxResults=100&fields=${fields}`;

  const auth = Buffer.from(`${email}:${token}`).toString('base64');

  console.log(`🔍 [Jira] Calling: ${url.slice(0, 80)}...`);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const body = await response.text();
      console.error(`❌ [Jira] HTTP ${response.status}: ${body.slice(0, 300)}`);
      return [];
    }

    const data = await response.json() as any;
    const issues: any[] = data.issues ?? [];
    console.log(`✅ [Jira] Fetched ${issues.length} tickets from project ${project}`);

    return issues.map((issue: any): ProcessedJiraTicket => {
      const f = issue.fields ?? {};

      // Extract plain text from Atlassian Document Format (ADF)
      let description = 'No description.';
      if (f.description) {
        if (typeof f.description === 'string') {
          description = f.description;
        } else if (Array.isArray(f.description?.content)) {
          try {
            description = f.description.content
              .flatMap((b: any) => b.content ?? [])
              .filter((n: any) => n.type === 'text')
              .map((n: any) => n.text as string)
              .join(' ')
              .trim() || 'No description.';
          } catch { /* keep default */ }
        }
      }

      return {
        id:          issue.key,
        key:         issue.key,
        title:       f.summary ?? `Ticket ${issue.key}`,
        description,
        status:      mapJiraStatus(f.status?.name ?? ''),
        category:    f.issuetype?.name ?? 'Task',
        reporter:    f.reporter?.displayName ?? 'Unknown',
        createdAt:   f.created ?? new Date().toISOString(),
      };
    });

  } catch (err: any) {
    console.error('❌ [Jira] fetch() threw an error:', err?.cause ?? err?.message ?? err);
    return [];
  }
}

export async function createConfluencePage(
  title: string,
  body: string,
  spaceKey = 'SUP',
): Promise<{ success: boolean; url?: string; pageId?: string }> {
  const domain = process.env.ATLASSIAN_DOMAIN;
  const email  = process.env.ATLASSIAN_EMAIL;
  const token  = process.env.ATLASSIAN_API_TOKEN;
  if (!domain || !email || !token) return { success: false };

  const auth = Buffer.from(`${email}:${token}`).toString('base64');
  try {
    const res = await fetch(`https://${domain}/wiki/rest/api/content`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        type: 'page',
        title,
        space: { key: spaceKey },
        body: { storage: { value: body, representation: 'storage' } },
      }),
    });
    if (!res.ok) return { success: false };
    const d = await res.json() as any;
    return { success: true, pageId: d.id, url: `https://${domain}/wiki${d._links?.webui}` };
  } catch {
    return { success: false };
  }
}
