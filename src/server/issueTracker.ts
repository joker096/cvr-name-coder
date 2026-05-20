type TrackerType = "github" | "jira" | "linear";

interface TrackerConfig {
  type: TrackerType;
  token: string;
  baseUrl?: string;       // Jira: https://xxx.atlassian.net, Linear: https://api.linear.app/graphql
  repo?: string;           // GitHub: owner/repo
  project?: string;        // Jira: project key, Linear: team key
}

interface IssueCreateInput {
  title: string;
  description?: string;
  priority?: "low" | "medium" | "high" | "urgent";
  labels?: string[];
  assignee?: string;
}

interface Issue {
  id: string;
  key: string;          // Jira: PROJ-123, GitHub: #123, Linear: TEAM-123
  title: string;
  description: string;
  status: string;
  priority: string | null;
  url: string;
  updatedAt: string;
}

let trackerConfig: TrackerConfig | null = null;

export function setTrackerConfig(config: TrackerConfig) {
  trackerConfig = config;
}

export function getTrackerConfig(): TrackerConfig | null {
  return trackerConfig;
}

export async function createIssue(input: IssueCreateInput): Promise<Issue> {
  if (!trackerConfig) throw new Error("Issue tracker not configured");

  switch (trackerConfig.type) {
    case "github":
      return createGitHubIssue(input);
    case "jira":
      return createJiraIssue(input);
    case "linear":
      return createLinearIssue(input);
    default:
      throw new Error(`Unknown tracker: ${trackerConfig.type}`);
  }
}

export async function listIssues(status?: string, limit = 20): Promise<Issue[]> {
  if (!trackerConfig) throw new Error("Issue tracker not configured");

  switch (trackerConfig.type) {
    case "github":
      return listGitHubIssues(status, limit);
    case "jira":
      return listJiraIssues(status, limit);
    case "linear":
      return listLinearIssues(status, limit);
    default:
      throw new Error(`Unknown tracker: ${trackerConfig.type}`);
  }
}

export async function getIssue(issueKey: string): Promise<Issue> {
  if (!trackerConfig) throw new Error("Issue tracker not configured");

  switch (trackerConfig.type) {
    case "github":
      return getGitHubIssue(issueKey);
    case "jira":
      return getJiraIssue(issueKey);
    case "linear":
      return getLinearIssue(issueKey);
    default:
      throw new Error(`Unknown tracker: ${trackerConfig.type}`);
  }
}

export async function addComment(issueKey: string, body: string): Promise<void> {
  if (!trackerConfig) throw new Error("Issue tracker not configured");

  switch (trackerConfig.type) {
    case "github":
      await githubRequest(`/repos/${trackerConfig.repo}/issues/${issueKey}/comments`, "POST", { body });
      return;
    case "jira":
      await jiraRequest(`/issue/${issueKey}/comment`, "POST", { body });
      return;
    case "linear":
      await linearRequest("mutation CreateComment { commentCreate(input: { issueId: " + JSON.stringify(issueKey) + ", body: " + JSON.stringify(body) + " }) { success } }");
      return;
    default:
      throw new Error(`Unknown tracker: ${trackerConfig.type}`);
  }
}

// --- GitHub Issues ---

async function githubRequest(path: string, method = "GET", body?: unknown): Promise<Response> {
  const url = path.startsWith("http") ? path : `https://api.github.com${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${trackerConfig!.token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : null,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub API ${res.status}: ${text}`);
  }
  return res;
}

async function createGitHubIssue(input: IssueCreateInput): Promise<Issue> {
  const res = await githubRequest(`/repos/${trackerConfig!.repo}/issues`, "POST", {
    title: input.title,
    body: input.description,
    labels: input.labels,
  });
  const data = await res.json() as any;
  return {
    id: String(data.number),
    key: `#${data.number}`,
    title: data.title,
    description: data.body || "",
    status: data.state,
    priority: input.priority || null,
    url: data.html_url,
    updatedAt: data.updated_at,
  };
}

async function listGitHubIssues(status?: string, limit = 20): Promise<Issue[]> {
  const q = status ? `state=${status}` : "state=open";
  const res = await githubRequest(`/repos/${trackerConfig!.repo}/issues?${q}&per_page=${limit}`);
  const data = await res.json() as any[];
  return data.map((i: any) => ({
    id: String(i.number),
    key: `#${i.number}`,
    title: i.title,
    description: i.body || "",
    status: i.state,
    priority: i.labels?.find((l: any) => l.name?.startsWith("priority:"))?.name || null,
    url: i.html_url,
    updatedAt: i.updated_at,
  }));
}

async function getGitHubIssue(number: string): Promise<Issue> {
  const res = await githubRequest(`/repos/${trackerConfig!.repo}/issues/${number}`);
  const i = await res.json() as any;
  return {
    id: String(i.number),
    key: `#${i.number}`,
    title: i.title,
    description: i.body || "",
    status: i.state,
    priority: null,
    url: i.html_url,
    updatedAt: i.updated_at,
  };
}

// --- Jira ---

async function jiraRequest(path: string, method = "GET", body?: unknown): Promise<Response> {
  const base = trackerConfig!.baseUrl!.replace(/\/$/, "");
  const res = await fetch(`${base}/rest/api/3${path}`, {
    method,
    headers: {
      Authorization: `Basic ${Buffer.from(`${trackerConfig!.token}:`).toString("base64")}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : null,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Jira API ${res.status}: ${text}`);
  }
  return res;
}

async function createJiraIssue(input: IssueCreateInput): Promise<Issue> {
  const priorityMap: Record<string, string> = { low: "Low", medium: "Medium", high: "High", urgent: "Highest" };
  const res = await jiraRequest("/issue", "POST", {
    fields: {
      project: { key: trackerConfig!.project },
      summary: input.title,
      description: input.description ? { type: "doc", version: 1, content: [{ type: "paragraph", content: [{ type: "text", text: input.description }] }] } : undefined,
      issuetype: { name: "Task" },
      priority: input.priority ? { name: priorityMap[input.priority] } : undefined,
      labels: input.labels,
    },
  });
  const data = await res.json() as any;
  return {
    id: data.id,
    key: data.key,
    title: data.fields.summary,
    description: input.description || "",
    status: data.fields.status?.name || "To Do",
    priority: data.fields.priority?.name || null,
    url: `${trackerConfig!.baseUrl}/browse/${data.key}`,
    updatedAt: data.fields.updated,
  };
}

async function listJiraIssues(status?: string, limit = 20): Promise<Issue[]> {
  const jql = `project=${trackerConfig!.project}${status ? ` AND status="${status}"` : ""}`;
  const res = await jiraRequest(`/search?jql=${encodeURIComponent(jql)}&maxResults=${limit}`);
  const data = await res.json() as any;
  return (data.issues || []).map((i: any) => ({
    id: i.id,
    key: i.key,
    title: i.fields.summary,
    description: "",
    status: i.fields.status?.name || "Unknown",
    priority: i.fields.priority?.name || null,
    url: `${trackerConfig!.baseUrl}/browse/${i.key}`,
    updatedAt: i.fields.updated,
  }));
}

async function getJiraIssue(key: string): Promise<Issue> {
  const res = await jiraRequest(`/issue/${key}`);
  const i = (await res.json() as any).fields;
  return {
    id: key,
    key,
    title: i.summary,
    description: i.description?.content?.[0]?.content?.[0]?.text || "",
    status: i.status?.name || "Unknown",
    priority: i.priority?.name || null,
    url: `${trackerConfig!.baseUrl}/browse/${key}`,
    updatedAt: i.updated,
  };
}

// --- Linear ---

async function linearRequest(query: string, variables?: Record<string, unknown>): Promise<any> {
  const res = await fetch("https://api.linear.app/graphql", {
    method: "POST",
    headers: {
      Authorization: trackerConfig!.token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });
  const data = await res.json() as any;
  if (data.errors) throw new Error(`Linear API: ${JSON.stringify(data.errors)}`);
  return data.data;
}

async function createLinearIssue(input: IssueCreateInput): Promise<Issue> {
  const priorityNum: Record<string, number> = { low: 1, medium: 2, high: 3, urgent: 4 };
  const data = await linearRequest(
    `mutation CreateIssue($input: IssueCreateInput!) { issueCreate(input: $input) { issue { id identifier title description state { name } priority priorityLabel url updatedAt } } }`,
    {
      input: {
        teamId: trackerConfig!.project,
        title: input.title,
        description: input.description,
        priority: input.priority ? priorityNum[input.priority] : undefined,
      },
    }
  );
  const i = data.issueCreate.issue;
  return {
    id: i.id,
    key: i.identifier,
    title: i.title,
    description: i.description || "",
    status: i.state?.name || "Backlog",
    priority: i.priorityLabel || null,
    url: i.url,
    updatedAt: i.updatedAt,
  };
}

async function listLinearIssues(status?: string, limit = 20): Promise<Issue[]> {
  const q = status ? `(state: { name: { eq: "${status}" } })` : "";
  const data = await linearRequest(
    `query Issues($first: Int!) { issues(first: $first, filter: ${q || "{}"}) { nodes { id identifier title description state { name } priorityLabel url updatedAt } } }`,
    { first: limit }
  );
  return (data.issues.nodes || []).map((i: any) => ({
    id: i.id,
    key: i.identifier,
    title: i.title,
    description: i.description || "",
    status: i.state?.name || "Unknown",
    priority: i.priorityLabel || null,
    url: i.url,
    updatedAt: i.updatedAt,
  }));
}

async function getLinearIssue(id: string): Promise<Issue> {
  const data = await linearRequest(
    `query Issue($id: String!) { issue(id: $id) { id identifier title description state { name } priorityLabel url updatedAt } }`,
    { id }
  );
  const i = data.issue;
  return {
    id: i.id,
    key: i.identifier,
    title: i.title,
    description: i.description || "",
    status: i.state?.name || "Unknown",
    priority: i.priorityLabel || null,
    url: i.url,
    updatedAt: i.updatedAt,
  };
}
