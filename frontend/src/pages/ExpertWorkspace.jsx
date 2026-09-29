import { useEffect, useMemo, useState } from "react";
import { Link, Route, Routes, useLocation, useParams } from "react-router-dom";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  FileCheck2,
  FileText,
  Flag,
  ListChecks,
  MessageSquareText,
  RefreshCw,
  Rocket,
  Save,
  UserRound,
} from "lucide-react";
import api from "../api/client.js";
import Loading from "../components/Loading.jsx";
import Badge from "../components/Badge.jsx";
import ExpertEvaluationDetails, { ExpertEvaluationSummary } from "./ExpertEvaluationDetails.jsx";

const REVIEWABLE_STATUSES = new Set(["SUBMITTED", "UNDER_REVIEW"]);
const DUE_SOON_DAYS = 7;
const EXPERT_SCORECARDS_KEY = "maitri-expert-evaluation-scorecards";
const PILOT_REVIEW_NOTES_KEY = "maitri-expert-pilot-review-notes";
const STARTUP_SUBMISSIONS_KEY = "maitri-startup-application-submissions";
const EXPERT_PROFILE_KEY = "maitri-expert-profile";

function readExpertScorecards() {
  try {
    return JSON.parse(localStorage.getItem(EXPERT_SCORECARDS_KEY) || "{}");
  } catch {
    return {};
  }
}

function readPilotReview(pilotId) {
  try {
    const reviews = JSON.parse(localStorage.getItem(PILOT_REVIEW_NOTES_KEY) || "{}");
    return reviews[pilotId] || { reviewedEvidence: [], technicalComment: "", validation: "NOT_REVIEWED", flaggedIssues: "" };
  } catch {
    return { reviewedEvidence: [], technicalComment: "", validation: "NOT_REVIEWED", flaggedIssues: "" };
  }
}

function readSubmittedEvidence(applicationId) {
  try {
    const submissions = JSON.parse(localStorage.getItem(STARTUP_SUBMISSIONS_KEY) || "[]");
    return submissions.find((submission) => submission.application_id === applicationId)?.documents || [];
  } catch {
    return [];
  }
}

function readExpertProfile() {
  const defaults = {
    name: "MAITRI Expert",
    organization: "",
    domain: "",
    areasOfExpertise: "",
    technicalSkills: "",
    industryExperience: "",
    certifications: "",
    yearsOfExperience: "",
    availability: "AVAILABLE",
    conflictOfInterest: "",
    conflictDeclared: false,
    verificationStatus: "PENDING",
  };
  try {
    return { ...defaults, ...JSON.parse(localStorage.getItem(EXPERT_PROFILE_KEY) || "{}") };
  } catch {
    return defaults;
  }
}

export default function ExpertWorkspace() {
  const [applications, setApplications] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [startups, setStartups] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [pilots, setPilots] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [clarifications, setClarifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [evaluatingId, setEvaluatingId] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const location = useLocation();

  const loadWorkspace = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const [applicationRows, evaluationRows, startupRows, challengeRows, pilotRows, departmentRows] = await Promise.all([
        api.getApplications(),
        api.getEvaluations(),
        api.getStartups(),
        api.getChallenges(),
        api.getPilots(),
        api.getDepartments(),
      ]);
      setApplications(applicationRows);
      setEvaluations(evaluationRows);
      setStartups(startupRows);
      setChallenges(challengeRows);
      setPilots(pilotRows);
      setDepartments(departmentRows);
      const clarificationRows = (await Promise.all(applicationRows.map((application) => api.getClarificationRequests(application.application_id).catch(() => [])))).flat();
      setClarifications(clarificationRows);
    } catch (requestError) {
      setError(requestError.response?.data?.detail || requestError.message || "Unable to load the expert workspace.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadWorkspace();
  }, []);

  const evaluationsByApplication = useMemo(
    () => new Map(evaluations.map((evaluation) => [evaluation.application_id, evaluation])),
    [evaluations],
  );
  const evaluationQueue = useMemo(
    () => applications
      .filter((application) => REVIEWABLE_STATUSES.has(application.status) && !evaluationsByApplication.has(application.application_id))
      .map((application) => ({
        ...application,
        deadline: getDeadline(application),
        evaluationType: application.evaluation_type || "Startup Application Review",
      }))
      .sort((left, right) => new Date(left.deadline || left.submitted_at) - new Date(right.deadline || right.submitted_at)),
    [applications, evaluationsByApplication],
  );
  const pendingEvaluations = evaluationQueue.filter((application) => application.status === "SUBMITTED");
  const inProgressEvaluations = evaluationQueue.filter((application) => application.status === "UNDER_REVIEW");
  const dueSoonEvaluations = evaluationQueue.filter((application) => isDueSoon(application.deadline));
  const assignedChallenges = useMemo(() => {
    const activeIds = new Set(evaluationQueue.map((application) => application.challenge_id));
    return challenges.filter((challenge) => activeIds.has(challenge.challenge_id));
  }, [challenges, evaluationQueue]);
  const activePilotReviews = pilots.filter((pilot) => pilot.status === "ACTIVE");

  const startEvaluation = async (applicationId) => {
    setEvaluatingId(applicationId);
    setActionError("");
    setActionMessage("");
    try {
      const evaluation = await api.generateEvaluation(applicationId);
      setEvaluations((current) => [
        evaluation,
        ...current.filter((item) => item.application_id !== applicationId),
      ]);
      setActionMessage(`Evaluation created for ${applicationId}.`);
    } catch (requestError) {
      setActionError(requestError.response?.data?.detail || requestError.message || "Unable to start the evaluation.");
    } finally {
      setEvaluatingId("");
    }
  };

  if (loading) return <Loading label="Loading expert workspace..." />;
  if (error) {
    return (
      <div className="page-shell">
        <WorkspaceHeader onRefresh={() => loadWorkspace(true)} refreshing={refreshing} />
        <div role="alert" className="card border-red-200 bg-red-50 p-6 text-sm text-red-700">
          Unable to load expert workspace: {error}
          <button type="button" className="ml-3 font-bold underline" onClick={() => loadWorkspace(true)}>Retry</button>
        </div>
      </div>
    );
  }

  const sharedProps = {
    applications,
    evaluations,
    evaluationQueue,
    pendingEvaluations,
    inProgressEvaluations,
    dueSoonEvaluations,
    evaluationsByApplication,
    startups,
    challenges,
    departments,
    clarifications,
    assignedChallenges,
    pilots,
    activePilotReviews,
    evaluatingId,
    onStartEvaluation: startEvaluation,
    onRefresh: () => loadWorkspace(true),
    refreshing,
    actionError,
    actionMessage,
  };

  return (
    <div className="page-shell">
      <WorkspaceHeader onRefresh={() => loadWorkspace(true)} refreshing={refreshing} />
      {actionError && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{actionError}</div>}
      {actionMessage && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{actionMessage}</div>}
      <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm leading-5 text-blue-900">
        Expert permissions: view assigned challenges, startup applications, relevant documents, evaluations, clarifications, and pilots; submit technical scores and comments. Government decisions, contracts, payments, procurement rules, and scale-up controls are unavailable in this workspace.
      </div>
      <Routes>
        <Route path="/" element={<ExpertDashboard {...sharedProps} />} />
        <Route path="evaluations/:applicationId/summary" element={<ExpertEvaluationSummary {...sharedProps} />} />
        <Route path="evaluations/:applicationId" element={<ExpertEvaluationDetails {...sharedProps} />} />
        <Route path="assigned-evaluations" element={<EvaluationList {...sharedProps} filter="all" />} />
        <Route path="assigned-evaluations/pending" element={<EvaluationList {...sharedProps} filter="pending" />} />
        <Route path="assigned-evaluations/in-progress" element={<EvaluationList {...sharedProps} filter="in-progress" />} />
        <Route path="assigned-evaluations/completed" element={<EvaluationList {...sharedProps} filter="completed" />} />
        <Route path="assigned-challenges" element={<AssignedChallenges challenges={assignedChallenges} queue={evaluationQueue} />} />
        <Route path="evaluation-history" element={<EvaluationHistory evaluations={evaluations} applications={applications} startups={startups} challenges={challenges} />} />
        <Route path="pilot-reviews" element={<PilotReviews pilots={pilots} startups={startups} challenges={challenges} departments={departments} />} />
        <Route path="pilot-reviews/:pilotId" element={<PilotReviewDetail pilots={pilots} startups={startups} challenges={challenges} departments={departments} />} />
        <Route path="notifications" element={<ExpertNotifications queue={evaluationQueue} activePilots={activePilotReviews} clarifications={clarifications} applications={applications} startups={startups} challenges={challenges} />} />
        <Route path="profile" element={<ExpertProfile evaluations={evaluations} />} />
        <Route path="*" element={<ExpertDashboard {...sharedProps} />} />
      </Routes>
    </div>
  );
}

function WorkspaceHeader({ onRefresh, refreshing }) {
  const { pathname } = useLocation();
  const title = pathname.endsWith("/assigned-evaluations/pending") ? "Pending Evaluations"
    : pathname.endsWith("/assigned-evaluations/in-progress") ? "Evaluations In Progress"
      : pathname.endsWith("/assigned-evaluations/completed") ? "Completed Evaluations"
        : pathname.endsWith("/assigned-evaluations") ? "Assigned Evaluations"
          : pathname.endsWith("/assigned-challenges") ? "Assigned Challenges"
            : pathname.endsWith("/evaluation-history") ? "Evaluation History"
              : pathname.includes("/pilot-reviews") ? "Pilot Reviews"
                : pathname.endsWith("/notifications") ? "Notifications"
                  : pathname.endsWith("/profile") ? "Expert Profile"
                    : "Expert Dashboard";
  return (
    <div className="page-intro">
      <div>
        <div className="section-label">Expert Workspace</div>
        <h1>{title}</h1>
        <p>Your assigned reviews, challenges, and pilot follow-ups in one place.</p>
      </div>
      <button type="button" onClick={onRefresh} disabled={refreshing} className="btn-secondary">
        <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
        {refreshing ? "Refreshing..." : "Refresh"}
      </button>
    </div>
  );
}

function ExpertDashboard(props) {
  const {
    pendingEvaluations,
    inProgressEvaluations,
    dueSoonEvaluations,
    evaluationQueue,
    evaluations,
    assignedChallenges,
    activePilotReviews,
  } = props;
  const cards = [
    { label: "Pending Evaluations", value: pendingEvaluations.length, icon: ClipboardCheck, tone: "orange" },
    { label: "Evaluations Due Soon", value: dueSoonEvaluations.length, icon: CalendarClock, tone: "blue", note: dueSoonEvaluations.length ? `Due within ${DUE_SOON_DAYS} days` : evaluationQueue.some((application) => application.deadline) ? `None due within ${DUE_SOON_DAYS} days` : "No deadline data supplied" },
    { label: "Completed Evaluations", value: evaluations.length, icon: CheckCircle2, tone: "green" },
    { label: "Assigned Challenges", value: assignedChallenges.length, icon: ListChecks, tone: "purple" },
    { label: "Active Pilot Reviews", value: activePilotReviews.length, icon: Rocket, tone: "blue" },
  ];
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map(({ label, value, icon: Icon, tone, note }) => (
          <div className="card p-5" key={label}>
            <div className="flex items-start justify-between gap-3">
              <div className="text-sm font-semibold leading-5 text-slate-500">{label}</div>
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${toneClass(tone)}`}><Icon className="h-4 w-4" /></span>
            </div>
            <div className="mt-3 text-3xl font-black text-[#0b2d4a]">{value}</div>
            {note && <div className="mt-1 text-[11px] text-slate-400">{note}</div>}
          </div>
        ))}
      </div>

      <section className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5 sm:p-6">
          <div><div className="section-label">Review Workspace</div><h2 className="mt-2 text-xl font-black text-slate-900">Evaluation Queue</h2><p className="mt-1 text-sm text-slate-500">Applications awaiting an expert evaluation.</p></div>
          <Link to="/expert/assigned-evaluations" className="btn-secondary">View all <ArrowRight className="h-4 w-4" /></Link>
        </div>
        <EvaluationQueueTable {...props} applications={props.evaluationQueue.slice(0, 8)} />
        {!props.evaluationQueue.length && <div className="empty-state m-5">There are no applications awaiting evaluation.</div>}
        <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-400 sm:px-6">Deadlines are shown when supplied by the API. Missing deadline values are displayed as “Not set.”</p>
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="card p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3"><div><div className="section-label">Assigned Challenges</div><h2 className="mt-2 text-lg font-black text-slate-900">Challenge coverage</h2></div><Link to="/expert/assigned-challenges" className="text-sm font-bold text-[#1d4ed8] hover:underline">View all</Link></div>
          {assignedChallenges.length ? <div className="mt-4 divide-y divide-slate-100">{assignedChallenges.slice(0, 4).map((challenge) => <div key={challenge.challenge_id} className="py-3"><div className="font-bold text-slate-800">{challenge.title}</div><div className="mt-1 text-xs text-slate-500">{challenge.sector || "Sector not provided"} · {props.evaluationQueue.filter((application) => application.challenge_id === challenge.challenge_id).length} open reviews</div></div>)}</div> : <p className="mt-4 text-sm text-slate-500">No challenges are linked to open evaluations.</p>}
        </section>
        <section className="card p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3"><div><div className="section-label">Pilot Reviews</div><h2 className="mt-2 text-lg font-black text-slate-900">Active pilot reviews</h2></div><Link to="/expert/pilot-reviews" className="text-sm font-bold text-[#1d4ed8] hover:underline">View all</Link></div>
          {activePilotReviews.length ? <div className="mt-4 divide-y divide-slate-100">{activePilotReviews.slice(0, 4).map((pilot) => <PilotRow key={pilot.pilot_id} pilot={pilot} startups={props.startups} challenges={props.challenges} />)}</div> : <p className="mt-4 text-sm text-slate-500">No active pilot reviews at this time.</p>}
        </section>
      </div>
    </>
  );
}

function EvaluationList({ filter, pendingEvaluations, inProgressEvaluations, evaluations, applications, startups, challenges, evaluationsByApplication, evaluatingId, onStartEvaluation, actionError }) {
  const location = useLocation();
  const lists = {
    all: [...pendingEvaluations, ...inProgressEvaluations],
    pending: pendingEvaluations,
    "in-progress": inProgressEvaluations,
    completed: applications.filter((application) => evaluationsByApplication.has(application.application_id)),
  };
  const titles = { all: "Assigned Evaluations", pending: "Pending Evaluations", "in-progress": "Evaluations In Progress", completed: "Completed Evaluations" };
  const items = lists[filter] || lists.all;
  return (
    <section className="card overflow-hidden">
      <div className="p-5 sm:p-6"><div className="section-label">Expert Reviews</div><h2 className="mt-2 text-2xl font-black text-slate-900">{titles[filter]}</h2><p className="mt-1 text-sm text-slate-500">{filter === "completed" ? `${evaluations.length} completed evaluation${evaluations.length === 1 ? "" : "s"}` : "Applications currently awaiting an expert evaluation."}</p></div>
      <div className="flex flex-wrap gap-2 border-y border-slate-100 px-5 py-3 sm:px-6">
        {[
          ["all", "All open"],
          ["pending", "Pending"],
          ["in-progress", "In Progress"],
          ["completed", "Completed"],
        ].map(([key, label]) => <Link key={key} to={key === "all" ? "/expert/assigned-evaluations" : `/expert/assigned-evaluations/${key}`} className={`rounded-full px-3 py-1.5 text-xs font-bold ${filter === key ? "bg-[#fff3eb] text-[#d95300]" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>{label}</Link>)}
      </div>
      {filter === "completed" ? (
        <EvaluationHistoryTable evaluations={evaluations} applications={applications} startups={startups} challenges={challenges} />
      ) : (
        <EvaluationQueueTable applications={items} startups={startups} challenges={challenges} evaluatingId={evaluatingId} actionError={actionError} />
      )}
      {!items.length && <div className="empty-state m-5">{filter === "completed" ? "No evaluations have been completed yet." : "No evaluations match this queue."}</div>}
      <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-400 sm:px-6">Evaluation type and deadlines are provided by the assignment service when available. Unprovided values are labeled explicitly.</div>
    </section>
  );
}

function EvaluationQueueTable({ applications, startups, challenges, evaluatingId = "", actionError }) {
  if (!applications.length) return null;
  return (
    <div className="overflow-x-auto">
      <table className="data-table w-full min-w-[1050px] border-collapse">
        <thead><tr><th className="px-5 pt-4 sm:px-6">Startup name</th><th>Challenge</th><th>Sector</th><th>Evaluation type</th><th>Deadline</th><th>Current status</th><th className="pr-5 sm:pr-6">Action</th></tr></thead>
        <tbody>
          {applications.map((application) => {
            const startup = startups.find((item) => item.startup_id === application.startup_id);
            const challenge = challenges.find((item) => item.challenge_id === application.challenge_id);
            return (
              <tr key={application.application_id}>
                <td className="px-5 font-bold text-[#0b2d4a] sm:px-6">{startup?.company_name || application.startup_id}</td>
                <td className="max-w-64 truncate" title={challenge?.title || application.challenge_id}>{challenge?.title || application.challenge_id}</td>
                <td>{challenge?.sector || "Not provided"}</td>
                <td>{application.evaluation_type || "Application review"}</td>
                <td>{formatDeadline(getDeadline(application))}</td>
                <td><Badge status={application.status} /></td>
                <td className="pr-5 sm:pr-6"><Link to={`/expert/evaluations/${application.application_id}`} className="btn-primary whitespace-nowrap px-3 py-2 text-xs"><FileCheck2 className="h-3.5 w-3.5" />{application.status === "UNDER_REVIEW" ? "Continue Evaluation" : "Start Evaluation"}</Link></td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {actionError && <div role="alert" className="m-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{actionError}</div>}
    </div>
  );
}

function AssignedChallenges({ challenges, queue }) {
  return (
    <section className="card p-5 sm:p-6">
      <div className="section-label">Expert Workload</div><h2 className="mt-2 text-2xl font-black text-slate-900">Assigned Challenges</h2><p className="mt-1 text-sm text-slate-500">Challenges associated with your open evaluation queue.</p>
      {challenges.length ? <div className="mt-5 grid gap-4 lg:grid-cols-2">{challenges.map((challenge) => <article key={challenge.challenge_id} className="rounded-xl border border-slate-200 p-4"><div className="text-xs font-bold uppercase tracking-[0.12em] text-[#d95300]">{challenge.sector || "Sector not provided"}</div><h3 className="mt-2 font-bold leading-6 text-slate-900">{challenge.title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{challenge.description}</p><div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500"><span>{queue.filter((application) => application.challenge_id === challenge.challenge_id).length} open evaluations</span><span>{challenge.challenge_id}</span></div></article>)}</div> : <div className="empty-state mt-5">No challenges are associated with the current expert evaluation queue.</div>}
    </section>
  );
}

function EvaluationHistory({ evaluations, applications, startups, challenges }) {
  const [filters, setFilters] = useState({ sector: "ALL", date: "", status: "ALL" });
  const scorecards = readExpertScorecards();
  const sectors = [...new Set(challenges.map((challenge) => challenge.sector).filter(Boolean))].sort();
  const rows = evaluations.map((evaluation) => {
    const application = applications.find((item) => item.application_id === evaluation.application_id);
    const challenge = challenges.find((item) => item.challenge_id === application?.challenge_id);
    const scorecard = scorecards[evaluation.application_id];
    return { evaluation, application, challenge, scorecard };
  }).filter(({ scorecard }) => ["SUBMITTED", "WITHDRAWN", "REOPENED"].includes(scorecard?.status));
  const filteredRows = rows.filter(({ evaluation, challenge, scorecard }) => {
    const status = historyStatus(scorecard.status);
    const date = scorecard.submittedAt || evaluation.evaluated_at || "";
    return (filters.sector === "ALL" || challenge?.sector === filters.sector)
      && (!filters.date || date.startsWith(filters.date))
      && (filters.status === "ALL" || status === filters.status);
  });
  return (
    <section className="card overflow-hidden">
      <div className="p-5 sm:p-6"><div className="section-label">Your Submitted Work</div><h2 className="mt-2 text-2xl font-black text-slate-900">Evaluation History</h2><p className="mt-1 text-sm text-slate-500">Previously submitted expert evaluations. Drafts are not shown here.</p></div>
      <div className="grid gap-3 border-y border-slate-100 bg-slate-50/70 p-5 sm:grid-cols-3 sm:px-6">
        <select aria-label="Filter by sector" className="filter-control" value={filters.sector} onChange={(event) => setFilters((current) => ({ ...current, sector: event.target.value }))}><option value="ALL">All sectors</option>{sectors.map((sector) => <option key={sector} value={sector}>{sector}</option>)}</select>
        <input aria-label="Filter by date" type="date" className="filter-control" value={filters.date} onChange={(event) => setFilters((current) => ({ ...current, date: event.target.value }))} />
        <select aria-label="Filter by status" className="filter-control" value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}><option value="ALL">All statuses</option><option value="Completed">Completed</option><option value="Withdrawn">Withdrawn</option><option value="Reopened">Reopened</option></select>
      </div>
      <EvaluationHistoryTable rows={filteredRows} startups={startups} />
      {!filteredRows.length && <div className="empty-state m-5">No submitted evaluations match the selected filters.</div>}
    </section>
  );
}

function EvaluationHistoryTable({ rows, startups }) {
  if (!rows.length) return null;
  return (
    <div className="overflow-x-auto">
      <table className="data-table w-full min-w-[1050px] border-collapse">
        <thead><tr><th className="px-5 pt-4 sm:px-6">Challenge</th><th>Startup</th><th>Evaluation date</th><th>Evaluation type</th><th>Score</th><th>Status</th><th className="pr-5 sm:pr-6">View</th></tr></thead>
        <tbody>{rows.map(({ evaluation, application, challenge, scorecard }) => { const startup = startups.find((item) => item.startup_id === application?.startup_id); return <tr key={evaluation.evaluation_id}><td className="px-5 font-bold text-[#0b2d4a] sm:px-6">{challenge?.title || application?.challenge_id || "Challenge unavailable"}</td><td>{startup?.company_name || application?.startup_id || "Unknown startup"}</td><td>{formatHistoryDate(scorecard.submittedAt || evaluation.evaluated_at)}</td><td>{application?.evaluation_type || "Startup Application Review"}</td><td className="font-bold text-[#d95300]">{expertScore(scorecard)}/100</td><td><Badge status={historyStatus(scorecard.status)}>{historyStatus(scorecard.status)}</Badge></td><td className="pr-5 sm:pr-6"><Link to={`/expert/evaluations/${application.application_id}/summary`} className="text-sm font-bold text-[#1d4ed8] hover:underline">View evaluation</Link></td></tr>; })}</tbody>
      </table>
    </div>
  );
}

function historyStatus(status) {
  return status === "WITHDRAWN" ? "Withdrawn" : status === "REOPENED" ? "Reopened" : "Completed";
}

function expertScore(scorecard) {
  const criteria = Object.values(scorecard?.criteria || {}).filter((criterion) => criterion.score !== "");
  return criteria.length ? Math.round(criteria.reduce((total, criterion) => total + Number(criterion.score), 0) / criteria.length) : "—";
}

function formatHistoryDate(value) {
  return value ? new Date(value).toLocaleDateString() : "Not provided";
}

function PilotReviews({ pilots, startups, challenges, departments }) {
  const active = pilots.filter((pilot) => pilot.status === "ACTIVE");
  const completed = pilots.filter((pilot) => pilot.status === "COMPLETED");
  return (
    <div className="space-y-5">
      <section className="card p-5 sm:p-6">
        <div className="section-label">Pilot Oversight</div><h2 className="mt-2 text-2xl font-black text-slate-900">Pilot Reviews</h2><p className="mt-1 text-sm text-slate-500">Monitor active pilots and review completed pilot outcomes.</p>
        <div className="mt-5 grid gap-5 xl:grid-cols-2">
          <PilotGroup title="Active Pilot Reviews" pilots={active} startups={startups} challenges={challenges} departments={departments} />
          <PilotGroup title="Completed Pilots" pilots={completed} startups={startups} challenges={challenges} departments={departments} />
        </div>
      </section>
    </div>
  );
}

function PilotReviewDetail({ pilots, startups, challenges, departments }) {
  const { pilotId } = useParams();
  const pilot = pilots.find((item) => item.pilot_id === pilotId);
  const [kpis, setKpis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [review, setReview] = useState(() => readPilotReview(pilotId));
  const [reviewMessage, setReviewMessage] = useState("");
  const startup = startups.find((item) => item.startup_id === pilot?.startup_id);
  const challenge = challenges.find((item) => item.challenge_id === pilot?.challenge_id);
  const department = departments.find((item) => item.department_id === (pilot?.department_id || challenge?.department_id));
  const applicationEvidence = readSubmittedEvidence(pilot?.application_id);

  useEffect(() => {
    let active = true;
    api.getPilotKpis(pilotId)
      .then((rows) => { if (active) setKpis(rows); })
      .catch((requestError) => { if (active) setError(requestError.response?.data?.detail || requestError.message || "Unable to load pilot metrics."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [pilotId]);

  useEffect(() => {
    setReview(readPilotReview(pilotId));
    setReviewMessage("");
  }, [pilotId]);

  const objectives = pilot?.objectives || challenge?.pilot_objectives || challenge?.desired_outcomes || challenge?.success_metrics || [];
  const evidence = pilot?.evidence_submitted || applicationEvidence;
  const saveReview = (flaggedIssues = review.flaggedIssues) => {
    const nextReview = { ...review, flaggedIssues };
    const reviews = JSON.parse(localStorage.getItem(PILOT_REVIEW_NOTES_KEY) || "{}");
    localStorage.setItem(PILOT_REVIEW_NOTES_KEY, JSON.stringify({ ...reviews, [pilotId]: nextReview }));
    setReview(nextReview);
    setReviewMessage(flaggedIssues ? "Issue flag saved for this pilot review." : "Pilot review saved on this device.");
  };

  if (!pilot) return <div className="card p-6 text-sm text-slate-600">Pilot review not found.</div>;
  return (
    <section className="card p-5 sm:p-6">
      <Link to="/expert/pilot-reviews" className="text-sm font-bold text-[#1d4ed8] hover:underline">← All pilot reviews</Link>
      <div className="mt-5 flex flex-wrap items-start justify-between gap-3"><div><div className="section-label">Read-only Pilot Review · {pilot.pilot_id}</div><h2 className="mt-2 text-2xl font-black text-slate-900">{startup?.company_name || pilot.startup_id}</h2><p className="mt-1 text-sm text-slate-500">{challenge?.title || pilot.challenge_id}</p></div><Badge status={pilot.status} /></div>
      <dl className="mt-5 grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-3"><InfoField label="Location" value={pilot.location || "Not provided"} /><InfoField label="Duration" value={`${pilot.duration_months ?? "Not provided"} months`} /><InfoField label="Started" value={pilot.start_date ? new Date(pilot.start_date).toLocaleDateString() : "Not provided"} /></dl>
      <div className="mt-6 border-t border-slate-100 pt-5"><h3 className="font-bold text-slate-900">Pilot Overview</h3><dl className="mt-3 grid gap-4 sm:grid-cols-2"><div><dt className="text-xs font-semibold text-slate-400">Department</dt><dd className="mt-1 text-sm font-semibold text-slate-700">{department?.name || pilot.department_id || challenge?.department_id || "Not provided"}</dd></div><div className="sm:col-span-2"><dt className="text-xs font-semibold text-slate-400">Pilot objectives</dt><dd className="mt-1 text-sm leading-6 text-slate-700">{Array.isArray(objectives) ? objectives.join("; ") || "Not provided" : objectives || "Not provided"}</dd></div></dl></div>
      <div className="mt-6 border-t border-slate-100 pt-5"><h3 className="font-bold text-slate-900">Pilot KPIs</h3>{loading ? <Loading label="Loading pilot KPIs..." /> : error ? <div role="alert" className="mt-3 text-sm text-red-700">{error}</div> : kpis.length ? <div className="mt-3 grid gap-3 sm:grid-cols-2">{kpis.map((kpi) => <div key={kpi.kpi_id} className="rounded-xl border border-slate-200 p-4"><div className="flex items-center justify-between gap-3"><span className="font-bold text-slate-800">{kpi.metric}</span><Badge status={kpi.status} /></div><p className="mt-2 text-sm text-slate-500">Baseline {kpi.baseline}{kpi.unit} · Target {kpi.target}{kpi.unit} · Actual {kpi.actual}{kpi.unit}</p></div>)}</div> : <div className="empty-state mt-3">No KPI data is available for this pilot.</div>}</div>
      <div className="mt-6 border-t border-slate-100 pt-5"><h3 className="font-bold text-slate-900">Evidence Submitted</h3>{evidence.length ? <div className="mt-3 space-y-2">{evidence.map((item, index) => { const evidenceId = item.id || `${item.name}-${index}`; const reviewed = review.reviewedEvidence.includes(evidenceId); return <label key={evidenceId} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm"><input type="checkbox" checked={reviewed} onChange={() => setReview((current) => ({ ...current, reviewedEvidence: reviewed ? current.reviewedEvidence.filter((id) => id !== evidenceId) : [...current.reviewedEvidence, evidenceId] }))} /><FileText className="h-4 w-4 text-[#1d4ed8]" /><span className="font-semibold text-slate-700">{item.name || "Submitted evidence"}</span><span className="ml-auto text-xs text-slate-400">{item.size ? `${(item.size / 1024 / 1024).toFixed(2)} MB` : "Document"}</span></label>; })}</div> : <div className="empty-state mt-3">No evidence documents are available for this pilot.</div>}</div>
      <div className="mt-6 border-t border-slate-100 pt-5"><h3 className="font-bold text-slate-900">Milestones</h3>{pilot.milestones?.length ? <div className="mt-3 space-y-2">{pilot.milestones.map((milestone, index) => <div key={`${milestone.title}-${index}`} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm"><span className="text-slate-700">{milestone.title}</span><span className={milestone.done ? "font-semibold text-emerald-700" : "font-semibold text-amber-700"}>{milestone.done ? "Completed" : "Pending"}</span></div>)}</div> : <p className="mt-2 text-sm text-slate-500">No milestones recorded.</p>}</div>
      <form className="mt-6 border-t border-slate-100 pt-5" onSubmit={(event) => { event.preventDefault(); saveReview(); }}><h3 className="font-bold text-slate-900">Expert Technical Review</h3><label className="mt-3 block text-sm font-semibold text-slate-700">Technical performance comments<textarea rows={4} value={review.technicalComment} onChange={(event) => setReview((current) => ({ ...current, technicalComment: event.target.value }))} className="input-shell mt-2" placeholder="Comment on observed technical performance, reliability, and implementation quality." /></label><label className="mt-4 block text-sm font-semibold text-slate-700">Technical observations<select value={review.validation} onChange={(event) => setReview((current) => ({ ...current, validation: event.target.value }))} className="input-shell mt-2"><option value="NOT_REVIEWED">Not reviewed</option><option value="VALIDATED">Validated</option><option value="REQUIRES_FOLLOW_UP">Requires follow-up</option></select></label><label className="mt-4 block text-sm font-semibold text-slate-700">Flag issues <span className="font-normal text-slate-400">(optional)</span><textarea rows={3} value={review.flaggedIssues} onChange={(event) => setReview((current) => ({ ...current, flaggedIssues: event.target.value }))} className="input-shell mt-2" placeholder="Describe any technical issue, evidence gap, or risk that needs attention." /></label>{reviewMessage && <div role="status" className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{reviewMessage}</div>}<div className="mt-4 flex flex-wrap justify-end gap-3"><button type="button" className="btn-secondary" onClick={() => saveReview(review.flaggedIssues || "Issue flagged for review.")}><Flag className="h-4 w-4" />Flag Issues</button><button type="submit" className="btn-primary"><Save className="h-4 w-4" />Save Review</button></div></form>
      <p className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs leading-5 text-blue-800">This expert view is read-only and does not expose Government pilot-management actions.</p>
    </section>
  );
}

function InfoField({ label, value }) {
  return <div><dt className="text-xs font-semibold text-slate-400">{label}</dt><dd className="mt-1 text-sm font-semibold text-slate-700">{value}</dd></div>;
}

function PilotGroup({ title, pilots, startups, challenges }) {
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <h3 className="font-bold text-slate-900">{title} <span className="ml-1 text-slate-400">({pilots.length})</span></h3>
      {pilots.length ? <div className="mt-3 divide-y divide-slate-100">{pilots.map((pilot) => <PilotRow key={pilot.pilot_id} pilot={pilot} startups={startups} challenges={challenges} />)}</div> : <p className="mt-3 text-sm text-slate-500">No pilots in this group.</p>}
    </div>
  );
}

function PilotRow({ pilot, startups, challenges }) {
  const startup = startups.find((item) => item.startup_id === pilot.startup_id);
  const challenge = challenges.find((item) => item.challenge_id === pilot.challenge_id);
  const milestoneCount = pilot.milestones?.length || 0;
  const completedCount = pilot.milestones?.filter((milestone) => milestone.done).length || 0;
  return (
    <Link to={`/expert/pilot-reviews/${pilot.pilot_id}`} className="block py-3 hover:bg-slate-50">
      <div className="flex items-center justify-between gap-3"><div className="font-bold text-slate-800">{startup?.company_name || pilot.startup_id}</div><Badge status={pilot.status} /></div>
      <div className="mt-1 line-clamp-2 text-sm text-slate-500">{challenge?.title || pilot.challenge_id}</div>
      <div className="mt-1 text-xs text-slate-400">{pilot.location || "Location not provided"} · {milestoneCount ? `${completedCount}/${milestoneCount} milestones` : "No milestones recorded"}</div>
    </Link>
  );
}

function ExpertNotifications({ queue, activePilots, clarifications, applications, startups, challenges }) {
  const [category, setCategory] = useState("ALL");
  const scorecards = readExpertScorecards();
  const notifications = [
    ...queue.map((application) => ({
      id: `evaluation-assignment-${application.application_id}`,
      category: "Evaluations",
      title: application.status === "UNDER_REVIEW" ? "Evaluation in progress" : "New evaluation assignment",
      detail: `${application.application_id} · ${challengeLabel(application.challenge_id, challenges)}${application.deadline ? ` · Due ${formatDeadline(application.deadline)}` : " · No deadline supplied"}`,
      icon: ClipboardCheck,
    })),
    ...queue.filter((application) => application.deadline).map((application) => ({
      id: `evaluation-deadline-${application.application_id}`,
      category: "Evaluations",
      title: "Evaluation deadline",
      detail: `${application.application_id} · Due ${formatDeadline(application.deadline)}${isDueSoon(application.deadline) ? " · Due soon" : ""}`,
      icon: CalendarClock,
    })),
    ...clarifications.filter((item) => item.startup_response).map((item) => ({
      id: `clarification-${item.clarification_id}`,
      category: "Clarifications",
      title: "Clarification response received",
      detail: `${item.application_id} · ${item.question}`,
      icon: MessageSquareText,
    })),
    ...Object.entries(scorecards).filter(([, scorecard]) => scorecard.status === "REOPENED").map(([applicationId]) => ({
      id: `reopened-${applicationId}`,
      category: "Evaluations",
      title: "Evaluation reopened",
      detail: `${applicationId} · Review required again`,
      icon: CheckCircle2,
    })),
    ...activePilots.map((pilot) => ({
      id: `pilot-assignment-${pilot.pilot_id}`,
      category: "Pilots",
      title: "Pilot review assignment",
      detail: `${pilot.pilot_id} · ${startupLabel(pilot.startup_id, startups)} · ${pilot.location || "Location not provided"}`,
      icon: Rocket,
    })),
    ...activePilots.filter((pilot) => pilot.end_date || pilot.review_due_date).map((pilot) => ({
      id: `pilot-deadline-${pilot.pilot_id}`,
      category: "Pilots",
      title: "Upcoming pilot review deadline",
      detail: `${pilot.pilot_id} · Due ${formatDeadline(pilot.end_date || pilot.review_due_date)}`,
      icon: CalendarClock,
    })),
  ];
  const visibleNotifications = category === "ALL" ? notifications : notifications.filter((notification) => notification.category === category);
  const categories = ["ALL", "Evaluations", "Clarifications", "Pilots", "System"];
  return (
    <section className="card p-5 sm:p-6">
      <div className="section-label">Updates</div><h2 className="mt-2 text-2xl font-black text-slate-900">Notifications</h2><p className="mt-1 text-sm text-slate-500">Assignments, responses, and deadlines for your expert workspace.</p>
      <div className="mt-5 flex flex-wrap gap-2" role="tablist" aria-label="Notification categories">{categories.map((item) => <button key={item} type="button" role="tab" aria-selected={category === item} onClick={() => setCategory(item)} className={`rounded-full px-3 py-1.5 text-xs font-bold ${category === item ? "bg-[#fff3eb] text-[#d95300]" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>{item === "ALL" ? "All" : item}</button>)}</div>
      {visibleNotifications.length ? <div className="mt-4 divide-y divide-slate-100">{visibleNotifications.map(({ id, category: itemCategory, title, detail, icon: Icon }) => <div key={id} className="flex gap-3 py-4"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><Icon className="h-4 w-4" /></span><div><div className="flex flex-wrap items-center gap-2"><div className="font-bold text-slate-800">{title}</div><span className="tag">{itemCategory}</span></div><div className="mt-1 text-sm text-slate-500">{detail}</div></div></div>)}</div> : <div className="empty-state mt-5">No notifications in this category.</div>}
      <p className="mt-4 text-xs text-slate-400">System notifications will appear here when administrator or account events are available.</p>
    </section>
  );
}

function challengeLabel(challengeId, challenges) {
  return challenges.find((challenge) => challenge.challenge_id === challengeId)?.title || challengeId;
}

function startupLabel(startupId, startups) {
  return startups.find((startup) => startup.startup_id === startupId)?.company_name || startupId;
}

function ExpertProfile({ evaluations }) {
  const [profile, setProfile] = useState(readExpertProfile);
  const [message, setMessage] = useState("");

  const updateProfile = (field, value) => {
    setProfile((current) => ({ ...current, [field]: value }));
    setMessage("");
  };

  const saveProfile = (event) => {
    event.preventDefault();
    localStorage.setItem(EXPERT_PROFILE_KEY, JSON.stringify(profile));
    setMessage("Profile updated on this device.");
  };

  return (
    <form className="space-y-5" onSubmit={saveProfile}>
      <section className="card p-5 sm:p-6"><div className="section-label">Account</div><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="mt-2 text-2xl font-black text-slate-900">Expert Profile</h2><p className="mt-1 text-sm text-slate-500">Keep your expertise and availability current for evaluation assignments.</p></div><div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#e8f1ff] text-[#1d4ed8]"><UserRound className="h-6 w-6" /></div></div><div className="mt-5 grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2"><ProfileInput label="Name" value={profile.name} onChange={(value) => updateProfile("name", value)} required /><ProfileInput label="Organization" value={profile.organization} onChange={(value) => updateProfile("organization", value)} /><ProfileInput label="Domain" value={profile.domain} onChange={(value) => updateProfile("domain", value)} /><ProfileInput label="Years of Experience" type="number" min="0" value={profile.yearsOfExperience} onChange={(value) => updateProfile("yearsOfExperience", value)} /></div></section>
      <section className="card p-5 sm:p-6"><div className="section-label">Expertise</div><div className="mt-4 grid gap-4 sm:grid-cols-2"><ProfileTextArea label="Areas of Expertise" value={profile.areasOfExpertise} onChange={(value) => updateProfile("areasOfExpertise", value)} placeholder="e.g. public health innovation, digital service delivery" /><ProfileTextArea label="Technical Skills" value={profile.technicalSkills} onChange={(value) => updateProfile("technicalSkills", value)} placeholder="e.g. data platforms, AI/ML, cybersecurity" /><ProfileTextArea label="Industry Experience" value={profile.industryExperience} onChange={(value) => updateProfile("industryExperience", value)} placeholder="Summarize relevant sectors and delivery experience." /><ProfileTextArea label="Certifications" value={profile.certifications} onChange={(value) => updateProfile("certifications", value)} placeholder="List certifications, licenses, or professional memberships." /></div></section>
      <section className="card p-5 sm:p-6"><div className="section-label">Assignment Readiness</div><div className="mt-4 grid gap-4 sm:grid-cols-2"><div><div className="text-xs font-bold uppercase tracking-[0.1em] text-slate-400">Expertise Verification Status</div><div className="mt-2 inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm font-bold text-amber-800">{profile.verificationStatus === "VERIFIED" ? "Verified" : "Pending verification"}</div><p className="mt-2 text-xs leading-5 text-slate-500">Verification is managed by an authorized administrator.</p></div><label className="block text-sm font-semibold text-slate-700">Availability<select className="input-shell mt-2" value={profile.availability} onChange={(event) => updateProfile("availability", event.target.value)}><option value="AVAILABLE">Available for assignments</option><option value="LIMITED">Limited availability</option><option value="UNAVAILABLE">Unavailable</option></select></label><div className="sm:col-span-2"><div className="text-xs font-bold uppercase tracking-[0.1em] text-slate-400">Previous Evaluations</div><div className="mt-2 text-2xl font-black text-[#0b2d4a]">{evaluations.length}</div><p className="mt-1 text-xs text-slate-500">Evaluations currently recorded in the workspace.</p></div></div></section>
      <section className="card p-5 sm:p-6"><div className="section-label">Conflict of Interest</div><label className="mt-4 flex items-start gap-3 text-sm font-semibold text-slate-700"><input type="checkbox" checked={profile.conflictDeclared} onChange={(event) => updateProfile("conflictDeclared", event.target.checked)} className="mt-1 h-4 w-4 rounded border-slate-300 text-[#ff6b0a]" />I have reviewed my assignments and declare any conflicts of interest below.</label><ProfileTextArea label="Conflict of Interest Declaration" value={profile.conflictOfInterest} onChange={(value) => updateProfile("conflictOfInterest", value)} placeholder="Declare relevant relationships, financial interests, or write 'No conflicts to declare'." /></section>
      {message && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</div>}
      <div className="flex justify-end"><button type="submit" className="btn-primary"><Save className="h-4 w-4" />Save Profile</button></div>
    </form>
  );
}

function ProfileInput({ label, value, onChange, type = "text", min, required = false }) {
  return <label className="block text-sm font-semibold text-slate-700">{label}{required && <span className="text-red-600"> *</span>}<input required={required} type={type} min={min} value={value} onChange={(event) => onChange(event.target.value)} className="input-shell mt-2" /></label>;
}

function ProfileTextArea({ label, value, onChange, placeholder }) {
  return <label className="block text-sm font-semibold text-slate-700">{label}<textarea rows={3} value={value} onChange={(event) => onChange(event.target.value)} className="input-shell mt-2" placeholder={placeholder} /></label>;
}

function toneClass(tone) {
  const classes = {
    orange: "bg-[#fff3eb] text-[#d95300]",
    blue: "bg-blue-50 text-blue-700",
    green: "bg-emerald-50 text-emerald-700",
    purple: "bg-violet-50 text-violet-700",
  };
  return classes[tone] || classes.blue;
}

function getDeadline(application) {
  return application.deadline || application.due_date || application.due_at || null;
}

function isDueSoon(deadline) {
  if (!deadline) return false;
  const remaining = new Date(deadline).getTime() - Date.now();
  return remaining >= 0 && remaining <= DUE_SOON_DAYS * 24 * 60 * 60 * 1000;
}

function formatDeadline(deadline) {
  if (!deadline) return "Not set";
  const parsed = new Date(deadline);
  return Number.isNaN(parsed.getTime()) ? "Not set" : parsed.toLocaleDateString();
}
