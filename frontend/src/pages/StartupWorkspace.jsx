import { useEffect, useMemo, useState } from "react";
import { Link, Route, Routes, useParams, useSearchParams } from "react-router-dom";
import { ArrowRight, Bell, Bookmark, BookmarkCheck, BriefcaseBusiness, Building2, CalendarClock, CheckCircle2, CircleAlert, CircleDollarSign, Download, FileText, MessageSquareText, Rocket, Save, Search, Send, ShieldCheck, UserRound } from "lucide-react";
import api from "../api/client.js";
import Loading from "../components/Loading.jsx";
import Badge from "../components/Badge.jsx";
import StartupApplication from "./StartupApplication.jsx";

const STARTUP_DRAFTS_KEY = "maitri-startup-application-drafts";
const PAYMENT_RECORDS = [];
const STARTUP_PROFILE_KEY = "maitri-startup-profile-overrides";

function readStartupProfileOverrides(startupId) {
  try {
    const profiles = JSON.parse(localStorage.getItem(STARTUP_PROFILE_KEY) || "{}");
    return profiles[startupId] || {};
  } catch {
    return {};
  }
}

export default function StartupWorkspace() {
  const [startups, setStartups] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [applications, setApplications] = useState([]);
  const [clarifications, setClarifications] = useState([]);
  const [pilots, setPilots] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [profileRevision, setProfileRevision] = useState(0);
  const requestedStartup = searchParams.get("startup");
  const selectedStartup = startups.find((item) => item.startup_id === requestedStartup);
  const defaultMaharashtraStartup = startups.find((item) => item.headquarters?.includes("Maharashtra") || item.operating_regions?.includes("Maharashtra"));
  const activeStartup = selectedStartup || defaultMaharashtraStartup || startups[0];
  const startup = useMemo(() => activeStartup ? { ...activeStartup, ...readStartupProfileOverrides(activeStartup.startup_id) } : activeStartup, [activeStartup, profileRevision]);

  useEffect(() => {
    let active = true;
    Promise.all([api.getStartups(), api.getChallenges(), api.getApplications(), api.getPilots(), api.getDepartments()])
      .then(async ([startupRows, challengeRows, applicationRows, pilotRows, departmentRows]) => {
        if (!active) return;
        setStartups(startupRows);
        setChallenges(challengeRows.filter((challenge) => challenge.status === "PUBLISHED"));
        setApplications(applicationRows);
        setPilots(pilotRows);
        setDepartments(departmentRows);
        const requestGroups = await Promise.all(applicationRows.map((application) => api.getClarificationRequests(application.application_id).catch(() => [])));
        if (active) setClarifications(requestGroups.flat());
      })
      .catch(() => {
        if (active) setError("We could not load the startup workspace. Please try again.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const startupApplications = useMemo(
    () => startup ? applications.filter((application) => application.startup_id === startup.startup_id) : [],
    [applications, startup],
  );
  const draftCount = useMemo(() => {
    if (!startup) return 0;
    try {
      return Object.values(JSON.parse(localStorage.getItem(STARTUP_DRAFTS_KEY) || "{}"))
        .filter((draft) => draft.startupId === startup.startup_id).length;
    } catch {
      return 0;
    }
  }, [startup]);

  if (loading) return <Loading />;
  if (error) return <div role="alert" className="card border-red-200 bg-red-50 p-6 text-sm text-red-700">{error}</div>;
  if (!startup) return <div className="card p-6 text-sm text-slate-600">No startup profiles are available yet.</div>;

  return (
    <div className="page-shell">
      <div className="page-intro">
        <div>
          <div className="section-label">Startup Workspace</div>
          <h1>Welcome, {startup.company_name}</h1>
          <p>Discover public-sector opportunities, track your applications, and grow your startup’s impact.</p>
        </div>
        <label className="min-w-52 text-xs font-bold text-slate-500">
          Startup profile
          <select
            aria-label="Select startup profile"
            className="filter-control mt-2 w-full"
            value={startup.startup_id}
            onChange={(event) => setSearchParams({ startup: event.target.value })}
          >
            {startups.map((item) => <option key={item.startup_id} value={item.startup_id}>{item.company_name}</option>)}
          </select>
        </label>
      </div>

      <Routes>
        <Route
          path="/"
          element={
            <StartupDashboard
              startup={startup}
              challenges={challenges}
              applications={startupApplications}
              draftCount={draftCount}
              pilots={pilots.filter((pilot) => pilot.startup_id === startup.startup_id)}
              clarifications={clarifications}
              departments={departments}
            />
          }
        />
        <Route path="challenges" element={<StartupChallenges challenges={challenges} departments={departments} startup={startup} />} />
        <Route path="challenges/:challengeId" element={<StartupChallengeDetail challenges={challenges} departments={departments} startup={startup} />} />
        <Route path="applications/:applicationId" element={<StartupApplicationTimeline applications={startupApplications} challenges={challenges} departments={departments} startup={startup} clarifications={clarifications} onClarificationUpdated={(updated) => setClarifications((current) => current.map((item) => item.clarification_id === updated.clarification_id ? updated : item))} onApplicationUpdated={(updated) => setApplications((current) => current.map((item) => item.application_id === updated.application_id ? updated : item))} />} />
        <Route path="applications" element={<StartupApplications applications={startupApplications} challenges={challenges} departments={departments} startup={startup} draftCount={draftCount} clarifications={clarifications} onClarificationUpdated={(updated) => setClarifications((current) => current.map((item) => item.clarification_id === updated.clarification_id ? updated : item))} />} />
        <Route path="my-startup" element={<MyStartup startup={startup} applications={startupApplications} onSaved={() => setProfileRevision((current) => current + 1)} />} />
        <Route path="pilots/:pilotId" element={<StartupPilotDetail pilots={pilots.filter((pilot) => pilot.startup_id === startup.startup_id)} challenges={challenges} departments={departments} startup={startup} />} />
        <Route path="pilots/:pilotId/kpis" element={<StartupKpiImpact pilots={pilots.filter((pilot) => pilot.startup_id === startup.startup_id)} challenges={challenges} startup={startup} />} />
        <Route path="pilots" element={<StartupPilots pilots={pilots.filter((pilot) => pilot.startup_id === startup.startup_id)} challenges={challenges} startupId={startup.startup_id} />} />
        <Route path="contracts-payments" element={<StartupContracts payments={PAYMENT_RECORDS} pilots={pilots.filter((pilot) => pilot.startup_id === startup.startup_id)} departments={departments} startup={startup} />} />
        <Route path="notifications" element={<StartupNotifications applications={startupApplications} clarifications={clarifications} pilots={pilots.filter((pilot) => pilot.startup_id === startup.startup_id)} challenges={challenges} startup={startup} />} />
        <Route path="apply/:challengeId" element={<StartupApplicationRoute startup={startup} challenges={challenges} onSubmitted={(application) => setApplications((current) => [...current, application])} />} />
        <Route path="*" element={<StartupDashboard startup={startup} challenges={challenges} applications={startupApplications} draftCount={draftCount} pilots={pilots.filter((pilot) => pilot.startup_id === startup.startup_id)} clarifications={clarifications} departments={departments} />} />
      </Routes>
    </div>
  );
}

function StartupApplicationRoute({ startup, challenges, onSubmitted }) {
  const { challengeId } = useParams();
  const challenge = challenges.find((item) => item.challenge_id === challengeId);
  if (!challenge) return <div role="alert" className="card p-6 text-sm text-slate-600">This challenge is not available for applications.</div>;
  return <StartupApplication startup={startup} challenge={{ ...challenge, match: { overallMatch: challengeMatch(challenge, startup).overall } }} onSubmitted={onSubmitted} />;
}

function StartupDashboard({ startup, challenges, applications, draftCount, pilots, clarifications, departments }) {
  const activeApplications = applications.filter((application) => ["SUBMITTED", "UNDER_REVIEW"].includes(application.status));
  const shortlistedApplications = applications.filter((application) => ["SHORTLISTED", "APPROVED"].includes(application.status));
  const activePilots = pilots.filter((pilot) => ["ACTIVE", "PLANNED"].includes(pilot.status));
  const recentNotifications = [
    ...applications.slice(0, 2).map((application) => ({ id: application.application_id, text: `Application ${application.application_id} is ${application.status.replaceAll("_", " ").toLowerCase()}.` })),
    ...clarifications.filter((item) => item.startup_response).slice(0, 2).map((item) => ({ id: item.clarification_id, text: `Clarification response sent for ${item.application_id}.` })),
  ].slice(0, 4);
  const cards = [
    { label: "Active Applications", value: activeApplications.length, icon: BriefcaseBusiness },
    { label: "Shortlisted Applications", value: shortlistedApplications.length, icon: FileText },
    { label: "Active Pilots", value: activePilots.length, icon: Rocket },
    { label: "Pending Payments", value: PAYMENT_RECORDS.length, icon: CircleDollarSign },
  ];

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, icon: Icon }) => (
          <div className="card p-5" key={label}>
            <div className="flex items-center justify-between text-sm font-semibold text-slate-500">
              {label}<Icon className="h-4 w-4 text-[#d95300]" />
            </div>
            <div className="mt-3 text-3xl font-black text-[#0b2d4a]">{value}</div>
          </div>
        ))}
      </div>

      <section className="card p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><div className="section-label">AI recommendations</div><h2 className="mt-2 text-xl font-black text-slate-900">AI Recommended Challenges</h2><p className="mt-1 text-sm text-slate-500">Opportunities matched to {startup.company_name}.</p></div>
          <Link to={`/startup/challenges?startup=${encodeURIComponent(startup.startup_id)}`} className="btn-secondary">Explore all <ArrowRight className="h-4 w-4" /></Link>
        </div>
        {challenges.length ? (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {challenges.slice(0, 4).map((challenge) => <ChallengeCard key={challenge.challenge_id} challenge={challenge} departments={departments} startup={startup} startupId={startup.startup_id} />)}
          </div>
        ) : <div className="empty-state mt-4">There are no published challenges at the moment.</div>}
      </section>

      <section className="card p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><div className="section-label">Application tracker</div><h2 className="mt-2 text-xl font-black text-slate-900">Your latest applications</h2></div>
          <Link to={`/startup/applications?startup=${encodeURIComponent(startup.startup_id)}`} className="text-sm font-bold text-[#d95300] hover:underline">View all</Link>
        </div>
        {applications.length ? (
          <div className="mt-4 divide-y divide-slate-100">
            {applications.slice(0, 4).map((application) => (
              <div key={application.application_id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div><div className="font-bold text-slate-800">{application.application_id}</div><div className="mt-1 text-xs text-slate-500">{challengeName(application.challenge_id, challenges)}</div></div>
                <Badge status={application.status} />
              </div>
            ))}
          </div>
        ) : <p className="mt-4 text-sm text-slate-500">Your applications will appear here once submitted.</p>}
      </section>

      <section className="card p-5 sm:p-6"><div className="flex items-center justify-between gap-3"><div><div className="section-label">Recent activity</div><h2 className="mt-2 text-xl font-black text-slate-900">Recent Notifications</h2></div><Link to={`/startup/notifications?startup=${encodeURIComponent(startup.startup_id)}`} className="text-sm font-bold text-[#d95300] hover:underline">View all</Link></div>{recentNotifications.length ? <div className="mt-4 divide-y divide-slate-100">{recentNotifications.map((notification) => <div key={notification.id} className="flex items-center gap-3 py-3"><Bell className="h-4 w-4 shrink-0 text-[#d95300]" /><span className="text-sm text-slate-700">{notification.text}</span></div>)}</div> : <p className="mt-4 text-sm text-slate-500">No recent notifications.</p>}</section>

      <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
        <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
        You are viewing the startup profile for {startup.company_name}. Use the profile selector above to switch profiles.
      </div>
    </>
  );
}

function StartupChallenges({ challenges, departments, startup }) {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("ALL");
  const [filters, setFilters] = useState({ sector: "ALL", department: "ALL", district: "ALL", technology: "ALL", budget: "ALL", duration: "ALL", trl: "ALL", deadline: "ALL" });
  const [savedIds, setSavedIds] = useState(() => readSavedChallenges());
  const startupId = startup.startup_id;
  const filterOptions = {
    sector: uniqueValues(challenges.map((challenge) => challenge.sector)),
    department: uniqueValues(challenges.map((challenge) => departmentName(challenge, departments))),
    district: uniqueValues(challenges.map((challenge) => challenge.district || challenge.location)),
    technology: uniqueValues(challenges.flatMap((challenge) => challenge.required_technologies || [])),
    budget: uniqueValues(challenges.map((challenge) => challenge.budget_range_inr)),
    duration: uniqueValues(challenges.map((challenge) => challenge.duration_months || challenge.pilot_duration_months)),
    trl: uniqueValues(challenges.map((challenge) => challenge.minimum_trl || challenge.required_trl)),
  };
  const recommended = [...challenges].sort((left, right) => challengeMatch(right, startup).overall - challengeMatch(left, startup).overall);
  const filteredChallenges = challenges.filter((challenge) => {
    const match = challengeMatch(challenge, startup);
    const haystack = [challenge.title, challenge.description, challenge.sector, challenge.district, ...(challenge.required_technologies || [])].join(" ").toLowerCase();
    const deadline = challengeDeadline(challenge);
    return (!search || haystack.includes(search.toLowerCase()))
      && (filters.sector === "ALL" || challenge.sector === filters.sector)
      && (filters.department === "ALL" || departmentName(challenge, departments) === filters.department)
      && (filters.district === "ALL" || (challenge.district || challenge.location) === filters.district)
      && (filters.technology === "ALL" || (challenge.required_technologies || []).includes(filters.technology))
      && (filters.budget === "ALL" || challenge.budget_range_inr === filters.budget)
      && (filters.duration === "ALL" || String(challenge.duration_months || challenge.pilot_duration_months) === String(filters.duration))
      && (filters.trl === "ALL" || String(challenge.minimum_trl || challenge.required_trl) === String(filters.trl))
      && (filters.deadline === "ALL" || (filters.deadline === "SOON" ? isChallengeDueSoon(deadline) : !deadline))
      && (activeTab !== "SAVED" || savedIds.includes(challenge.challenge_id))
      && (activeTab !== "RECOMMENDED" || recommended.slice(0, 6).some((item) => item.challenge_id === challenge.challenge_id))
      && match.overall >= 0;
  });
  const toggleSaved = (challengeId) => {
    const next = savedIds.includes(challengeId) ? savedIds.filter((id) => id !== challengeId) : [...savedIds, challengeId];
    setSavedIds(next);
    localStorage.setItem("maitri-startup-saved-challenges", JSON.stringify(next));
  };
  const updateFilter = (field, value) => setFilters((current) => ({ ...current, [field]: value }));
  return <div className="space-y-5">
    <section className="card p-5 sm:p-6"><div className="section-label">Startup Opportunities</div><h2 className="mt-2 text-2xl font-black text-slate-900">Discover Challenges</h2><p className="mt-1 text-sm text-slate-500">Find public-sector opportunities matched to {startup.company_name}.</p><div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_repeat(3,minmax(0,1fr))]"><label className="relative block"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input aria-label="Search challenges" value={search} onChange={(event) => setSearch(event.target.value)} className="input-shell pl-9" placeholder="Search challenges" /></label><FilterSelect label="Sector" value={filters.sector} options={filterOptions.sector} onChange={(value) => updateFilter("sector", value)} /><FilterSelect label="Department" value={filters.department} options={filterOptions.department} onChange={(value) => updateFilter("department", value)} /><FilterSelect label="District" value={filters.district} options={filterOptions.district} onChange={(value) => updateFilter("district", value)} /></div><div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5"><FilterSelect label="Technology" value={filters.technology} options={filterOptions.technology} onChange={(value) => updateFilter("technology", value)} /><FilterSelect label="Budget" value={filters.budget} options={filterOptions.budget} onChange={(value) => updateFilter("budget", value)} /><FilterSelect label="Duration" value={filters.duration} options={filterOptions.duration} onChange={(value) => updateFilter("duration", value)} suffix=" months" /><FilterSelect label="TRL" value={filters.trl} options={filterOptions.trl} onChange={(value) => updateFilter("trl", value)} /><select aria-label="Deadline" value={filters.deadline} onChange={(event) => updateFilter("deadline", event.target.value)} className="filter-control"><option value="ALL">All deadlines</option><option value="SOON">Closing soon</option><option value="NONE">No deadline</option></select></div></section>
    <div className="flex flex-wrap gap-2" role="tablist" aria-label="Challenge views">{[["ALL", "All Challenges"], ["RECOMMENDED", "AI Recommended"], ["SAVED", "Saved Challenges"]].map(([key, label]) => <button key={key} type="button" role="tab" aria-selected={activeTab === key} onClick={() => setActiveTab(key)} className={`rounded-full px-4 py-2 text-sm font-bold ${activeTab === key ? "bg-[#fff3eb] text-[#d95300]" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>{label}</button>)}</div>
    {activeTab === "RECOMMENDED" && <section className="card p-5 sm:p-6"><div className="section-label">Why this matches</div><h2 className="mt-2 text-xl font-black text-slate-900">AI Recommended</h2><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{recommended.slice(0, 1).map((challenge) => <MatchReason key={challenge.challenge_id} challenge={challenge} startup={startup} />)}</div></section>}
    {filteredChallenges.length ? <div className="grid gap-4 lg:grid-cols-2">{filteredChallenges.map((challenge) => <ChallengeCard key={challenge.challenge_id} challenge={challenge} departments={departments} startup={startup} startupId={startupId} saved={savedIds.includes(challenge.challenge_id)} onToggleSaved={() => toggleSaved(challenge.challenge_id)} />)}</div> : <div className="empty-state">No challenges match the selected filters.</div>}
  </div>;
}

function StartupApplications({ applications, challenges, departments, startup, draftCount, clarifications, onClarificationUpdated }) {
  const drafts = readDrafts(startup.startup_id);
  const applicationIds = new Set(applications.map((application) => application.application_id));
  const startupClarifications = clarifications.filter((item) => applicationIds.has(item.application_id));
  const [eligibility, setEligibility] = useState({});

  useEffect(() => {
    let active = true;
    Promise.all(applications.map(async (application) => {
      try { return [application.application_id, await api.checkEligibility(application.challenge_id, application.startup_id)]; } catch { return [application.application_id, null]; }
    })).then((results) => { if (active) setEligibility(Object.fromEntries(results)); });
    return () => { active = false; };
  }, [applications]);

  const rows = [
    ...drafts.map((draft) => ({ application: null, draft, challenge: challenges.find((challenge) => challenge.challenge_id === draft.challengeId), eligibility: null })),
    ...applications.map((application) => ({ application, draft: null, challenge: challenges.find((challenge) => challenge.challenge_id === application.challenge_id), eligibility: eligibility[application.application_id] })),
  ];
  return (
    <div className="space-y-5">
      <section className="card overflow-hidden"><div className="flex flex-wrap items-center justify-between gap-3 p-5 sm:p-6"><div><div className="section-label">Application Tracker</div><h2 className="mt-2 text-2xl font-black text-slate-900">My Applications</h2><p className="mt-1 text-sm text-slate-500">Track submissions, eligibility, evaluation, and next actions.</p></div><span className="tag">{rows.length} records</span></div>{rows.length ? <div className="overflow-x-auto"><table className="data-table w-full min-w-[1050px] border-collapse"><thead><tr><th className="px-5 pt-4 sm:px-6">Challenge</th><th>Department</th><th>Submitted Date</th><th>Match Score</th><th>Eligibility</th><th>Current Status</th><th className="pr-5 sm:pr-6">Next Action</th></tr></thead><tbody>{rows.map(({ application, draft, challenge, eligibility: result }) => { const status = draft ? "DRAFT" : startupApplicationStatus(application.status); const challengeTitle = challenge?.title || draft?.challengeId || application?.challenge_id; const department = departments.find((item) => item.department_id === challenge?.department_id); const applicationId = application?.application_id || draft?.challengeId; return <tr key={applicationId}><td className="px-5 font-bold text-[#0b2d4a] sm:px-6">{application ? <Link to={`/startup/applications/${application.application_id}?startup=${encodeURIComponent(startup.startup_id)}`} className="hover:text-[#d95300]">{challengeTitle}</Link> : challengeTitle}</td><td>{department?.name || challenge?.department_id || "Not provided"}</td><td>{draft ? formatStartupDate(draft.updatedAt) : formatStartupDate(application.submitted_at)}</td><td>{draft ? "—" : `${application.match_score ?? "—"}%`}</td><td>{draft ? "—" : result ? <Badge status={result.verdict}>{result.verdict === "ELIGIBLE" ? "Pass" : result.verdict === "NOT_ELIGIBLE" ? "Not Met" : "Pending"}</Badge> : <span className="text-xs text-slate-400">Pending</span>}</td><td><Badge status={status}>{applicationStatusLabel(status)}</Badge></td><td className="pr-5 sm:pr-6"><Link to={draft ? `/startup/apply/${draft.challengeId}?startup=${encodeURIComponent(startup.startup_id)}` : `/startup/applications/${application.application_id}?startup=${encodeURIComponent(startup.startup_id)}`} className={draft ? "btn-secondary px-3 py-2 text-xs" : "text-sm font-bold text-[#d95300] hover:underline"}>{nextApplicationAction(status)}</Link></td></tr>; })}</tbody></table></div> : <div className="empty-state m-5">No applications or drafts yet.</div>}</section>
      <section className="card p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3"><div><div className="section-label">Expert follow-up</div><h2 className="mt-2 text-xl font-black text-slate-900">Clarification requests</h2></div><MessageSquareText className="h-5 w-5 text-[#d95300]" /></div>
        {startupClarifications.length ? <div className="mt-4 space-y-4">{startupClarifications.map((item) => <ClarificationResponse key={item.clarification_id} request={item} onUpdated={onClarificationUpdated} />)}</div> : <p className="mt-4 text-sm text-slate-500">No clarification requests have been received.</p>}
      </section>
    </div>
  );
}

function StartupApplicationTimeline({ applications, challenges, departments, startup, clarifications, onClarificationUpdated, onApplicationUpdated }) {
  const { applicationId } = useParams();
  const [withdrawing, setWithdrawing] = useState(false);
  const [actionError, setActionError] = useState("");
  const application = applications.find((item) => item.application_id === applicationId);
  if (!application) return <div className="card p-6 text-sm text-slate-600">Application not found.</div>;
  const challenge = challenges.find((item) => item.challenge_id === application.challenge_id);
  const department = departments.find((item) => item.department_id === challenge?.department_id);
  const currentStatus = startupApplicationStatus(application.status);
  const stages = ["Submitted", "Eligibility Review", "Technical Evaluation", "Shortlisted", "Pilot Selected"];
  const currentIndex = stages.indexOf(currentStatus);
  const terminal = ["Rejected", "Closed", "WITHDRAWN"].includes(currentStatus);
  const applicationClarifications = clarifications.filter((item) => item.application_id === applicationId);
  const canWithdraw = !["APPROVED", "REJECTED", "CLOSED", "WITHDRAWN"].includes(application.status);
  const withdraw = async () => {
    if (!window.confirm("Withdraw this application?")) return;
    setWithdrawing(true);
    setActionError("");
    try { onApplicationUpdated(await api.withdrawApplication(applicationId)); } catch { setActionError("Unable to withdraw this application right now. Please try again."); } finally { setWithdrawing(false); }
  };
  return <div className="space-y-5"><section className="card p-5 sm:p-6" id="application-details"><Link to={`/startup/applications?startup=${encodeURIComponent(startup.startup_id)}`} className="text-sm font-bold text-[#d95300] hover:underline">← My Applications</Link><div className="mt-5 flex flex-wrap items-start justify-between gap-4"><div><div className="section-label">Application Details</div><h1 className="mt-2 text-2xl font-black text-slate-900">{challenge?.title || application.challenge_id}</h1><p className="mt-1 text-sm text-slate-500">{department?.name || "Department not provided"} · Application {application.application_id}</p></div><Badge status={currentStatus}>{applicationStatusLabel(currentStatus)}</Badge></div><div className="mt-6 grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-3"><Info label="Challenge" value={challenge?.title || application.challenge_id} /><Info label="Department" value={department?.name || "Not provided"} /><Info label="Application ID" value={application.application_id} /><Info label="Match Score" value={`${application.match_score ?? "—"}%`} /><Info label="Current Status" value={applicationStatusLabel(currentStatus)} /></div><div className="mt-6 flex flex-wrap gap-3"><a href="#application-details" className="btn-secondary">View Application</a>{canWithdraw && <button type="button" onClick={withdraw} disabled={withdrawing} className="btn-secondary text-red-700">{withdrawing ? "Withdrawing..." : "Withdraw Application"}</button>}</div>{actionError && <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{actionError}</div>}</section><section className="card p-5 sm:p-6"><div className="section-label">Application Lifecycle</div><h2 className="mt-2 text-xl font-black text-slate-900">Progress</h2><div className="mt-5 space-y-3">{stages.map((stage, index) => { const complete = !terminal && currentIndex >= index; const active = stage === currentStatus; return <div key={stage} className={`flex items-center gap-3 rounded-xl p-3 ${active ? "bg-[#fff3eb]" : "bg-slate-50"}`}><span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${complete ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"}`}>{complete ? "✓" : index + 1}</span><span className={`text-sm ${active ? "font-black text-[#c45100]" : "font-semibold text-slate-600"}`}>{stage}</span><span className="ml-auto text-xs text-slate-400">{active ? "Current" : complete ? "Completed" : "Upcoming"}</span></div>; })}{terminal && <div className="flex items-center gap-3 rounded-xl bg-red-50 p-3"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-red-100 text-xs font-bold text-red-700">!</span><span className="text-sm font-bold text-red-800">{applicationStatusLabel(currentStatus)}</span></div>}</div></section><section className="card p-5 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><div className="section-label">Startup-visible Feedback</div><h2 className="mt-2 text-xl font-black text-slate-900">Evaluation Feedback</h2></div><span className="tag">Status updates only</span></div><p className="mt-4 text-sm leading-6 text-slate-600">Detailed expert scores and internal government notes are not displayed in the startup workspace. Published feedback will appear here when available.</p></section><section className="card p-5 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><div className="section-label">Clarifications</div><h2 className="mt-2 text-xl font-black text-slate-900">Clarification Requests</h2></div>{applicationClarifications.some((item) => !item.startup_response) && <a href="#clarifications" className="btn-secondary">Respond to Clarification</a>}</div><div id="clarifications" className="mt-4 space-y-4">{applicationClarifications.length ? applicationClarifications.map((item) => <ClarificationResponse key={item.clarification_id} request={item} onUpdated={onClarificationUpdated} />) : <p className="text-sm text-slate-500">No clarification requests for this application.</p>}</div></section></div>;
}

function startupApplicationStatus(status) {
  if (status === "UNDER_REVIEW") return "Technical Evaluation";
  if (status === "APPROVED") return "Pilot Selected";
  if (status === "SHORTLISTED") return "Shortlisted";
  if (status === "REJECTED") return "Rejected";
  if (status === "CLOSED") return "Closed";
  if (status === "ELIGIBILITY_REVIEW") return "Eligibility Review";
  return status || "Submitted";
}

function applicationStatusLabel(status) {
  return status === "DRAFT" ? "Draft" : startupApplicationStatus(status);
}

function nextApplicationAction(status) {
  if (status === "DRAFT") return "Continue";
  if (status === "Submitted") return "View timeline";
  if (status === "Rejected" || status === "Closed") return "View details";
  return "View timeline";
}

function ClarificationResponse({ request, onUpdated }) {
  const [response, setResponse] = useState(request.startup_response || "");
  const [document, setDocument] = useState(request.supporting_document || null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const responded = Boolean(request.startup_response);

  const submitResponse = async (event) => {
    event.preventDefault();
    if (!response.trim()) return;
    setSaving(true);
    setError("");
    try {
      const updated = await api.respondToClarification(request.clarification_id, {
        response: response.trim(),
        supporting_document: document || undefined,
      });
      onUpdated(updated);
    } catch (requestError) {
      setError("Unable to send the response right now. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const selectDocument = (event) => {
    const file = event.target.files?.[0];
    if (file) setDocument({ name: file.name, size: file.size, type: file.type });
  };

  return <article className="rounded-xl border border-slate-200 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="text-xs font-bold uppercase tracking-[0.1em] text-slate-400">Application {request.application_id}</div><h3 className="mt-2 font-black text-slate-800">{request.question}</h3></div><Badge status={request.status} /></div><dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2"><div><dt className="font-bold text-slate-500">Required information</dt><dd className="mt-1 whitespace-pre-wrap text-slate-700">{request.required_information}</dd></div><div><dt className="font-bold text-slate-500">Deadline</dt><dd className="mt-1 text-slate-700">{request.deadline || "No deadline"}</dd></div></dl>{responded ? <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-950"><div className="font-bold">Response sent</div><p className="mt-1 whitespace-pre-wrap leading-6">{request.startup_response}</p>{request.supporting_document?.name && <div className="mt-2 flex items-center gap-2 text-xs font-semibold"><FileText className="h-4 w-4" />{request.supporting_document.name}</div>}</div> : <form onSubmit={submitResponse} className="mt-4 space-y-3"><label className="block text-sm font-semibold text-slate-700">Response<textarea required rows={4} value={response} onChange={(event) => setResponse(event.target.value)} className="input-shell mt-2" placeholder="Provide the information requested by the expert." /></label><label className="block text-sm font-semibold text-slate-700">Supporting document <span className="font-normal text-slate-400">(optional)</span><input type="file" onChange={selectDocument} className="input-shell mt-2" /></label>{document?.name && <div className="flex items-center gap-2 text-xs text-slate-500"><FileText className="h-4 w-4" />{document.name}</div>}{error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}<div className="flex justify-end"><button type="submit" disabled={saving || !response.trim()} className="btn-primary"><Send className="h-4 w-4" />{saving ? "Sending..." : "Send Response"}</button></div></form>}</article>;
}

function ChallengeCard({ challenge, departments, startup, startupId, saved = false, onToggleSaved = () => {} }) {
  const matchPercent = challengeMatch(challenge, startup).overall;
  const department = departments.find((item) => item.department_id === challenge.department_id);
  const deadline = challenge.deadline || challenge.closing_date || challenge.application_deadline;
  return (
    <article className="rounded-xl border border-slate-200 p-4">
      <div className="flex items-start justify-between gap-3">
        <div><div className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">{challenge.sector || "Sector not provided"}</div><h3 className="mt-2 font-bold leading-6 text-slate-900">{challenge.title}</h3></div>
        <button type="button" aria-label={saved ? "Remove saved challenge" : "Save challenge"} onClick={onToggleSaved} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-[#d95300]">{saved ? <BookmarkCheck className="h-4 w-4 text-[#d95300]" /> : <Bookmark className="h-4 w-4" />}</button>
      </div>
      <div className="mt-3 grid gap-2 text-xs text-slate-500 sm:grid-cols-2"><span><b className="text-slate-700">Department:</b> {department?.name || challenge.department_id || "Not provided"}</span><span><b className="text-slate-700">Match:</b> {matchPercent}%</span><span><b className="text-slate-700">Budget:</b> {challenge.budget_range_inr || "Not specified"}</span><span><b className="text-slate-700">Deadline:</b> {deadline ? formatStartupDate(deadline) : "Not specified"}</span></div>
      <p className="mt-3 line-clamp-2 text-sm leading-5 text-slate-600">{challenge.description}</p>
      <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">{(challenge.required_technologies || []).slice(0, 4).map((technology) => <span className="tag" key={technology}>{technology}</span>)}</div>
      <div className="mt-3 flex flex-wrap items-center justify-end gap-3"><Link to={`/startup/challenges/${challenge.challenge_id}?startup=${encodeURIComponent(startupId)}`} className="btn-secondary px-3 py-2 text-xs">View Challenge</Link><Link to={`/startup/apply/${challenge.challenge_id}?startup=${encodeURIComponent(startupId)}`} className="btn-primary px-3 py-2 text-xs">Apply <ArrowRight className="h-3.5 w-3.5" /></Link>
      </div>
    </article>
  );
}

function MatchReason({ challenge, startup }) {
  const match = challengeMatch(challenge, startup);
  return <>{[["Technical Fit", match.technical], ["Problem Relevance", match.relevance], ["Pilot Readiness", match.readiness], ["Overall Match", match.overall]].map(([label, value]) => <div key={label} className="rounded-xl border border-slate-200 bg-slate-50 p-4"><div className="text-xs font-bold uppercase tracking-[0.08em] text-slate-400">{label}</div><div className="mt-2 text-2xl font-black text-[#0b2d4a]">{value}%</div></div>)}</>;
}

function challengeMatch(challenge, startup = {}) {
  const required = (challenge.required_technologies || []).map((item) => item.toLowerCase());
  const technologies = (startup.technologies || []).map((item) => item.toLowerCase());
  const overlap = required.filter((technology) => technologies.some((item) => item.includes(technology) || technology.includes(item))).length;
  const technical = required.length ? Math.round(50 + (overlap / required.length) * 50) : 70;
  const relevance = startup.sectors?.some((sector) => sector.toLowerCase() === challenge.sector?.toLowerCase()) ? 88 : 68;
  const readiness = startup.trl_level ? Math.min(95, 45 + Number(startup.trl_level) * 6) : 65;
  return { technical, relevance, readiness, overall: Math.round((technical + relevance + readiness) / 3) };
}

function readSavedChallenges() {
  try {
    return JSON.parse(localStorage.getItem("maitri-startup-saved-challenges") || "[]");
  } catch {
    return [];
  }
}

function uniqueValues(values) {
  return [...new Set(values.filter((value) => value !== undefined && value !== null && value !== ""))].map(String).sort();
}

function departmentName(challenge, departments) {
  return departments.find((department) => department.department_id === challenge.department_id)?.name || challenge.department_id || "Not provided";
}

function challengeDeadline(challenge) {
  return challenge.deadline || challenge.closing_date || challenge.application_deadline;
}

function isChallengeDueSoon(value) {
  if (!value) return false;
  const remaining = new Date(value).getTime() - Date.now();
  return remaining >= 0 && remaining <= 30 * 24 * 60 * 60 * 1000;
}

function FilterSelect({ label, value, options, onChange, suffix = "" }) {
  return <select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} className="filter-control"><option value="ALL">All {label.toLowerCase()}s</option>{options.map((option) => <option key={option} value={option}>{option}{suffix}</option>)}</select>;
}

function StartupChallengeDetail({ challenges, departments, startup }) {
  const { challengeId } = useParams();
  const challenge = challenges.find((item) => item.challenge_id === challengeId);
  const [eligibility, setEligibility] = useState(null);
  const [checkingEligibility, setCheckingEligibility] = useState(false);
  const [saved, setSaved] = useState(() => readSavedChallenges().includes(challengeId));
  const [error, setError] = useState("");
  if (!challenge) return <div className="card p-6 text-sm text-slate-600">Challenge not found.</div>;
  const department = departments.find((item) => item.department_id === challenge.department_id);
  const startupId = startup.startup_id;
  const savedChallenge = () => { const ids = readSavedChallenges(); const next = ids.includes(challengeId) ? ids.filter((id) => id !== challengeId) : [...ids, challengeId]; localStorage.setItem("maitri-startup-saved-challenges", JSON.stringify(next)); setSaved(next.includes(challengeId)); };
  const checkEligibility = async () => { setCheckingEligibility(true); setError(""); try { setEligibility(await api.checkEligibility(challengeId, startupId)); } catch { setError("Unable to check eligibility right now. Please try again."); } finally { setCheckingEligibility(false); } };
  const outcomes = challenge.desired_outcomes || challenge.success_metrics || [];
  const technologies = challenge.required_technologies || [];
  const constraints = challenge.constraints || challenge.eligibility_constraints || challenge.policies || [];
  const pilotDetails = challenge.pilot_details || challenge.pilot_objectives || challenge.implementation_plan || "Pilot duration, locations, and implementation details will be confirmed during application review.";
  const kpis = challenge.success_metrics || challenge.kpis || [];
  const eligibilityRequirements = challenge.eligibility_requirements || challenge.eligibility_rules || [];
  return <div className="space-y-5"><Link to={`/startup/challenges?startup=${encodeURIComponent(startupId)}`} className="inline-flex items-center gap-2 text-sm font-bold text-[#d95300] hover:underline">← All challenges</Link><section className="card p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="section-label">Challenge Overview</div><h1 className="mt-2 text-3xl font-black text-[#0b2d4a]">{challenge.title}</h1><p className="mt-2 text-sm text-slate-500">{department?.name || challenge.department_id || "Department not provided"} · {challenge.sector || "Sector not provided"}</p></div><button type="button" onClick={savedChallenge} className="btn-secondary">{saved ? <BookmarkCheck className="h-4 w-4 text-[#d95300]" /> : <Bookmark className="h-4 w-4" />}{saved ? "Saved" : "Save Challenge"}</button></div><div className="mt-5 grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-3"><Info label="Budget" value={challenge.budget_range_inr || "Not specified"} /><Info label="Pilot duration" value={`${challenge.duration_months || challenge.pilot_duration_months || "Not specified"}${challenge.duration_months || challenge.pilot_duration_months ? " months" : ""}`} /><Info label="Application deadline" value={formatStartupDate(challengeDeadline(challenge))} /></div></section><ChallengeSection title="Problem Statement"><p>{challenge.description || "Problem statement not provided."}</p></ChallengeSection><ChallengeSection title="Desired Outcomes"><ListOrText items={outcomes} empty="Desired outcomes are not specified." /></ChallengeSection><ChallengeSection title="Technical Requirements"><div className="flex flex-wrap gap-2">{technologies.length ? technologies.map((technology) => <span className="tag" key={technology}>{technology}</span>) : <span className="text-sm text-slate-500">No technical requirements specified.</span>}</div></ChallengeSection><ChallengeSection title="Constraints"><ListOrText items={constraints} empty="No public constraints specified." /></ChallengeSection><ChallengeSection title="Pilot Details"><p>{Array.isArray(pilotDetails) ? pilotDetails.join("; ") : pilotDetails}</p></ChallengeSection><ChallengeSection title="KPIs"><ListOrText items={kpis} empty="No public KPIs specified." /></ChallengeSection><ChallengeSection title="Eligibility Requirements"><ListOrText items={eligibilityRequirements} empty="Eligibility will be checked against the published program rules." /></ChallengeSection><ChallengeSection title="Budget and Timeline"><dl className="grid gap-4 sm:grid-cols-3"><Info label="Budget" value={challenge.budget_range_inr || "Not specified"} /><Info label="Application deadline" value={formatStartupDate(challengeDeadline(challenge))} /><Info label="Pilot duration" value={`${challenge.duration_months || challenge.pilot_duration_months || "Not specified"}${challenge.duration_months || challenge.pilot_duration_months ? " months" : ""}`} /></dl></ChallengeSection><section className="card p-5 sm:p-6"><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#1d4ed8]" /><div><div className="section-label">Decision Support</div><h2 className="mt-2 text-xl font-black text-slate-900">AI Eligibility Check</h2><p className="mt-1 text-sm text-slate-500">Check the published eligibility rules for {startup.company_name}.</p></div></div><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{["DPIIT Recognition", "Technical Capability", "Certifications", "Pilot Capacity", "Security Compliance"].map((label) => <EligibilityStatus key={label} label={label} status={eligibilityStatus(label, eligibility, startup)} />)}</div>{error && <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}<button type="button" onClick={checkEligibility} disabled={checkingEligibility} className="btn-secondary mt-5"><ShieldCheck className="h-4 w-4" />{checkingEligibility ? "Checking..." : "Check Eligibility"}</button></section><div className="flex flex-wrap justify-end gap-3"><button type="button" onClick={savedChallenge} className="btn-secondary">{saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}{saved ? "Saved" : "Save Challenge"}</button><Link to={`/startup/apply/${challenge.challenge_id}?startup=${encodeURIComponent(startupId)}`} className="btn-primary">Apply <ArrowRight className="h-4 w-4" /></Link></div></div>;
}

function ChallengeSection({ title, children }) {
  return <section className="card p-5 sm:p-6"><h2 className="text-lg font-black text-[#0b2d4a]">{title}</h2><div className="mt-4 text-sm leading-6 text-slate-700">{children}</div></section>;
}

function ListOrText({ items, empty }) {
  if (!Array.isArray(items)) return <p>{items || empty}</p>;
  return items.length ? <ul className="list-disc space-y-1 pl-5">{items.map((item, index) => <li key={`${item}-${index}`}>{typeof item === "string" ? item : item.label || item.description || JSON.stringify(item)}</li>)}</ul> : <p>{empty}</p>;
}

function EligibilityStatus({ label, status }) {
  const styles = { Pass: "border-emerald-200 bg-emerald-50 text-emerald-800", Pending: "border-amber-200 bg-amber-50 text-amber-800", "Not Met": "border-red-200 bg-red-50 text-red-800" };
  return <div className={`rounded-xl border p-3 ${styles[status]}`}><div className="text-xs font-bold uppercase tracking-[0.08em]">{label}</div><div className="mt-2 flex items-center gap-2 text-sm font-black">{status === "Pass" && <CheckCircle2 className="h-4 w-4" />}{status}</div></div>;
}

function eligibilityStatus(label, result, startup) {
  if (!result) return "Pending";
  const aliases = { "DPIIT Recognition": ["dpiit", "recognition"], "Technical Capability": ["technical", "technology", "trl"], Certifications: ["certification"], "Pilot Capacity": ["deployment", "pilot", "capacity"], "Security Compliance": ["security", "compliance"] };
  const rule = (result.rule_results || []).find((item) => (aliases[label] || []).some((alias) => item.label?.toLowerCase().includes(alias)));
  if (rule) return rule.passed ? "Pass" : "Not Met";
  if (label === "DPIIT Recognition") return (startup.certifications || []).some((item) => item.toLowerCase().includes("dpiit")) ? "Pass" : "Pending";
  if (label === "Technical Capability") return startup.technologies?.length ? "Pass" : "Not Met";
  if (label === "Certifications") return startup.certifications?.length ? "Pass" : "Not Met";
  if (label === "Pilot Capacity") return startup.deployment_capacity ? "Pass" : "Pending";
  return "Pending";
}

function MyStartup({ startup, applications, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState(() => startupProfileForm(startup));
  const [documents, setDocuments] = useState(() => readStartupDocuments(startup.startup_id));
  const [message, setMessage] = useState("");

  useEffect(() => {
    setProfile(startupProfileForm(startup));
    setDocuments(readStartupDocuments(startup.startup_id));
    setEditing(false);
  }, [startup.startup_id]);

  const update = (field, value) => { setProfile((current) => ({ ...current, [field]: value })); setMessage(""); };
  const saveProfile = () => {
    const profiles = JSON.parse(localStorage.getItem(STARTUP_PROFILE_KEY) || "{}");
    const override = {
      company_name: profile.companyName,
      description: profile.companyOverview,
      technologies: splitProfileValues(profile.technologyProducts),
      products: splitProfileValues(profile.technologyProducts),
      sectors: splitProfileValues(profile.sectors),
      trl_level: Number(profile.trl) || startup.trl_level,
      capabilities: profile.teamExpertise,
      headquarters: profile.geography,
      deployment_capacity: profile.deploymentCapability,
      previous_pilots: Number(profile.previousPilots) || 0,
      government_experience: profile.governmentExperience,
      certifications: splitProfileValues(profile.certifications),
    };
    localStorage.setItem(STARTUP_PROFILE_KEY, JSON.stringify({ ...profiles, [startup.startup_id]: override }));
    setEditing(false);
    setMessage("Startup profile saved on this device. Challenge matching will use the updated profile.");
    onSaved();
  };
  const uploadDocument = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const nextDocuments = [...documents, { id: `${file.name}-${file.size}-${file.lastModified}`, name: file.name, size: file.size, type: file.type }];
    setDocuments(nextDocuments);
    const allDocuments = JSON.parse(localStorage.getItem("maitri-startup-compliance-documents") || "{}");
    localStorage.setItem("maitri-startup-compliance-documents", JSON.stringify({ ...allDocuments, [startup.startup_id]: nextDocuments }));
    setMessage("Compliance document added on this device.");
    event.target.value = "";
  };
  const completenessFields = [profile.companyName, profile.companyOverview, profile.technologyProducts, profile.sectors, profile.trl, profile.teamExpertise, profile.geography, profile.deploymentCapability, profile.previousPilots, profile.governmentExperience, profile.certifications];
  const completeness = Math.round(((completenessFields.filter((value) => String(value || "").trim()).length + (documents.length ? 1 : 0)) / 12) * 100);
  return <div className="space-y-5"><section className="card p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="section-label">My Startup</div><h2 className="mt-2 text-2xl font-black text-slate-900">{profile.companyName}</h2><p className="mt-1 text-sm text-slate-500">Keep this profile current so AI challenge matching reflects your startup.</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => setEditing((current) => !current)} className="btn-secondary">{editing ? "Cancel Edit" : "Edit Profile"}</button><label className="btn-secondary cursor-pointer"><FileText className="h-4 w-4" />Upload Document<input className="sr-only" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg" onChange={uploadDocument} /></label></div></div><div className="mt-6 border-t border-slate-100 pt-5"><div className="flex items-center justify-between gap-3 text-sm font-bold text-slate-700"><span>Profile Completeness</span><span>{completeness}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#ff6b0a] transition-all" style={{ width: `${completeness}%` }} /></div></div></section><section className="card p-5 sm:p-6"><div className="section-label">Company Overview</div>{editing ? <ProfileTextArea label="Company Overview" value={profile.companyOverview} onChange={(value) => update("companyOverview", value)} placeholder="Describe your company and solution focus." /> : <p className="mt-4 text-sm leading-6 text-slate-700">{profile.companyOverview || "Not provided."}</p>}<div className="mt-5 grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2"><ProfileValue label="Company name" value={profile.companyName} editing={editing} onChange={(value) => update("companyName", value)} /><ProfileValue label="Technology & Products" value={profile.technologyProducts} editing={editing} onChange={(value) => update("technologyProducts", value)} /><ProfileValue label="Industry/Sectors" value={profile.sectors} editing={editing} onChange={(value) => update("sectors", value)} /><ProfileValue label="TRL" value={profile.trl} type="number" editing={editing} onChange={(value) => update("trl", value)} /></div></section><section className="card p-5 sm:p-6"><div className="section-label">Capability & Experience</div><div className="grid gap-4 sm:grid-cols-2"><ProfileValue label="Team Expertise" value={profile.teamExpertise} editing={editing} onChange={(value) => update("teamExpertise", value)} multiline /><ProfileValue label="Geography" value={profile.geography} editing={editing} onChange={(value) => update("geography", value)} /><ProfileValue label="Deployment Capability" value={profile.deploymentCapability} editing={editing} onChange={(value) => update("deploymentCapability", value)} /><ProfileValue label="Previous Pilots" value={profile.previousPilots} type="number" editing={editing} onChange={(value) => update("previousPilots", value)} /><ProfileValue label="Government Experience" value={profile.governmentExperience} editing={editing} onChange={(value) => update("governmentExperience", value)} multiline /><ProfileValue label="Certifications" value={profile.certifications} editing={editing} onChange={(value) => update("certifications", value)} multiline /></div></section><section className="card p-5 sm:p-6"><div className="flex items-center justify-between gap-3"><div><div className="section-label">Compliance Documents</div><h2 className="mt-2 text-xl font-black text-slate-900">Uploaded documents</h2></div><span className="tag">{documents.length}</span></div>{documents.length ? <div className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200">{documents.map((document) => <div key={document.id || document.name} className="flex items-center gap-3 p-3"><FileText className="h-4 w-4 text-[#d95300]" /><span className="text-sm font-semibold text-slate-700">{document.name}</span><span className="ml-auto text-xs text-slate-400">{document.size ? `${(document.size / 1024 / 1024).toFixed(2)} MB` : "Document"}</span></div>)}</div> : <p className="mt-4 text-sm text-slate-500">No compliance documents uploaded.</p>}</section>{message && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</div>}{editing && <div className="flex justify-end"><button type="button" onClick={saveProfile} className="btn-primary"><Save className="h-4 w-4" />Save Profile</button></div>}<div className="card p-5 text-sm text-slate-500">{applications.length} application{applications.length === 1 ? "" : "s"} currently linked to this startup profile.</div></div>;
}

function startupProfileForm(startup) {
  return { companyName: startup.company_name || "", companyOverview: startup.description || "", technologyProducts: [...(startup.technologies || []), ...(startup.products || [])].join(", "), sectors: (startup.sectors || []).join(", "), trl: startup.trl_level || "", teamExpertise: startup.capabilities || startup.team_expertise || "", geography: startup.headquarters || startup.geography || "", deploymentCapability: startup.deployment_capacity || "", previousPilots: startup.previous_pilots || "", governmentExperience: startup.government_experience || "", certifications: (startup.certifications || []).join(", ") };
}

function readStartupDocuments(startupId) {
  try { return JSON.parse(localStorage.getItem("maitri-startup-compliance-documents") || "{}")[startupId] || []; } catch { return []; }
}

function splitProfileValues(value) {
  return String(value || "").split(",").map((item) => item.trim()).filter(Boolean);
}

function ProfileValue({ label, value, editing, onChange, type = "text", multiline = false }) {
  if (!editing) return <Info label={label} value={value || "Not provided"} />;
  return <label className="block text-sm font-semibold text-slate-700">{label}{multiline ? <textarea rows={3} value={value} onChange={(event) => onChange(event.target.value)} className="input-shell mt-2" /> : <input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="input-shell mt-2" />}</label>;
}

function StartupPilots({ pilots, challenges, startupId }) {
  return <section className="card p-5 sm:p-6"><div className="section-label">Delivery</div><h2 className="mt-2 text-2xl font-black text-slate-900">My Pilots</h2>{pilots.length ? <div className="mt-5 divide-y divide-slate-100">{pilots.map((pilot) => <Link to={`/startup/pilots/${pilot.pilot_id}?startup=${encodeURIComponent(startupId)}`} key={pilot.pilot_id} className="block py-4 hover:bg-slate-50"><div className="flex flex-wrap items-center justify-between gap-3"><div className="font-bold text-slate-800">{pilot.pilot_id} · {challengeName(pilot.challenge_id, challenges)}</div><Badge status={pilot.status} /></div><div className="mt-1 text-sm text-slate-500">{pilot.location || "Location not provided"} · {pilot.duration_months ?? "—"} months · {pilotProgress(pilot)}% progress</div></Link>)}</div> : <div className="empty-state mt-5">No pilots are associated with this startup yet.</div>}</section>;
}

function StartupPilotDetail({ pilots, challenges, departments, startup }) {
  const { pilotId } = useParams();
  const pilot = pilots.find((item) => item.pilot_id === pilotId);
  const [activeTab, setActiveTab] = useState("Overview");
  const [kpis, setKpis] = useState([]);
  const [loadingKpis, setLoadingKpis] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!pilotId) return undefined;
    let active = true;
    setLoadingKpis(true);
    api.getPilotKpis(pilotId).then((rows) => { if (active) setKpis(rows); }).catch(() => { if (active) setError("Unable to load pilot KPIs right now."); }).finally(() => { if (active) setLoadingKpis(false); });
    return () => { active = false; };
  }, [pilotId]);
  if (!pilot) return <div className="card p-6 text-sm text-slate-600">Pilot not found.</div>;
  const challenge = challenges.find((item) => item.challenge_id === pilot.challenge_id);
  const department = departments.find((item) => item.department_id === pilot.department_id);
  const progress = pilotProgress(pilot);
  const documents = readSubmittedEvidenceForStartup(pilot.application_id);
  const milestones = pilot.milestones || [];
  const tabs = ["Overview", "Pilot Plan", "Milestones", "KPIs", "Documents", "Validation"];
  return <div className="space-y-5"><Link to={`/startup/pilots?startup=${encodeURIComponent(startup.startup_id)}`} className="inline-flex items-center gap-2 text-sm font-bold text-[#d95300] hover:underline">← My Pilots</Link><section className="card p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="section-label">Pilot Workspace · {pilot.pilot_id}</div><h1 className="mt-2 text-2xl font-black text-slate-900">{challenge?.title || pilot.pilot_id}</h1><p className="mt-1 text-sm text-slate-500">{startup.company_name} · {department?.name || pilot.department_id || "Department not provided"}</p></div><Badge status={pilot.status} /></div><div className="mt-6 grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2 lg:grid-cols-4"><Info label="Pilot name" value={pilot.pilot_name || pilot.pilot_id} /><Info label="Government department" value={department?.name || pilot.department_id} /><Info label="Location" value={pilot.location} /><Info label="Duration" value={pilot.duration_months ? `${pilot.duration_months} months` : "Not provided"} /><Info label="Contract value" value={pilot.contract_value || pilot.contract_value_inr || "Not provided"} /><Info label="Current status" value={pilot.status} /><Info label="Progress" value={`${progress}%`} /></div><div className="mt-5"><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#ff6b0a]" style={{ width: `${progress}%` }} /></div></div></section><div className="flex flex-wrap gap-2" role="tablist" aria-label="Pilot sections">{tabs.map((tab) => <button key={tab} type="button" role="tab" aria-selected={activeTab === tab} onClick={() => setActiveTab(tab)} className={`rounded-full px-3 py-2 text-sm font-bold ${activeTab === tab ? "bg-[#fff3eb] text-[#d95300]" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>{tab}</button>)}</div>{activeTab === "Overview" && <PilotSection title="Overview"><p className="text-sm leading-6 text-slate-700">{challenge?.description || "Pilot overview is not provided."}</p><div className="mt-4 grid gap-4 sm:grid-cols-2"><Info label="Startup" value={startup.company_name} /><Info label="Challenge" value={challenge?.title || pilot.challenge_id} /></div></PilotSection>}{activeTab === "Pilot Plan" && <PilotSection title="Pilot Plan"><Info label="Objectives" value={pilot.objectives || challenge?.pilot_objectives || challenge?.desired_outcomes || "Not provided"} /><Info label="Location" value={pilot.location} /><Info label="Duration" value={pilot.duration_months ? `${pilot.duration_months} months` : "Not provided"} /></PilotSection>}{activeTab === "Milestones" && <PilotSection title="Milestones">{milestones.length ? <div className="space-y-3">{milestones.map((milestone, index) => <div key={`${milestone.title}-${index}`} className="rounded-xl border border-slate-200 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div className="font-bold text-slate-800">{milestone.title}</div><MilestoneStatus milestone={milestone} /></div><div className="mt-2 text-xs text-slate-500">Payment status: <span className="font-bold text-slate-700">{milestone.payment_status || "Not recorded"}</span></div></div>)}</div> : <p className="text-sm text-slate-500">No milestones recorded.</p>}</PilotSection>}{activeTab === "KPIs" && <PilotSection title="KPIs">{loadingKpis ? <Loading /> : error ? <div role="alert" className="text-sm text-red-700">{error}</div> : kpis.length ? <div className="grid gap-3 sm:grid-cols-2">{kpis.map((kpi) => <div key={kpi.kpi_id} className="rounded-xl border border-slate-200 p-4"><div className="font-bold text-slate-800">{kpi.metric}</div><div className="mt-3 grid grid-cols-3 gap-2 text-xs text-slate-500"><Info label="Baseline" value={`${kpi.baseline}${kpi.unit || ""}`} /><Info label="Current" value={`${kpi.actual}${kpi.unit || ""}`} /><Info label="Target" value={`${kpi.target}${kpi.unit || ""}`} /></div></div>)}</div> : <p className="text-sm text-slate-500">No KPI records are available.</p>}</PilotSection>}{activeTab === "Documents" && <PilotSection title="Documents">{documents.length ? <div className="space-y-2">{documents.map((document) => <div key={document.id || document.name} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3"><FileText className="h-4 w-4 text-[#d95300]" /><span className="text-sm font-semibold text-slate-700">{document.name}</span></div>)}</div> : <p className="text-sm text-slate-500">No pilot documents are available.</p>}</PilotSection>}{activeTab === "Validation" && <PilotSection title="Validation"><p className="text-sm leading-6 text-slate-700">Validation results will appear here once the pilot reaches the validation stage.</p><div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs leading-5 text-blue-800">Government validation and procurement decisions are not available in the startup workspace.</div></PilotSection>}</div>;
}

function StartupKpiImpact({ pilots, challenges, startup }) {
  const { pilotId } = useParams();
  const pilot = pilots.find((item) => item.pilot_id === pilotId);
  const challenge = challenges.find((item) => item.challenge_id === pilot?.challenge_id);
  const [kpis, setKpis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [evidence, setEvidence] = useState(() => readPilotImpactEvidence(pilotId));
  const evidenceTypes = ["Reports", "Metrics", "Images", "Deployment evidence"];
  useEffect(() => {
    let active = true;
    api.getPilotKpis(pilotId).then((rows) => { if (active) setKpis(rows); }).catch(() => { if (active) setError("Unable to load KPI data right now."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [pilotId]);
  if (!pilot) return <div className="card p-6 text-sm text-slate-600">Pilot not found.</div>;
  const overall = kpis.length ? Math.round(kpis.reduce((total, kpi) => total + Number(kpi.achievement_percentage || 0), 0) / kpis.length) : null;
  const summary = [
    ["Overall KPI Achievement", overall === null ? "Not reported" : `${overall}%`, "Average of reported KPI achievement."],
    ["Technical Reliability", impactSummary(kpis, ["technical", "reliability", "uptime", "system"]), "Based on technical and reliability metrics."],
    ["User/Beneficiary Impact", impactSummary(kpis, ["user", "beneficiary", "adoption", "impact"]), "Based on user and beneficiary metrics."],
    ["Cost Impact", impactSummary(kpis, ["cost", "saving", "budget", "expense"]), "Based on cost and efficiency metrics."],
  ];
  const uploadEvidence = (type, event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const next = { ...evidence, [type]: [...(evidence[type] || []), { id: `${file.name}-${file.size}-${file.lastModified}`, name: file.name, size: file.size, type: file.type }] };
    setEvidence(next);
    const allEvidence = JSON.parse(localStorage.getItem("maitri-startup-pilot-impact-evidence") || "{}");
    localStorage.setItem("maitri-startup-pilot-impact-evidence", JSON.stringify({ ...allEvidence, [pilotId]: next }));
    event.target.value = "";
  };
  return <div className="space-y-5"><Link to={`/startup/pilots/${pilotId}?startup=${encodeURIComponent(startup.startup_id)}`} className="inline-flex items-center gap-2 text-sm font-bold text-[#d95300] hover:text-[#b54700]">← Pilot Workspace</Link><section className="card p-5 sm:p-6"><div className="section-label">KPI &amp; Impact</div><h1 className="mt-2 text-2xl font-black text-slate-900">{challenge?.title || pilotId}</h1><p className="mt-1 text-sm text-slate-500">{startup.company_name} · {pilot.location || "Location not provided"}</p></section><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{summary.map(([label, value, note]) => <div className="card p-5" key={label}><div className="text-sm font-semibold text-slate-500">{label}</div><div className="mt-3 text-2xl font-black text-[#0b2d4a]">{value}</div><div className="mt-1 text-xs leading-5 text-slate-400">{note}</div></div>)}</div><section className="card overflow-hidden"><div className="p-5 sm:p-6"><div className="section-label">Reported Metrics</div><h2 className="mt-2 text-xl font-black text-slate-900">Pilot KPIs</h2></div>{loading ? <Loading /> : error ? <div role="alert" className="m-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : kpis.length ? <div className="overflow-x-auto"><table className="data-table w-full min-w-[850px] border-collapse"><thead><tr><th className="px-5 pt-4 sm:px-6">KPI name</th><th>Baseline</th><th>Target</th><th>Current value</th><th>Achievement %</th><th className="pr-5 sm:pr-6">Status</th></tr></thead><tbody>{kpis.map((kpi) => <tr key={kpi.kpi_id}><td className="px-5 font-bold text-[#0b2d4a] sm:px-6">{kpi.metric}</td><td>{kpi.baseline}{kpi.unit || ""}</td><td>{kpi.target}{kpi.unit || ""}</td><td>{kpi.actual}{kpi.unit || ""}</td><td className="font-bold text-[#d95300]">{kpi.achievement_percentage ?? "—"}%</td><td className="pr-5 sm:pr-6"><Badge status={kpi.status} /></td></tr>)}</tbody></table></div> : <div className="empty-state m-5">No KPI records are available for this pilot.</div>}</section><section className="card p-5 sm:p-6"><div className="section-label">Evidence</div><h2 className="mt-2 text-xl font-black text-slate-900">Upload Impact Evidence</h2><p className="mt-1 text-sm text-slate-500">Add evidence metadata for reports, metrics, images, and deployment proof.</p><div className="mt-5 grid gap-4 sm:grid-cols-2">{evidenceTypes.map((type) => <div className="rounded-xl border border-slate-200 p-4" key={type}><div className="font-bold text-slate-800">{type}</div><label className="btn-secondary mt-3 cursor-pointer">Upload {type}<input className="sr-only" type="file" onChange={(event) => uploadEvidence(type, event)} /></label>{evidence[type]?.length ? <div className="mt-3 space-y-1">{evidence[type].map((file) => <div className="flex items-center gap-2 text-xs text-slate-600" key={file.id}><FileText className="h-3.5 w-3.5 text-[#d95300]" />{file.name}</div>)}</div> : <div className="mt-2 text-xs text-slate-400">No files uploaded.</div>}</div>)}</div></section><div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs leading-5 text-blue-800">This startup view shows reported KPI performance only. Validation information will appear when available.</div></div>;
}

function impactSummary(kpis, keywords) {
  const matches = kpis.filter((kpi) => keywords.some((keyword) => String(kpi.metric || "").toLowerCase().includes(keyword)));
  if (!matches.length) return "Not reported";
  return `${Math.round(matches.reduce((total, kpi) => total + Number(kpi.achievement_percentage || 0), 0) / matches.length)}%`;
}

function readPilotImpactEvidence(pilotId) {
  try { return JSON.parse(localStorage.getItem("maitri-startup-pilot-impact-evidence") || "{}")[pilotId] || {}; } catch { return {}; }
}

function PilotSection({ title, children }) { return <section className="card p-5 sm:p-6"><h2 className="text-lg font-black text-[#0b2d4a]">{title}</h2><div className="mt-4">{children}</div></section>; }

function MilestoneStatus({ milestone }) { const status = milestone.status || (milestone.done ? "Completed" : "Upcoming"); return <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${status === "Completed" ? "bg-emerald-50 text-emerald-800" : status === "Blocked" ? "bg-red-50 text-red-800" : status === "In Progress" ? "bg-blue-50 text-blue-800" : "bg-slate-100 text-slate-600"}`}>{status}</span>; }

function pilotProgress(pilot) { const milestones = pilot?.milestones || []; return milestones.length ? Math.round((milestones.filter((milestone) => milestone.done || milestone.status === "Completed").length / milestones.length) * 100) : 0; }

function readSubmittedEvidenceForStartup(applicationId) { try { const submissions = JSON.parse(localStorage.getItem("maitri-startup-application-submissions") || "[]"); return submissions.find((submission) => submission.application_id === applicationId)?.documents || []; } catch { return []; } }

function StartupContracts({ payments, pilots, departments, startup }) {
  const [selectedContract, setSelectedContract] = useState(null);
  const contracts = pilots.map((pilot) => ({
    id: pilot.contract_id || `CON-${pilot.pilot_id}`,
    pilot,
    department: departments.find((item) => item.department_id === pilot.department_id),
    value: pilot.contract_value || pilot.contract_value_inr,
    start: pilot.start_date,
    end: pilot.end_date || (pilot.start_date && pilot.duration_months ? addMonths(pilot.start_date, pilot.duration_months) : null),
    status: pilot.contract_status || "Not provided",
  }));
  const downloadContract = (contract) => {
    const content = [`Contract ID: ${contract.id}`, `Startup: ${startup.company_name}`, `Department: ${contract.department?.name || contract.pilot.department_id || "Not provided"}`, `Value: ${contract.value || "Not provided"}`, `Status: ${contract.status}`].join("\n");
    const url = URL.createObjectURL(new Blob([content], { type: "text/plain" }));
    const link = document.createElement("a"); link.href = url; link.download = `${contract.id}.txt`; link.click(); URL.revokeObjectURL(url);
  };
  return <div className="space-y-5"><section className="card p-5 sm:p-6"><div className="section-label">Financial Workspace</div><h1 className="mt-2 text-2xl font-black text-slate-900">Contracts &amp; Payments</h1><p className="mt-1 text-sm text-slate-500">Review contract records and milestone payment status for your pilots.</p></section>{contracts.length ? contracts.map((contract) => <section className="card p-5 sm:p-6" key={contract.id}><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="section-label">Contract</div><h2 className="mt-2 text-xl font-black text-[#0b2d4a]">{contract.id}</h2><p className="mt-1 text-sm text-slate-500">{contract.department?.name || contract.pilot.department_id || "Department not provided"}</p></div><Badge status={contract.status}>{contract.status}</Badge></div><div className="mt-5 grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2 lg:grid-cols-5"><Info label="Contract ID" value={contract.id} /><Info label="Department" value={contract.department?.name || contract.pilot.department_id} /><Info label="Contract value" value={contract.value || "Not provided"} /><Info label="Start date" value={formatStartupDate(contract.start)} /><Info label="End date" value={formatStartupDate(contract.end)} /></div><div className="mt-5 flex flex-wrap gap-3"><button type="button" onClick={() => setSelectedContract(selectedContract?.id === contract.id ? null : contract)} className="btn-secondary">View Contract</button><button type="button" onClick={() => downloadContract(contract)} className="btn-secondary"><Download className="h-4 w-4" />Download Contract</button><button type="button" onClick={() => setSelectedContract(contract)} className="btn-primary">View Payment Details</button></div>{selectedContract?.id === contract.id && <PaymentDetails contract={contract} milestones={contract.pilot.milestones || []} payments={payments} />}</section>) : <div className="card p-5 sm:p-6"><div className="empty-state">No contract records are available for this startup yet.</div></div>}</div>;
}

function PaymentDetails({ contract, milestones, payments }) {
  const rows = milestones.length ? milestones : payments.filter((payment) => payment.contract_id === contract.id);
  return <div className="mt-6 border-t border-slate-100 pt-5"><div className="section-label">Payment Tracker</div><h3 className="mt-2 text-lg font-black text-slate-900">Milestone payments</h3>{rows.length ? <div className="mt-4 overflow-x-auto"><table className="data-table w-full min-w-[760px] border-collapse"><thead><tr><th className="px-4 pt-4">Milestone</th><th>Amount</th><th>Due condition</th><th>Validation status</th><th className="pr-4">Payment status</th></tr></thead><tbody>{rows.map((milestone, index) => <tr key={milestone.id || milestone.title || index}><td className="px-4 font-bold text-[#0b2d4a]">{milestone.title || milestone.milestone || "Milestone"}</td><td>{milestone.amount || milestone.amount_inr || "Not provided"}</td><td>{milestone.due_condition || (milestone.done ? "Milestone completed" : "Milestone completion required")}</td><td>{milestone.validation_status || "Pending"}</td><td className="pr-4"><Badge status={milestone.payment_status || "LOCKED"}>{milestone.payment_status || "Locked"}</Badge></td></tr>)}</tbody></table></div> : <div className="empty-state mt-4">No milestone payment records are available.</div>}</div>;
}

function addMonths(value, months) { const date = new Date(value); date.setMonth(date.getMonth() + months); return date.toISOString(); }

function StartupNotifications({ applications, clarifications, pilots, challenges, startup }) {
  const [filter, setFilter] = useState("ALL");
  const notifications = [
    ...challenges.slice(0, 3).map((challenge) => ({ id: `match-${challenge.challenge_id}`, category: "Applications", title: "New AI challenge match", detail: `${challenge.title} · ${challengeMatch(challenge, startup).overall}% match`, action: "View challenge", to: `/startup/challenges/${challenge.challenge_id}?startup=${encodeURIComponent(startup.startup_id)}`, icon: Search })),
    ...applications.map((application) => ({ id: `status-${application.application_id}`, category: "Applications", title: "Application status changed", detail: `${application.application_id} · ${application.status.replaceAll("_", " ")}`, action: "View application", to: `/startup/applications/${application.application_id}?startup=${encodeURIComponent(startup.startup_id)}`, icon: BriefcaseBusiness })),
    ...applications.filter((application) => ["SHORTLISTED", "APPROVED"].includes(application.status)).map((application) => ({ id: `shortlist-${application.application_id}`, category: "Applications", title: "Application shortlisted", detail: `${application.application_id} · Next step: review your application timeline`, action: "View application", to: `/startup/applications/${application.application_id}?startup=${encodeURIComponent(startup.startup_id)}`, icon: CheckCircle2 })),
    ...clarifications.map((item) => ({ id: `clarification-${item.clarification_id}`, category: "Applications", title: item.startup_response ? "Clarification response sent" : "Clarification request", detail: `${item.application_id} · ${item.question}`, action: "Respond", to: `/startup/applications/${item.application_id}?startup=${encodeURIComponent(startup.startup_id)}#clarifications`, icon: MessageSquareText })),
    ...pilots.flatMap((pilot) => { const notificationsForPilot = [{ id: `pilot-${pilot.pilot_id}`, category: "Pilots", title: "Pilot milestone update", detail: `${pilot.pilot_id} · ${pilot.status}`, action: "View pilot", to: `/startup/pilots/${pilot.pilot_id}?startup=${encodeURIComponent(startup.startup_id)}`, icon: Rocket }]; const kpiDeadline = pilot.kpi_deadline || pilot.kpi_submission_deadline; if (kpiDeadline) notificationsForPilot.push({ id: `kpi-${pilot.pilot_id}`, category: "Pilots", title: "KPI submission deadline", detail: `${pilot.pilot_id} · Due ${formatStartupDate(kpiDeadline)}`, action: "Submit KPIs", to: `/startup/pilots/${pilot.pilot_id}/kpis?startup=${encodeURIComponent(startup.startup_id)}`, icon: CalendarClock }); if (pilot.validation_status || pilot.validation_update) notificationsForPilot.push({ id: `validation-${pilot.pilot_id}`, category: "Pilots", title: "Validation update", detail: `${pilot.pilot_id} · ${pilot.validation_status || pilot.validation_update}`, action: "View pilot", to: `/startup/pilots/${pilot.pilot_id}?startup=${encodeURIComponent(startup.startup_id)}`, icon: CheckCircle2 }); const paymentMilestone = (pilot.milestones || []).find((milestone) => milestone.payment_status); if (paymentMilestone) notificationsForPilot.push({ id: `payment-${pilot.pilot_id}`, category: "Payments", title: "Payment update", detail: `${pilot.pilot_id} · ${paymentMilestone.payment_status}`, action: "View payments", to: `/startup/contracts-payments?startup=${encodeURIComponent(startup.startup_id)}`, icon: CircleDollarSign }); return notificationsForPilot; }),
  ];
  const visible = filter === "ALL" ? notifications : notifications.filter((notification) => notification.category === filter);
  const filters = [["ALL", "All"], ["Applications", "Applications"], ["Pilots", "Pilots"], ["Payments", "Payments"], ["System", "System"]];
  return <section className="card p-5 sm:p-6"><div className="section-label">Updates</div><h1 className="mt-2 text-2xl font-black text-slate-900">Notifications</h1><p className="mt-1 text-sm text-slate-500">Concise updates and next actions for {startup.company_name}.</p><div className="mt-5 flex flex-wrap gap-2" role="tablist" aria-label="Notification filters">{filters.map(([value, label]) => <button key={value} type="button" role="tab" aria-selected={filter === value} onClick={() => setFilter(value)} className={`rounded-full px-3 py-1.5 text-xs font-bold ${filter === value ? "bg-[#fff3eb] text-[#d95300]" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>{label}</button>)}</div>{visible.length ? <div className="mt-4 divide-y divide-slate-100">{visible.map(({ id, category, title, detail, action, to, icon: Icon }) => <div key={id} className="flex flex-wrap items-center gap-3 py-4"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-[#d95300]"><Icon className="h-4 w-4" /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><div className="font-bold text-slate-800">{title}</div><span className="tag">{category}</span></div><div className="mt-1 text-sm text-slate-500">{detail}</div></div><Link to={to} className="text-sm font-bold text-[#d95300] hover:underline">{action}</Link></div>)}</div> : <div className="empty-state mt-5">No notifications in this category.</div>}</section>;
}

function Info({ label, value }) {
  return <div><dt className="text-xs font-semibold text-slate-400">{label}</dt><dd className="mt-1 text-sm font-semibold text-slate-700">{value || "Not provided"}</dd></div>;
}

function formatStartupDate(value) {
  if (!value) return "Not specified";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

function challengeName(challengeId, challenges) {
  return challenges.find((challenge) => challenge.challenge_id === challengeId)?.title || challengeId;
}

function readDrafts(startupId) {
  try {
    return Object.values(JSON.parse(localStorage.getItem(STARTUP_DRAFTS_KEY) || "{}"))
      .filter((draft) => draft.startupId === startupId)
      .sort((left, right) => new Date(right.updatedAt) - new Date(left.updatedAt));
  } catch {
    return [];
  }
}
