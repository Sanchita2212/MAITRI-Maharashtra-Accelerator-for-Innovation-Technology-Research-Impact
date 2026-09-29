import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Bot,
  Building2,
  CheckCircle2,
  CircleAlert,
  FileText,
  Rocket,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import api from "../api/client.js";
import StatCard from "../components/StatCard.jsx";
import Loading from "../components/Loading.jsx";
import Badge from "../components/Badge.jsx";

const pipelineStages = [
  { label: "Challenges", key: "challenges" },
  { label: "Applications", key: "applications" },
  { label: "Evaluation", key: "evaluation" },
  { label: "Pilot", key: "pilot" },
  { label: "Validation", key: "validation" },
  { label: "Procurement", key: "procurement" },
  { label: "Scale-up", key: "scaleup" },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [challenges, setChallenges] = useState([]);
  const [applications, setApplications] = useState([]);
  const [pilots, setPilots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([
      api.getDashboardSummary(),
      api.getChallenges(),
      api.getApplications(),
      api.getPilots(),
    ])
      .then(([dashboard, challengeList, applicationList, pilotList]) => {
        setSummary(dashboard);
        setChallenges(challengeList);
        setApplications(applicationList);
        setPilots(pilotList);
      })
      .catch((e) => setError(e.response?.data?.detail || e.message))
      .finally(() => setLoading(false));
  }, []);

  const kpis = useMemo(() => {
    const activeChallenges = Number(summary?.active_challenges ?? challenges.filter((c) => c.status === "PUBLISHED").length);
    const startupApplications = Number(summary?.startup_applications ?? applications.length);
    const underEvaluation = applications.filter((item) => ["UNDER_REVIEW", "REVIEW"].includes(item.status)).length;
    const activePilots = Number(summary?.pilots_active ?? pilots.filter((p) => p.status === "ACTIVE").length);
    const pendingDecisions = applications.filter((item) => ["SUBMITTED", "UNDER_REVIEW"].includes(item.status)).length;
    const scaleUpCandidates = pilots.filter((p) => p.status === "SCALED" || p.scale_recommendation === "SCALE").length;

    return {
      activeChallenges,
      startupApplications,
      underEvaluation,
      activePilots,
      pendingDecisions,
      scaleUpCandidates,
    };
  }, [applications, challenges, pilots, summary]);

  const pipelineData = useMemo(() => {
    return pipelineStages.map((stage) => {
      const valueMap = {
        challenges: challenges.filter((c) => c.status === "PUBLISHED").length,
        applications: applications.length,
        evaluation: applications.filter((item) => ["UNDER_REVIEW", "APPROVED", "REJECTED"].includes(item.status)).length,
        pilot: pilots.filter((p) => ["PLANNED", "ACTIVE"].includes(p.status)).length,
        validation: pilots.filter((p) => ["COMPLETED", "FAILED"].includes(p.status)).length,
        procurement: pilots.filter((p) => p.contract_id || p.contract_status).length,
        scaleup: pilots.filter((p) => p.status === "SCALED" || p.scale_recommendation === "SCALE").length,
      };

      return { ...stage, count: valueMap[stage.key] ?? 0 };
    });
  }, [applications, challenges, pilots]);

  const recentChallenges = useMemo(
    () =>
      [...challenges]
        .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
        .slice(0, 5),
    [challenges]
  );

  const officerActions = useMemo(() => {
    const pendingItems = [];

    applications
      .filter((item) => ["SUBMITTED", "UNDER_REVIEW"].includes(item.status))
      .slice(0, 3)
      .forEach((item) => {
        pendingItems.push({
          title: `Application review: ${item.startup_id}`,
          detail: `Challenge ${item.challenge_id} · ${item.status.replace(/_/g, " ")}`,
          tone: "review",
        });
      });

    pilots
      .filter((item) => ["PLANNED", "ACTIVE"].includes(item.status))
      .slice(0, 3)
      .forEach((item) => {
        pendingItems.push({
          title: `Pilot follow-up: ${item.location || item.pilot_id}`,
          detail: `${item.status} · ${item.challenge_id}`,
          tone: "focus",
        });
      });

    return pendingItems.slice(0, 4);
  }, [applications, pilots]);

  const pilotStatusData = ["PLANNED", "ACTIVE", "COMPLETED", "FAILED", "SCALED"].map((status) => ({
    status,
    count: pilots.filter((p) => p.status === status).length,
  }));

  if (loading) return <Loading label="Loading dashboard..." />;

  if (error) {
    return (
      <div className="card p-8 text-red-600">
        <div className="flex items-center gap-2 font-semibold">
          <CircleAlert className="h-5 w-5" />
          Unable to load dashboard data
        </div>
        <div className="mt-2 text-sm text-slate-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <div className="section-label">Government Overview</div>
          <h1 className="section-title mt-3">Government Innovation Procurement</h1>
        </div>

        <button onClick={() => navigate("/problems")} className="btn-primary px-5 py-3 text-base">
          <Sparkles className="h-5 w-5" />
          Create Challenge
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Active Challenges" value={kpis.activeChallenges} icon={Sparkles} accent="saffron" />
        <StatCard label="Startup Applications" value={kpis.startupApplications} icon={Users} accent="maitri" />
        <StatCard label="Under Evaluation" value={kpis.underEvaluation} icon={FileText} accent="slate" />
        <StatCard label="Active Pilots" value={kpis.activePilots} icon={Rocket} accent="maitri" />
        <StatCard label="Pending Application Decisions" value={kpis.pendingDecisions} icon={CheckCircle2} accent="green" />
        <StatCard label="Scale-up Candidates" value={kpis.scaleUpCandidates} icon={TrendingUp} accent="green" />
      </div>

      <div className="card p-6">
        <div className="mb-5 flex items-center gap-2">
          <span className="section-label">Innovation Procurement Pipeline</span>
        </div>

        <div className="mb-3 text-3xl font-black tracking-[-0.04em] text-slate-900">Progress across the lifecycle</div>

        <div className="grid gap-3 md:grid-cols-7">
          {pipelineData.map((stage, index) => (
            <div key={stage.key} className="flex items-center gap-3">
              <div className="flex w-full flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50/60 px-3 py-4 text-center">
                <div className="text-3xl font-black tracking-[-0.06em] text-slate-900">{stage.count}</div>
                <div className="text-xs font-medium text-slate-500">{stage.label}</div>
              </div>
              {index < pipelineData.length - 1 && (
                <div className="hidden h-px flex-1 bg-slate-200 md:block" />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_0.9fr]">
        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <div className="section-label">Recent Challenges</div>
              <h2 className="mt-2 text-3xl font-black tracking-[-0.04em] text-slate-900">Latest procurement opportunities</h2>
            </div>
          </div>

          {recentChallenges.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              No challenges available yet.
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <table className="data-table w-full border-collapse bg-white">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3">Challenge</th>
                    <th className="px-4 py-3">Department</th>
                    <th className="px-4 py-3">Sector</th>
                    <th className="px-4 py-3">Applications</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentChallenges.map((challenge) => {
                    const appCount = applications.filter((app) => app.challenge_id === challenge.challenge_id).length;
                    return (
                      <tr key={challenge.challenge_id}>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-800">{challenge.title}</div>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{challenge.department_id || "Government"}</td>
                        <td className="px-4 py-3 text-slate-600">{challenge.sector || "Cross-sector"}</td>
                        <td className="px-4 py-3 text-slate-600">{appCount}</td>
                        <td className="px-4 py-3">
                          <Badge status={challenge.status} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <div className="section-label">Pending Officer Actions</div>
              <h2 className="mt-2 text-3xl font-black tracking-[-0.04em] text-slate-900">Review queue</h2>
            </div>
            <button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
              <Bot className="h-4 w-4 text-[#0f172a]" />
              AI Assistant
            </button>
          </div>

          {officerActions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              No officer actions pending.
            </div>
          ) : (
            <div className="space-y-3">
              {officerActions.map((item, index) => (
                <div key={`${item.title}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-800">{item.title}</div>
                      <div className="mt-1 text-sm text-slate-500">{item.detail}</div>
                    </div>
                    <ArrowRight className="mt-1 h-4 w-4 text-slate-400" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card p-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <div className="section-label">Project Health</div>
            <h2 className="mt-2 text-3xl font-black tracking-[-0.04em] text-slate-900">Pilots by status</h2>
          </div>
        </div>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={pilotStatusData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="status" tick={{ fontSize: 11 }} stroke="#64748b" />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="#64748b" />
              <Tooltip />
              <Bar dataKey="count" fill="#f59e0b" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <button className="floating-assistant" aria-label="Open AI assistant">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#0f172a]">
          <Bot className="h-4 w-4" />
        </span>
        <span className="text-sm font-semibold">AI Assistant</span>
        <span className="rounded-full bg-[#f59e0b] px-2 py-0.5 text-xs font-bold text-[#0f172a]">{officerActions.length}</span>
      </button>
    </div>
  );
}
