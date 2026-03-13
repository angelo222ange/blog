export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T = any>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    credentials: "include",
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(
      body.error || body.details || `Erreur ${res.status}`,
      res.status
    );
  }

  return res.json();
}

// Auth
export const login = (email: string, password: string) =>
  request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

export const oauthLogin = (data: { email: string; name: string; provider: string; providerId: string }) =>
  request("/auth/oauth-login", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const logout = () =>
  request("/auth/logout", { method: "POST" });

export const getMe = () =>
  request<{ id: string; email: string; name: string; role: string; onboardedAt: string | null }>("/auth/me");

export const markOnboarded = () =>
  request("/auth/onboarded", { method: "POST", body: JSON.stringify({}) });

export const updateMe = (data: { name: string }) =>
  request("/auth/me", { method: "PATCH", body: JSON.stringify(data) });

export const changePassword = (currentPassword: string, newPassword: string) =>
  request("/auth/change-password", {
    method: "POST",
    body: JSON.stringify({ currentPassword, newPassword }),
  });

export const getUsers = () =>
  request<any[]>("/auth/users");

export const createUser = (data: { email: string; name?: string; role?: string; password: string }) =>
  request("/auth/users", { method: "POST", body: JSON.stringify(data) });

export const deleteUser = (id: string) =>
  request(`/auth/users/${id}`, { method: "DELETE", body: JSON.stringify({}) });

// Sites
export const getSites = () =>
  request<any[]>("/sites");

export const getSite = (id: string) =>
  request<any>(`/sites/${id}`);

export const createSite = (data: {
  name: string;
  slug: string;
  repoName: string;
  repoOwner?: string;
  domain?: string;
  theme: string;
  city?: string;
  department?: string;
  blogPattern: string;
  blogBasePath?: string;
  contentDir?: string;
  imageDir?: string;
}) =>
  request<any>("/sites", {
    method: "POST",
    body: JSON.stringify(data),
  });

// Articles
export const getArticles = (siteId: string) =>
  request<any[]>(`/articles?siteId=${siteId}`);

export const getArticle = (id: string) =>
  request<any>(`/articles/${id}`);

export const updateArticleStatus = (id: string, status: string) =>
  request(`/articles/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });

// Generate
export const generateArticle = (siteId: string, topicHint?: string) =>
  request("/generate/article", {
    method: "POST",
    body: JSON.stringify({ siteId, topicHint: topicHint || undefined }),
  });

// Schedule
export const getSchedule = (siteId: string) =>
  request<any>(`/sites/${siteId}/schedule`);

export const updateSchedule = (siteId: string, data: {
  postTime?: string;
  activeDays?: number[];
  evergreenPerDay?: number;
  newsPerWeek?: number;
  autoApprove?: boolean;
  isActive?: boolean;
  timezone?: string;
  dayTimes?: Record<string, string>;
}) =>
  request(`/sites/${siteId}/schedule`, {
    method: "PUT",
    body: JSON.stringify(data),
  });

// ─── Stats ───

export const getDashboardStats = () =>
  request<{
    months: string[];
    articlesByMonth: number[];
    articlesByStatus: Record<string, number>;
    postsByPlatform: Record<string, number>;
    postsByStatus: Record<string, number>;
    articlesBySite: Array<{ name: string; count: number; theme: string }>;
    totalArticles: number;
    totalSocialPosts: number;
    publishedPosts: number;
    socialAccountsCount: number;
  }>("/stats/dashboard");

// ─── Social Media ───

export const getSocialAccounts = (siteId: string) =>
  request<any[]>(`/social/accounts/${siteId}`);

export const getOAuthUrl = (platform: string, siteId: string) =>
  request<{ url: string }>(`/social/oauth/${platform}/authorize?siteId=${siteId}`);

export const disconnectSocialAccount = (accountId: string) =>
  request(`/social/account/${accountId}`, { method: "DELETE", body: JSON.stringify({}) });

export const getSocialConfig = (siteId: string) =>
  request<any>(`/social/config/${siteId}`);

export const updateSocialConfig = (siteId: string, data: {
  autoPublish: boolean;
  defaultHashtags?: string[];
  postsPerDay?: number;
  postSlots?: string[];
  slotModes?: string[];
  activeDays?: number[];
  dayModes?: Record<string, string[]>;
  activePlatforms?: string[];
  timezone?: string;
}) =>
  request(`/social/config/${siteId}`, { method: "PUT", body: JSON.stringify(data) });

export const generateStandalonePost = (siteId: string, topic?: string, platforms?: string[], imageMode?: "ai" | "stock", carousel?: boolean) =>
  request(`/social-posts/generate-standalone/${siteId}`, {
    method: "POST",
    body: JSON.stringify({ topic: topic || undefined, platforms: platforms || undefined, imageMode: imageMode || "stock", carousel: carousel || undefined }),
  });

export const getStandalonePosts = (siteId: string) =>
  request<any[]>(`/social-posts/site/${siteId}`);

export const generateSocialPosts = (articleId: string, platforms?: string[]) =>
  request(`/social-posts/generate/${articleId}`, {
    method: "POST",
    body: JSON.stringify(platforms ? { platforms } : {}),
  });

export const getSocialPostsForArticle = (articleId: string) =>
  request<any[]>(`/social-posts/article/${articleId}`);

export const updateSocialPost = (postId: string, data: { content?: string; hashtags?: string[] }) =>
  request(`/social-posts/${postId}`, { method: "PATCH", body: JSON.stringify(data) });

export const approveSocialPost = (postId: string) =>
  request(`/social-posts/${postId}/approve`, { method: "POST", body: JSON.stringify({}) });

export const publishSocialPost = (postId: string) =>
  request(`/social-posts/${postId}/publish`, { method: "POST", body: JSON.stringify({}) });

export const publishAllSocialPosts = (articleId: string) =>
  request(`/social-posts/publish-all/${articleId}`, { method: "POST", body: JSON.stringify({}) });

export const deleteSocialPost = (postId: string) =>
  request(`/social-posts/${postId}`, { method: "DELETE", body: JSON.stringify({}) });

// ─── Social Metrics ───

export const fetchPostMetrics = (postId: string) =>
  request(`/social-posts/${postId}/fetch-metrics`, { method: "POST", body: JSON.stringify({}) });

export const fetchSiteMetrics = (siteId: string) =>
  request(`/social-posts/fetch-metrics-site/${siteId}`, { method: "POST", body: JSON.stringify({}) });

export const getMetricsSummary = (siteId: string) =>
  request<{
    totalImpressions: number;
    totalEngagement: number;
    totalLikes: number;
    totalComments: number;
    totalShares: number;
    avgEngagementRate: number;
    bestPlatform: string;
    bestPlatformRate: number;
    postsTracked: number;
    posts: Array<{
      id: string;
      platform: string;
      content: string;
      publishedAt: string | null;
      platformUrl: string | null;
      accountName: string | null;
      metrics: {
        impressions: number;
        reach: number;
        engagement: number;
        likes: number;
        comments: number;
        shares: number;
        saves: number;
        clicks: number;
        engagementRate: number;
        fetchedAt: string;
      };
    }>;
  }>(`/social-posts/metrics-summary/${siteId}`);

// LinkedIn Organizations
export const getLinkedInOrgs = (accountId: string) =>
  request<{
    personId: string;
    personName: string;
    organizations: Array<{ id: string; name: string }>;
    activeMode: "personal" | "organization";
    activeOrgId: string | null;
  }>(`/social/account/${accountId}/linkedin-orgs`);

export const setLinkedInMode = (accountId: string, mode: "personal" | "organization", organizationId?: string, organizationName?: string) =>
  request(`/social/account/${accountId}/linkedin-mode`, {
    method: "PATCH",
    body: JSON.stringify({ mode, organizationId, organizationName }),
  });

// ─── Motion Design ───

export const getMotionTemplates = () =>
  request<Array<{
    id: string;
    name: string;
    description: string;
    category: string;
    previewColor: string;
    slideCount: number;
    estimatedDuration: string;
  }>>("/motion/templates");

export const generateMotionSlides = (siteId: string, topic?: string, templateId?: string) =>
  request<{
    success: boolean;
    config: any;
    templateId: string | null;
    estimatedDuration: string;
  }>("/motion/generate", {
    method: "POST",
    body: JSON.stringify({ siteId, topic: topic || undefined, templateId: templateId || undefined }),
  });

export const renderMotionVideo = (config: any) =>
  request<{
    success: boolean;
    videoUrl: string;
    thumbnailUrl: string;
    durationMs: number;
    sizeBytes: number;
  }>("/motion/render", {
    method: "POST",
    body: JSON.stringify({ config }),
  });

export const generateAndRenderMotion = (
  siteId: string,
  topic?: string,
  templateId?: string,
  format?: "square" | "vertical" | "landscape"
) =>
  request<{
    success: boolean;
    videoUrl: string;
    config: any;
    durationMs: number;
    sizeBytes: number;
  }>("/motion/generate-and-render", {
    method: "POST",
    body: JSON.stringify({
      siteId,
      topic: topic || undefined,
      templateId: templateId || undefined,
      format: format || undefined,
    }),
  });

// ─── Publishing ───

export const publishArticle = (articleId: string) =>
  request<{
    success: boolean;
    commitSha: string;
    filesWritten: string[];
    message: string;
  }>(`/publish/${articleId}`, {
    method: "POST",
    body: JSON.stringify({}),
  });

export const deploySite = (siteId: string) =>
  request<{
    success: boolean;
    message: string;
    output: string;
  }>(`/publish/deploy/${siteId}`, {
    method: "POST",
    body: JSON.stringify({}),
  });

export const getPublishConfig = (siteId: string) =>
  request<{
    repoOwner: string;
    repoName: string;
    hasGithubToken: boolean;
    sshHost: string | null;
    sshUser: string | null;
    sshPort: number | null;
    hasSshKey: boolean;
    vpsPath: string | null;
    deployScript: string | null;
    notifyEmail: string | null;
  }>(`/publish/config/${siteId}`);

export const clonePublishConfig = (siteId: string, fromSiteId: string, repoName?: string) =>
  request<{ success: boolean; vpsPath: string; deployScript: string }>(`/publish/config/${siteId}/clone`, {
    method: "POST",
    body: JSON.stringify({ fromSiteId, repoName }),
  });

export const updatePublishConfig = (siteId: string, data: {
  githubToken?: string;
  sshHost?: string;
  sshUser?: string;
  sshPort?: number;
  sshPrivateKey?: string;
  vpsPath?: string;
  deployScript?: string;
  notifyEmail?: string;
}) =>
  request(`/publish/config/${siteId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
