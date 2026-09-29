import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? "" : "http://localhost:8000");

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

export const api = {
  // Dashboard
  getDashboardSummary: () => client.get("/api/dashboard/summary").then((r) => r.data),

  // Departments / Problems
  getDepartments: () => client.get("/api/departments").then((r) => r.data),
  getProblems: (departmentId) =>
    client.get("/api/problems", { params: departmentId ? { department_id: departmentId } : {} }).then((r) => r.data),
  createProblem: (payload) => client.post("/api/problems", payload).then((r) => r.data),

  // Challenges
  getChallenges: (status) =>
    client.get("/api/challenges", { params: status ? { status } : {} }).then((r) => r.data),
  getChallenge: (id) => client.get(`/api/challenges/${id}`).then((r) => r.data),
  generateChallenge: (problem_id) =>
    client.post("/api/challenges/generate", { problem_id }).then((r) => r.data),
  updateChallenge: (id, payload) => client.patch(`/api/challenges/${id}`, payload).then((r) => r.data),
  publishChallenge: (id) => client.post(`/api/challenges/${id}/publish`).then((r) => r.data),

  // Startups
  getStartups: (sector) =>
    client.get("/api/startups", { params: sector ? { sector } : {} }).then((r) => r.data),
  getStartup: (id) => client.get(`/api/startups/${id}`).then((r) => r.data),

  // Matching
  matchForChallenge: (challengeId, topK = 5) =>
    client.get(`/api/matching/challenge/${challengeId}`, { params: { top_k: topK } }).then((r) => r.data),

  // Eligibility
  checkEligibility: (challengeId, startupId) =>
    client.post("/api/eligibility/check", { challenge_id: challengeId, startup_id: startupId }).then((r) => r.data),

  // Applications / Evaluations
  getApplications: (challengeId) =>
    client.get("/api/applications", { params: challengeId ? { challenge_id: challengeId } : {} }).then((r) => r.data),
  createApplication: (payload) => client.post("/api/applications", payload).then((r) => r.data),
  getApplication: (id) => client.get(`/api/applications/${id}`).then((r) => r.data),
  withdrawApplication: (id) => client.patch(`/api/applications/${id}/withdraw`).then((r) => r.data),
  generateEvaluation: (applicationId) =>
    client.post("/api/evaluations/generate", { application_id: applicationId }).then((r) => r.data),
  getEvaluations: () => client.get("/api/evaluations").then((r) => r.data),
  getClarificationRequests: (applicationId) =>
    client.get("/api/clarifications", { params: { application_id: applicationId } }).then((r) => r.data),
  createClarificationRequest: (payload) =>
    client.post("/api/clarifications", payload).then((r) => r.data),
  respondToClarification: (id, payload) =>
    client.patch(`/api/clarifications/${id}/response`, payload).then((r) => r.data),

  // Pilots / KPIs
  getPilots: (status) => client.get("/api/pilots", { params: status ? { status } : {} }).then((r) => r.data),
  getPilot: (id) => client.get(`/api/pilots/${id}`).then((r) => r.data),
  createPilot: (payload) => client.post("/api/pilots", payload).then((r) => r.data),
  updatePilotStatus: (id, status) => client.patch(`/api/pilots/${id}/status`, { status }).then((r) => r.data),
  getPilotKpis: (id) => client.get(`/api/pilots/${id}/kpis`).then((r) => r.data),
  getScaleRecommendation: (id) => client.get(`/api/pilots/${id}/scale-recommendation`).then((r) => r.data),

  // RAG
  queryRag: (query, topK = 4) => client.post("/api/rag/query", { query, top_k: topK }).then((r) => r.data),

  // Graph
  getGraphStatus: () => client.get("/api/graph/status").then((r) => r.data),
  syncGraph: () => client.post("/api/graph/sync").then((r) => r.data),
  getDepartmentGraph: (departmentId) =>
    client.get(`/api/graph/department/${departmentId}/startups-and-pilots`).then((r) => r.data),
};

export default api;
