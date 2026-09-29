import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, FileText, MessageSquareText, PlayCircle, Save, Send, ShieldCheck, X } from "lucide-react";
import api from "../api/client.js";
import Loading from "../components/Loading.jsx";
import Badge from "../components/Badge.jsx";

const SUBMISSIONS_KEY = "maitri-startup-application-submissions";
const EXPERT_SCORECARDS_KEY = "maitri-expert-evaluation-scorecards";
const SCORECARD_CRITERIA = [
  ["technical_feasibility", "Technical Feasibility"],
  ["solution_relevance", "Solution Relevance"],
  ["innovation", "Innovation"],
  ["pilot_readiness", "Pilot Readiness"],
  ["scalability", "Scalability"],
  ["security_compliance", "Security / Compliance"],
  ["team_capability", "Team Capability"],
  ["evidence_previous_experience", "Evidence / Previous Experience"],
];

function emptyScorecard() {
  return {
    criteria: Object.fromEntries(SCORECARD_CRITERIA.map(([key]) => [key, { score: "", comments: "", evidence: "" }])),
    strengths: "",
    risks: "",
    questions: "",
    finalRecommendation: "",
    status: "DRAFT",
  };
}

function readScorecard(applicationId) {
  try {
    const scorecards = JSON.parse(localStorage.getItem(EXPERT_SCORECARDS_KEY) || "{}");
    return { ...emptyScorecard(), ...(scorecards[applicationId] || {}) };
  } catch {
    return emptyScorecard();
  }
}

function readLocalSubmission(applicationId) {
  try {
    const submissions = JSON.parse(localStorage.getItem(SUBMISSIONS_KEY) || "[]");
    return submissions.find((submission) => submission.application_id === applicationId) || null;
  } catch (error) {
    return { storageError: error.message };
  }
}

function ReadOnlyField({ label, value }) {
  return (
    <div>
      <dt className="text-xs font-bold uppercase tracking-[0.1em] text-slate-400">{label}</dt>
      <dd className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">{value || "Not provided in the available record."}</dd>
    </div>
  );
}

function DetailSection({ title, children }) {
  return (
    <section className="card p-5 sm:p-6">
      <h2 className="text-lg font-black text-[#0b2d4a]">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default function ExpertEvaluationDetails({
  applications,
  evaluationsByApplication,
  startups,
  challenges,
  pilots,
  evaluatingId,
  onStartEvaluation,
}) {
  const { applicationId } = useParams();
  const navigate = useNavigate();
  const application = applications.find((item) => item.application_id === applicationId);
  const startup = startups.find((item) => item.startup_id === application?.startup_id);
  const challenge = challenges.find((item) => item.challenge_id === application?.challenge_id);
  const evaluation = evaluationsByApplication.get(applicationId);
  const [department, setDepartment] = useState(null);
  const [problem, setProblem] = useState(null);
  const [clarifications, setClarifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [submission, setSubmission] = useState(() => readLocalSubmission(applicationId));
  const [modalOpen, setModalOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [additionalContext, setAdditionalContext] = useState("");
  const [requiredInformation, setRequiredInformation] = useState("");
  const [deadline, setDeadline] = useState("");
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState("");
  const [message, setMessage] = useState("");
  const [scorecard, setScorecard] = useState(() => readScorecard(applicationId));

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError("");
    setSubmission(readLocalSubmission(applicationId));
    setScorecard(readScorecard(applicationId));
    Promise.all([
      api.getDepartments(),
      api.getProblems(),
      api.getClarificationRequests(applicationId),
    ]).then(([departments, problems, requests]) => {
      if (!active) return;
      setDepartment(departments.find((item) => item.department_id === challenge?.department_id) || null);
      setProblem(problems.find((item) => item.problem_id === challenge?.problem_id) || null);
      setClarifications(requests);
    }).catch((error) => {
      if (active) setLoadError(error.response?.data?.detail || error.message || "Unable to load evaluation details.");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [applicationId, challenge?.department_id, challenge?.problem_id]);

  if (!application || !startup || !challenge) {
    return (
      <div className="page-shell">
        <Link to="/expert/assigned-evaluations" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-[#1d4ed8]"><ArrowLeft className="h-4 w-4" />Back to Assigned Evaluations</Link>
        <div className="card p-6 text-sm text-slate-600">Evaluation details are unavailable because the application, startup, or challenge record could not be found.</div>
      </div>
    );
  }

  const answers = submission?.answers || {};
  const documents = Array.isArray(submission?.documents) ? submission.documents : [];
  const previousPilots = pilots.filter((pilot) => pilot.startup_id === startup.startup_id && pilot.application_id !== applicationId);
  const requiredTechnologies = challenge.required_technologies || [];
  const outcomes = challenge.desired_outcomes || challenge.success_metrics || [];

  const sendClarification = async (event) => {
    event.preventDefault();
    if (!question.trim()) return;
    setSending(true);
    setFormError("");
    try {
      const created = await api.createClarificationRequest({
        application_id: applicationId,
        question: question.trim(),
        additional_context: additionalContext.trim() || undefined,
        required_information: requiredInformation.trim(),
        deadline: deadline || undefined,
      });
      setClarifications((current) => [created, ...current]);
      setQuestion("");
      setAdditionalContext("");
      setRequiredInformation("");
      setDeadline("");
      setModalOpen(false);
      setMessage("Clarification request sent to the startup.");
    } catch (error) {
      setFormError(error.response?.data?.detail || error.message || "Unable to send the clarification request.");
    } finally {
      setSending(false);
    }
  };

  const updateScorecard = (field, value) => setScorecard((current) => ({ ...current, [field]: value }));
  const updateCriterion = (criterion, field, value) => setScorecard((current) => ({
    ...current,
    criteria: { ...current.criteria, [criterion]: { ...current.criteria[criterion], [field]: value } },
    status: "DRAFT",
  }));
  const persistScorecard = (status = "DRAFT") => {
    const nextScorecard = { ...scorecard, status, submittedAt: status === "SUBMITTED" ? new Date().toISOString() : scorecard.submittedAt };
    const scorecards = JSON.parse(localStorage.getItem(EXPERT_SCORECARDS_KEY) || "{}");
    localStorage.setItem(EXPERT_SCORECARDS_KEY, JSON.stringify({ ...scorecards, [applicationId]: nextScorecard }));
    setScorecard(nextScorecard);
    setMessage(status === "SUBMITTED" ? "Expert evaluation submitted on this device." : "Expert evaluation draft saved on this device.");
  };
  const submitScorecard = (event) => {
    event.preventDefault();
    const complete = SCORECARD_CRITERIA.every(([key]) => scorecard.criteria[key]?.score !== "") && scorecard.finalRecommendation;
    if (!complete) {
      setFormError("Add a score for every criterion and select a final recommendation before submitting.");
      return;
    }
    setFormError("");
    persistScorecard("SUBMITTED");
    navigate(`/expert/evaluations/${applicationId}/summary`);
  };
  const scoredCriteria = SCORECARD_CRITERIA.filter(([key]) => scorecard.criteria[key]?.score !== "");
  const overallExpertScore = scoredCriteria.length
    ? Math.round(scoredCriteria.reduce((total, [key]) => total + Number(scorecard.criteria[key].score), 0) / scoredCriteria.length)
    : null;

  return (
    <div className="page-shell">
      <Link to="/expert/assigned-evaluations" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-[#1d4ed8]"><ArrowLeft className="h-4 w-4" />Back to Assigned Evaluations</Link>

      <section className="card p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="section-label">Expert Evaluation · {application.application_id}</div>
            <h2 className="mt-2 text-2xl font-black leading-tight text-[#0b2d4a]">{challenge.title}</h2>
            <p className="mt-2 text-sm text-slate-500">{department?.name || "Department not provided"} · {challenge.sector || "Sector not specified"}</p>
          </div>
          <Badge status={application.status} />
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-5">
          <button type="button" onClick={() => onStartEvaluation(applicationId)} disabled={Boolean(evaluation) || evaluatingId === applicationId} className="btn-primary">
            <PlayCircle className="h-4 w-4" />
            {evaluatingId === applicationId ? "Starting..." : evaluation ? "Evaluation Started" : "Start Evaluation"}
          </button>
          <button type="button" onClick={() => { setFormError(""); setMessage(""); setModalOpen(true); }} className="btn-secondary"><MessageSquareText className="h-4 w-4" />Request Clarification</button>
          {evaluation && <span className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800"><CheckCircle2 className="h-4 w-4" />Evaluation created. Scores and recommendations are not shown here.</span>}
        </div>
      </section>

      {loading && <Loading label="Loading challenge and clarification details..." />}
      {loadError && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{loadError}</div>}
      {submission?.storageError && <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Local proposal metadata could not be read: {submission.storageError}</div>}
      {message && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</div>}

      <DetailSection title="Challenge Details">
        <dl className="grid gap-5 sm:grid-cols-2">
          <ReadOnlyField label="Challenge title" value={challenge.title} />
          <ReadOnlyField label="Department" value={department?.name} />
          <div className="sm:col-span-2"><ReadOnlyField label="Problem statement" value={problem?.description || challenge.description} /></div>
          <div className="sm:col-span-2">
            <dt className="text-xs font-bold uppercase tracking-[0.1em] text-slate-400">Desired outcomes</dt>
            {outcomes.length ? <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-slate-700">{outcomes.map((outcome) => <li key={outcome}>{outcome}</li>)}</ul> : <dd className="mt-1 text-sm leading-6 text-slate-700">Desired outcomes are not specified in the published challenge record.</dd>}
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs font-bold uppercase tracking-[0.1em] text-slate-400">Technical requirements</dt>
            {requiredTechnologies.length ? <div className="mt-2 flex flex-wrap gap-2">{requiredTechnologies.map((technology) => <span className="tag" key={technology}>{technology}</span>)}</div> : <dd className="mt-1 text-sm text-slate-700">No technical requirements are listed.</dd>}
          </div>
        </dl>
      </DetailSection>

      <DetailSection title="Startup & Proposed Solution">
        <dl className="grid gap-5 sm:grid-cols-2">
          <ReadOnlyField label="Startup name" value={startup.company_name} />
          <ReadOnlyField label="Sector" value={(startup.sectors || []).join(", ") || challenge.sector} />
          <div className="sm:col-span-2"><ReadOnlyField label="Proposed solution" value={answers.solutionDescription || startup.description} /></div>
          <ReadOnlyField label="Technology" value={answers.technologyStack || (startup.technologies || []).join(", ")} />
          <ReadOnlyField label="Technology readiness level (TRL)" value={answers.trlLevel || (startup.trl_level ? `TRL ${startup.trl_level}` : "")} />
        </dl>
      </DetailSection>

      <DetailSection title="Previous Pilot Evidence">
        <p className="text-sm leading-6 text-slate-700">{answers.pilotExperience || (startup.previous_pilots ? `${startup.previous_pilots} previous pilot${startup.previous_pilots === 1 ? "" : "s"} reported in the startup profile.` : "No previous pilot evidence is included in the available startup profile or application record.")}</p>
        {previousPilots.length > 0 && <div className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200 px-4">{previousPilots.map((pilot) => <div key={pilot.pilot_id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><div className="font-semibold text-slate-800">{pilot.pilot_id} · {pilot.location || "Location not provided"}</div><div className="mt-1 text-xs text-slate-500">{pilot.duration_months} months · {pilot.start_date ? new Date(pilot.start_date).toLocaleDateString() : "Start date not provided"}</div></div><Badge status={pilot.status} /></div>)}</div>}
      </DetailSection>

      <DetailSection title="Relevant Documents">
        {documents.length ? <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 px-4">{documents.map((document, index) => <li key={`${document.name}-${index}`} className="flex items-center gap-3 py-3"><FileText className="h-4 w-4 shrink-0 text-[#1d4ed8]" /><div className="min-w-0"><div className="truncate text-sm font-semibold text-slate-800">{document.name}</div><div className="text-xs text-slate-400">{document.size ? `${(document.size / 1024 / 1024).toFixed(2)} MB` : "Supporting document"}</div></div></li>)}</ul> : <p className="text-sm text-slate-600">No relevant documents are listed in the available application record.</p>}
        {documents.length > 0 && <p className="mt-3 text-xs leading-5 text-slate-400">Document names are available from submitted application metadata. File contents are not stored by the current application API.</p>}
      </DetailSection>

      {scorecard.status === "SUBMITTED" ? <section className="card border-emerald-200 bg-emerald-50 p-5 sm:p-6">
        <div className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" /><div><h2 className="text-lg font-black text-emerald-950">Evaluation submitted and locked</h2><p className="mt-1 text-sm leading-6 text-emerald-900">This evaluation is no longer editable. An authorized administrator may reopen it when required.</p><Link to={`/expert/evaluations/${applicationId}/summary`} className="btn-secondary mt-4 border-emerald-200 bg-white text-emerald-900">View Evaluation Summary</Link></div></div>
      </section> : <form onSubmit={submitScorecard} className="space-y-6">
        <DetailSection title="AI-Assisted Assessment">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
              <div>
                <p className="font-bold text-amber-950">AI-assisted assessment — Expert judgment required.</p>
                <p className="mt-1 text-sm leading-6 text-amber-900">This context is read-only. Review the underlying application evidence and make the final assessment below.</p>
              </div>
            </div>
          </div>
          {evaluation ? <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <AiContext label="Technical Feasibility" value={evaluation.scores?.technical_feasibility} />
            <AiContext label="Solution Relevance" value={evaluation.scores?.expected_impact} />
            <AiContext label="Innovation" />
            <AiContext label="Pilot Readiness" value={evaluation.scores?.pilot_readiness} />
            <AiContext label="Scalability" value={evaluation.scores?.scalability} />
            <AiContext label="Security / Compliance" value={evaluation.scores?.security} />
            <AiContext label="Team Capability" />
            <AiContext label="Evidence / Previous Experience" />
            <div className="rounded-xl bg-slate-50 p-4 sm:col-span-2"><div className="text-xs font-bold uppercase tracking-[0.1em] text-slate-400">AI overall score</div><div className="mt-1 text-2xl font-black text-[#0b2d4a]">{evaluation.total_score}/100</div><p className="mt-2 text-sm leading-6 text-slate-600">{evaluation.reasoning || "No AI reasoning returned."}</p></div>
          </div> : <div className="empty-state mt-4">No AI-generated assessment is available yet. Use Start Evaluation above to generate read-only context.</div>}
        </DetailSection>

        <DetailSection title="Expert Evaluation Scorecard">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4">
            <div><div className="text-xs font-bold uppercase tracking-[0.1em] text-blue-700">Overall Expert Score</div><div className="mt-1 text-3xl font-black text-[#0b2d4a]">{overallExpertScore === null ? "--" : `${overallExpertScore}/100`}</div></div>
            <div className="text-right text-xs font-semibold text-blue-800">{scoredCriteria.length}/8 criteria scored<br />{scorecard.status === "SUBMITTED" ? "Submitted" : "Draft"}</div>
          </div>
          <div className="space-y-4">
            {SCORECARD_CRITERIA.map(([key, label], index) => <Criterion key={key} index={index + 1} label={label} value={scorecard.criteria[key]} onChange={(field, value) => updateCriterion(key, field, value)} />)}
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <TextArea label="Strengths" value={scorecard.strengths} onChange={(value) => updateScorecard("strengths", value)} placeholder="What makes this proposal credible and valuable?" />
            <TextArea label="Risks" value={scorecard.risks} onChange={(value) => updateScorecard("risks", value)} placeholder="What could prevent success or require mitigation?" />
            <TextArea label="Questions for Startup" value={scorecard.questions} onChange={(value) => updateScorecard("questions", value)} placeholder="What must the startup clarify before a decision?" />
            <label className="block text-sm font-semibold text-slate-700">Final Recommendation<select className="input-shell mt-2" value={scorecard.finalRecommendation} onChange={(event) => updateScorecard("finalRecommendation", event.target.value)}><option value="">Select recommendation</option><option value="RECOMMEND">Recommend</option><option value="RECOMMEND_WITH_CONDITIONS">Recommend with conditions</option><option value="REQUEST_MORE_INFORMATION">Request more information</option><option value="DO_NOT_RECOMMEND">Do not recommend</option></select></label>
          </div>
          {formError && <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{formError}</div>}
          <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-5"><button type="button" className="btn-secondary" onClick={() => { setFormError(""); persistScorecard("DRAFT"); }}><Save className="h-4 w-4" />Save Draft</button><button type="submit" className="btn-primary"><Send className="h-4 w-4" />Submit Evaluation</button></div>
        </DetailSection>
      </form>}

      <section className="card p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-black text-[#0b2d4a]">Clarification Requests</h2><p className="mt-1 text-sm text-slate-500">Requests attached to this application.</p></div><button type="button" onClick={() => { setFormError(""); setMessage(""); setModalOpen(true); }} className="btn-secondary"><MessageSquareText className="h-4 w-4" />Request Clarification</button></div>
        {clarifications.length ? <div className="mt-4 divide-y divide-slate-100">{clarifications.map((item) => <div key={item.clarification_id} className="py-3"><div className="flex flex-wrap items-center justify-between gap-3"><div className="font-semibold text-slate-800">{item.question}</div><Badge status={item.status} /></div><div className="mt-2 grid gap-2 text-sm text-slate-600 sm:grid-cols-2"><div><span className="font-semibold text-slate-500">Required information:</span> {item.required_information}</div><div><span className="font-semibold text-slate-500">Deadline:</span> {item.deadline || "No deadline"}</div></div>{item.additional_context && <p className="mt-1 text-sm text-slate-500">{item.additional_context}</p>}{item.startup_response && <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-950"><div className="font-bold">Startup response</div><p className="mt-1 whitespace-pre-wrap leading-6">{item.startup_response}</p>{item.supporting_document?.name && <div className="mt-2 flex items-center gap-2 text-xs font-semibold"><FileText className="h-4 w-4" />Supporting document: {item.supporting_document.name}</div>}</div>}<div className="mt-1 text-xs text-slate-400">{new Date(item.created_at).toLocaleString()}</div></div>)}</div> : !loading && <p className="mt-4 text-sm text-slate-500">No clarification requests have been sent.</p>}
      </section>

      {modalOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !sending) setModalOpen(false); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="clarification-title" className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
          <div className="flex items-start justify-between gap-3"><div><div className="section-label">Expert Request</div><h2 id="clarification-title" className="mt-2 text-xl font-black text-slate-900">Request Clarification</h2><p className="mt-1 text-sm text-slate-500">Your request will be attached to {applicationId}.</p></div><button type="button" aria-label="Close clarification form" disabled={sending} onClick={() => setModalOpen(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button></div>
          <form className="mt-5 space-y-4" onSubmit={sendClarification}>
            <label className="block text-sm font-semibold text-slate-700">Clarification question <span className="text-red-600">*</span><textarea required maxLength={2000} rows={4} value={question} onChange={(event) => setQuestion(event.target.value)} className="input-shell mt-2" placeholder="What information would help you evaluate this proposal?" /></label>
            <label className="block text-sm font-semibold text-slate-700">Required information <span className="text-red-600">*</span><textarea required maxLength={4000} rows={3} value={requiredInformation} onChange={(event) => setRequiredInformation(event.target.value)} className="input-shell mt-2" placeholder="Describe the exact information or evidence the startup must provide." /></label>
            <label className="block text-sm font-semibold text-slate-700">Deadline <span className="font-normal text-slate-400">(optional)</span><input type="date" value={deadline} onChange={(event) => setDeadline(event.target.value)} className="input-shell mt-2" /></label>
            <label className="block text-sm font-semibold text-slate-700">Additional context <span className="font-normal text-slate-400">(optional)</span><textarea maxLength={4000} rows={3} value={additionalContext} onChange={(event) => setAdditionalContext(event.target.value)} className="input-shell mt-2" placeholder="Indicate which part of the application needs clarification." /></label>
            {formError && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{formError}</div>}
            <div className="flex justify-end gap-3 border-t border-slate-100 pt-4"><button type="button" disabled={sending} onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button><button type="submit" disabled={sending || !question.trim() || !requiredInformation.trim()} className="btn-primary"><MessageSquareText className="h-4 w-4" />{sending ? "Sending..." : "Send Request"}</button></div>
          </form>
        </section>
      </div>}
    </div>
  );
}

function AiContext({ label, value }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-4"><div className="text-xs font-bold uppercase tracking-[0.08em] text-slate-400">{label}</div><div className="mt-2 text-lg font-black text-[#0b2d4a]">{value === undefined ? "Not assessed" : `${value}/100`}</div></div>;
}

function Criterion({ index, label, value, onChange }) {
  return <fieldset className="rounded-xl border border-slate-200 p-4"><legend className="px-1 text-sm font-black text-[#0b2d4a]">{index}. {label}</legend><div className="mt-2 grid gap-4 lg:grid-cols-[150px_minmax(0,1fr)_minmax(0,1fr)]"><label className="text-sm font-semibold text-slate-700">Score<input required type="number" min="0" max="100" value={value.score} onChange={(event) => onChange("score", event.target.value)} className="input-shell mt-2" placeholder="0–100" /></label><TextArea label="Comments" value={value.comments} onChange={(nextValue) => onChange("comments", nextValue)} placeholder="Explain your judgment." /><TextArea label="Supporting evidence" value={value.evidence} onChange={(nextValue) => onChange("evidence", nextValue)} placeholder="Cite documents, metrics, or observed facts." /></div></fieldset>;
}

function TextArea({ label, value, onChange, placeholder }) {
  return <label className="block text-sm font-semibold text-slate-700">{label}<textarea required={label === "Comments" || label === "Supporting evidence"} rows={3} value={value} onChange={(event) => onChange(event.target.value)} className="input-shell mt-2" placeholder={placeholder} /></label>;
}

export function ExpertEvaluationSummary({ applications, startups, challenges }) {
  const { applicationId } = useParams();
  const application = applications.find((item) => item.application_id === applicationId);
  const startup = startups.find((item) => item.startup_id === application?.startup_id);
  const challenge = challenges.find((item) => item.challenge_id === application?.challenge_id);
  const scorecard = readScorecard(applicationId);
  const navigate = useNavigate();

  if (!application || !startup || !challenge) return <div className="card p-6 text-sm text-slate-600">This evaluation summary is unavailable.</div>;
  if (scorecard.status !== "SUBMITTED") return <div className="card p-6 text-sm text-slate-600">Submit the expert evaluation before viewing its summary.</div>;

  const scoredCriteria = SCORECARD_CRITERIA.filter(([key]) => scorecard.criteria[key]?.score !== "");
  const overallScore = Math.round(scoredCriteria.reduce((total, [key]) => total + Number(scorecard.criteria[key].score), 0) / scoredCriteria.length);

  return <div className="page-shell">
    <button type="button" onClick={() => navigate(`/expert/evaluations/${applicationId}`)} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-[#1d4ed8]"><ArrowLeft className="h-4 w-4" />Back to Evaluation Details</button>
    <section className="card p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="section-label">Expert Evaluation Summary · {application.application_id}</div><h1 className="mt-2 text-2xl font-black leading-tight text-[#0b2d4a]">{challenge.title}</h1><p className="mt-2 text-sm text-slate-500">{startup.company_name} · Expert submission</p></div><span className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800"><CheckCircle2 className="h-4 w-4" />Locked</span></div></section>
    <section className="card p-5 sm:p-6"><div className="flex flex-wrap items-end justify-between gap-4"><div><div className="section-label">Overall Score</div><div className="mt-1 text-4xl font-black text-[#0b2d4a]">{overallScore}/100</div></div><div className="text-right text-xs font-semibold text-slate-500">Your submitted evaluation<br />Read-only summary</div></div></section>
    <section className="card p-5 sm:p-6"><h2 className="text-lg font-black text-[#0b2d4a]">Criterion Scores &amp; Comments</h2><div className="mt-4 space-y-4">{SCORECARD_CRITERIA.map(([key, label], index) => <div key={key} className="rounded-xl border border-slate-200 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-black text-slate-800">{index + 1}. {label}</h3><span className="text-lg font-black text-[#d95300]">{scorecard.criteria[key].score}/100</span></div><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700"><strong>Comments:</strong> {scorecard.criteria[key].comments || "No comments provided."}</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600"><strong>Supporting evidence:</strong> {scorecard.criteria[key].evidence || "No supporting evidence provided."}</p></div>)}</div></section>
    <section className="card grid gap-5 p-5 sm:grid-cols-3 sm:p-6"><SummaryText title="Strengths" value={scorecard.strengths} /><SummaryText title="Risks" value={scorecard.risks} /><SummaryText title="Recommendation" value={scorecard.finalRecommendation.replaceAll("_", " ")} /></section>
  </div>;
}

function SummaryText({ title, value }) {
  return <div><h2 className="text-xs font-bold uppercase tracking-[0.1em] text-slate-400">{title}</h2><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{value || "Not provided."}</p></div>;
}