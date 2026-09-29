import { useEffect, useMemo, useState } from "react";
import { BarChart3, BriefcaseBusiness, CheckCircle2, Handshake, ShieldCheck, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import api from "../api/client.js";
import Loading from "../components/Loading.jsx";
import Badge from "../components/Badge.jsx";

const PAGE_CONFIG = {
  applications: {
    eyebrow: "Review Workspace",
    title: "Applications",
    description: "Review startup submissions and move promising solutions through the procurement workflow.",
    icon: BriefcaseBusiness,
    empty: "No startup applications are available yet.",
  },
  evaluations: {
    eyebrow: "Decision Support",
    title: "Evaluations",
    description: "Review AI-assisted evaluations and recommendations for submitted applications.",
    icon: CheckCircle2,
    empty: "No evaluations are available yet.",
  },
  contracts: {
    eyebrow: "Commercial Delivery",
    title: "Contracts & Payments",
    description: "Track pilot delivery commitments that are ready for contracting and payment administration.",
    icon: Handshake,
    empty: "No contract-ready pilot records are available yet.",
  },
  validation: {
    eyebrow: "Impact Delivery",
    title: "Validation",
    description: "Monitor completed and failed pilots as evidence is reviewed for procurement decisions.",
    icon: ShieldCheck,
    empty: "No validation records are available yet.",
  },
  scaleup: {
    eyebrow: "Growth Decisions",
    title: "Scale-up",
    description: "Review pilot recommendations and identify solutions ready for wider government adoption.",
    icon: TrendingUp,
    empty: "No scale-up candidates are available yet.",
  },
};

export function ApplicationsPage() {
  return <ApplicationTable />;
}

export function EvaluationsPage() {
  const config = PAGE_CONFIG.evaluations;
  return <SimpleResourcePage config={config} load={api.getEvaluations} renderItem={(item) => (
    <div key={item.evaluation_id} className="card p-5">
      <div className="flex items-start justify-between gap-4">
        <div><div className="text-base font-bold text-[#0b2d4a]">{item.application_id}</div><div className="mt-1 text-sm text-slate-500">Evaluated {new Date(item.evaluated_at).toLocaleDateString()}</div></div>
        <Badge status={item.recommendation} />
      </div>
      <div className="mt-5 flex items-end justify-between"><div className="text-3xl font-black text-[#0b2d4a]">{item.total_score}</div><span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total score</span></div>
      {item.reasoning && <p className="mt-3 text-sm leading-6 text-slate-600">{item.reasoning}</p>}
    </div>
  )} />;
}

export function ContractsPage() {
  return <PilotWorkflowPage type="contracts" filter={(pilot) => Boolean(pilot.contract_id || pilot.contract_status)} />;
}

export function ValidationPage() {
  return <PilotWorkflowPage type="validation" filter={(pilot) => ["COMPLETED", "FAILED"].includes(pilot.status)} />;
}

export function ScaleUpPage() {
  return <PilotWorkflowPage type="scaleup" filter={(pilot) => pilot.status === "SCALED" || pilot.scale_recommendation === "SCALE"} />;
}

export function AnalyticsPage() {
  const [summary, setSummary] = useState(null);
  const [pilots, setPilots] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getDashboardSummary(), api.getPilots()])
      .then(([dashboard, pilotList]) => {
        setSummary(dashboard);
        setPilots(pilotList);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading label="Loading analytics..." />;
  const chartData = ["PLANNED", "ACTIVE", "COMPLETED", "FAILED", "SCALED"].map((status) => ({
    status,
    count: pilots.filter((pilot) => pilot.status === status).length,
  }));

  return <div className="page-shell">
    <div className="page-intro"><div><div className="section-label">Performance Intelligence</div><h1 className="flex items-center gap-3 text-3xl font-black tracking-[-0.045em] text-[#0b2d4a] md:text-4xl"><BarChart3 className="h-8 w-8 text-[#ff6b0a]" />Analytics</h1><p>Understand procurement throughput, pilot delivery, and impact performance from live MAITRI data.</p></div></div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <AnalyticsMetric label="Published challenges" value={summary?.active_challenges ?? 0} />
      <AnalyticsMetric label="Applications" value={summary?.startup_applications ?? 0} />
      <AnalyticsMetric label="Active pilots" value={summary?.pilots_active ?? 0} />
      <AnalyticsMetric label="Average impact achievement" value={`${summary?.overall_impact_avg_achievement ?? 0}%`} />
    </div>
    <div className="card p-6"><div className="section-label">Pilot Portfolio</div><h2 className="mt-2 text-xl font-black text-[#0b2d4a]">Programs by status</h2><div className="mt-5 h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} margin={{ top: 8, right: 16, left: -12, bottom: 0 }}><CartesianGrid stroke="#e8eef3" vertical={false} /><XAxis dataKey="status" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} /><Tooltip /><Bar dataKey="count" fill="#ff6b0a" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div></div>
  </div>;
}

function AnalyticsMetric({ label, value }) {
  return <div className="card p-5"><div className="text-3xl font-black tracking-[-0.05em] text-[#0b2d4a]">{value}</div><div className="mt-2 text-xs font-semibold text-slate-500">{label}</div></div>;
}

function ApplicationTable() {
  const config = PAGE_CONFIG.applications;
  const [applications, setApplications] = useState([]);
  const [startups, setStartups] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [filters, setFilters] = useState({ query: "", challenge: "ALL", department: "ALL", status: "ALL", sort: "date" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([api.getApplications(), api.getStartups(), api.getChallenges(), api.getDepartments()])
      .then(([applicationList, startupList, challengeList, departmentList]) => {
        setApplications(applicationList); setStartups(startupList); setChallenges(challengeList); setDepartments(departmentList);
      })
      .catch((requestError) => setError(requestError.response?.data?.detail || requestError.message))
      .finally(() => setLoading(false));
  }, []);

  const rows = useMemo(() => applications.map((application) => ({
    application,
    startup: startups.find((item) => item.startup_id === application.startup_id),
    challenge: challenges.find((item) => item.challenge_id === application.challenge_id),
  })).filter(({ application, startup, challenge }) => {
    const departmentId = challenge?.department_id;
    const search = [application.application_id, application.startup_id, application.challenge_id, startup?.company_name, challenge?.title].join(" ").toLowerCase();
    return (!filters.query || search.includes(filters.query.toLowerCase())) && (filters.challenge === "ALL" || application.challenge_id === filters.challenge) && (filters.department === "ALL" || departmentId === filters.department) && (filters.status === "ALL" || application.status === filters.status);
  }).sort((a, b) => filters.sort === "score" ? b.application.match_score - a.application.match_score : new Date(b.application.submitted_at) - new Date(a.application.submitted_at)), [applications, challenges, filters, startups]);

  if (loading) return <ApplicationSkeleton />;
  if (error) return <div className="card border-red-200 bg-red-50 p-6 text-sm text-red-700">Unable to load applications: {error}</div>;
  return <div className="page-shell"><div className="page-intro"><div><div className="section-label">Review Workspace</div><h1>Applications</h1><p>Review startup submissions and move promising solutions through the procurement workflow.</p></div></div><div className="card grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-5"><input className="input-shell" placeholder="Search applications" value={filters.query} onChange={(event) => setFilters({ ...filters, query: event.target.value })} /><Select label="Challenge" value={filters.challenge} options={challenges.map((item) => [item.challenge_id, item.title])} onChange={(value) => setFilters({ ...filters, challenge: value })} /><Select label="Department" value={filters.department} options={departments.map((item) => [item.department_id, item.name])} onChange={(value) => setFilters({ ...filters, department: value })} /><Select label="Status" value={filters.status} options={unique(applications.map((item) => item.status)) .map((value) => [value, value.replace(/_/g, " ")])} onChange={(value) => setFilters({ ...filters, status: value })} /><select className="filter-control" value={filters.sort} onChange={(event) => setFilters({ ...filters, sort: event.target.value })}><option value="date">Sort by date</option><option value="score">Sort by score</option></select></div><div className="flex items-center justify-between"><div className="section-label">{rows.length} applications</div><div className="text-xs text-slate-400">Updated from live MAITRI data</div></div><div className="card overflow-x-auto"><table className="data-table w-full min-w-[850px] border-collapse"><thead><tr><th className="px-5 pt-4">Startup</th><th>Challenge</th><th>Department</th><th>Submitted</th><th>Match score</th><th>Status</th><th className="pr-5">Action</th></tr></thead><tbody>{rows.map(({ application, startup, challenge }) => <tr key={application.application_id}><td className="px-5"><div className="font-bold text-[#0b2d4a]">{startup?.company_name || application.startup_id}</div><div className="text-xs text-slate-400">{application.application_id}</div></td><td>{challenge?.title || application.challenge_id}</td><td>{departments.find((item) => item.department_id === challenge?.department_id)?.name || "Not provided"}</td><td>{new Date(application.submitted_at).toLocaleDateString()}</td><td className="font-bold text-[#d95300]">{application.match_score}%</td><td><Badge status={application.status} /></td><td className="pr-5"><Link className="text-sm font-bold text-[#d95300]" to={`/applications/${application.application_id}`}>Review <span aria-hidden="true">→</span></Link></td></tr>)}</tbody></table></div>{!rows.length && <div className="empty-state">No applications match the selected filters.</div>}</div>;
}

function Select({ label, value, options, onChange }) { return <select className="filter-control" aria-label={label} value={value} onChange={(event) => onChange(event.target.value)}><option value="ALL">{label}</option>{options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}</select>; }
function unique(values) { return [...new Set(values)]; }
function ApplicationSkeleton() { return <div className="page-shell animate-pulse"><div className="h-24 rounded-2xl bg-slate-200" /><div className="h-20 rounded-2xl bg-slate-200" /><div className="h-80 rounded-2xl bg-slate-200" /></div>; }

function PilotWorkflowPage({ type, filter }) {
  const config = PAGE_CONFIG[type];
  return <SimpleResourcePage config={config} load={api.getPilots} filter={filter} renderItem={(pilot) => (
    <div key={pilot.pilot_id} className="card p-5">
      <div className="flex items-start justify-between gap-4"><div><div className="text-base font-bold text-[#0b2d4a]">{pilot.location}</div><div className="mt-1 text-sm text-slate-500">{pilot.startup_id} · Challenge {pilot.challenge_id}</div></div><Badge status={pilot.status} /></div>
      <div className="mt-5 grid grid-cols-2 gap-4 text-sm"><div><div className="text-xs uppercase tracking-wider text-slate-400">Duration</div><div className="mt-1 font-semibold text-slate-700">{pilot.duration_months} months</div></div><div><div className="text-xs uppercase tracking-wider text-slate-400">Recommendation</div><div className="mt-1">{pilot.scale_recommendation ? <Badge status={pilot.scale_recommendation} /> : <span className="text-slate-400">Pending</span>}</div></div></div>
    </div>
  )} />;
}

function SimpleResourcePage({ config, load, filter = () => true, renderItem }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const Icon = config.icon;

  useEffect(() => {
    load().then(setItems).finally(() => setLoading(false));
  }, [load]);

  const visibleItems = useMemo(() => items.filter(filter), [filter, items]);
  if (loading) return <Loading label={`Loading ${config.title.toLowerCase()}...`} />;

  return <div className="page-shell">
    <div className="page-intro"><div><div className="section-label">{config.eyebrow}</div><h1 className="flex items-center gap-3 text-3xl font-black tracking-[-0.045em] text-[#0b2d4a] md:text-4xl"><Icon className="h-8 w-8 text-[#ff6b0a]" />{config.title}</h1><p>{config.description}</p></div></div>
    <div className="flex items-center justify-between"><div className="section-label">{visibleItems.length} records</div><div className="text-xs text-slate-400">Updated from live MAITRI data</div></div>
    <div className="grid gap-4 xl:grid-cols-2">{visibleItems.map(renderItem)}</div>
    {visibleItems.length === 0 && <div className="empty-state">{config.empty}</div>}
  </div>;
}
