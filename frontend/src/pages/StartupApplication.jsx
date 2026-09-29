import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  FileText,
  Save,
  Upload,
  X,
} from "lucide-react";
import api from "../api/client.js";

const STEPS = [
  {
    title: "Company Information",
    description: "Tell us about your company and the people behind it.",
    fields: [
      { name: "companyName", label: "Company name", required: true },
      { name: "website", label: "Company website", type: "url" },
      { name: "foundedYear", label: "Year founded", type: "number" },
      { name: "headquarters", label: "Headquarters", required: true },
      { name: "contactName", label: "Primary contact name", required: true },
      { name: "contactEmail", label: "Primary contact email", type: "email", required: true },
      { name: "teamSize", label: "Full-time team members", type: "number" },
    ],
  },
  {
    title: "Proposed Solution",
    description: "Explain the solution you would bring to this challenge.",
    fields: [
      { name: "solutionName", label: "Solution or product name", required: true },
      { name: "problemStatement", label: "Problem you will address", type: "textarea", required: true },
      { name: "solutionDescription", label: "How your solution works", type: "textarea", required: true },
      { name: "innovation", label: "What makes your approach innovative?", type: "textarea" },
      { name: "targetBeneficiaries", label: "Target beneficiaries", type: "textarea" },
    ],
  },
  {
    title: "Technology & Technical Capability",
    description: "Describe the technology, maturity, and delivery capability.",
    fields: [
      { name: "technologyStack", label: "Technology stack", type: "textarea", required: true },
      { name: "trlLevel", label: "Current technology readiness level", type: "select", options: ["TRL 1", "TRL 2", "TRL 3", "TRL 4", "TRL 5", "TRL 6", "TRL 7", "TRL 8", "TRL 9"], required: true },
      { name: "deploymentCapacity", label: "Deployment capacity", required: true },
      { name: "integrations", label: "Relevant integrations or interoperability", type: "textarea" },
      { name: "securityApproach", label: "Data security and privacy approach", type: "textarea" },
    ],
  },
  {
    title: "Previous Pilots & Experience",
    description: "Share relevant deployments, customers, and results.",
    fields: [
      { name: "previousPilots", label: "Number of completed pilots", type: "number" },
      { name: "pilotExperience", label: "Relevant pilot and deployment experience", type: "textarea", required: true },
      { name: "governmentExperience", label: "Government or public-sector experience", type: "textarea" },
      { name: "outcomes", label: "Measurable outcomes and references", type: "textarea" },
    ],
  },
  {
    title: "Pilot Proposal",
    description: "Set out how you would deliver and measure the pilot.",
    fields: [
      { name: "pilotObjectives", label: "Pilot objectives", type: "textarea", required: true },
      { name: "pilotLocations", label: "Proposed locations or sites", required: true },
      { name: "pilotDuration", label: "Proposed duration", required: true },
      { name: "successMetrics", label: "Success metrics and KPIs", type: "textarea", required: true },
      { name: "implementationPlan", label: "Implementation plan and milestones", type: "textarea" },
    ],
  },
  {
    title: "Commercial Proposal",
    description: "Provide an indicative budget and explain the commercial model.",
    fields: [
      { name: "totalCost", label: "Total proposed pilot cost (INR)", type: "number", required: true },
      { name: "costBreakdown", label: "Cost breakdown", type: "textarea", required: true },
      { name: "commercialModel", label: "Commercial model", type: "textarea", required: true },
      { name: "postPilotCosts", label: "Estimated costs after the pilot", type: "textarea" },
    ],
  },
  {
    title: "Documents",
    description: "Upload documents to support your application.",
    fields: [],
  },
  {
    title: "Review & Submit",
    description: "Review your application before submitting it.",
    fields: [],
  },
];

const DRAFTS_KEY = "maitri-startup-application-drafts";
const SUBMISSIONS_KEY = "maitri-startup-application-submissions";

function draftKey(startupId, challengeId) {
  return `${startupId}:${challengeId}`;
}

function loadDraft(startupId, challengeId) {
  try {
    const drafts = JSON.parse(localStorage.getItem(DRAFTS_KEY) || "{}");
    return drafts[draftKey(startupId, challengeId)] || null;
  } catch (error) {
    return { storageError: true };
  }
}

function formatCurrency(value) {
  if (!value) return "Not provided";
  return `₹${Number(value).toLocaleString("en-IN")}`;
}

function createInitialAnswers(startup) {
  return {
    companyName: startup.company_name || "",
    solutionName: startup.products?.[0] || "",
    headquarters: startup.headquarters || "",
    foundedYear: startup.founded_year || "",
    teamSize: startup.team_size || "",
    previousPilots: startup.previous_pilots || 0,
    trlLevel: startup.trl_level ? `TRL ${startup.trl_level}` : "",
    technologyStack: (startup.technologies || []).join(", "),
    deploymentCapacity: startup.deployment_capacity || "",
    pilotExperience: startup.previous_pilots ? `${startup.previous_pilots} previous pilot(s). Add relevant details and outcomes.` : "",
  };
}

function ApplicationField({ field, value, onChange }) {
  const commonProps = {
    id: field.name,
    name: field.name,
    required: field.required,
    value: value || "",
    onChange: (event) => onChange(field.name, event.target.value),
    className: "input-shell mt-2",
  };

  return (
    <label className="block text-sm font-semibold text-slate-700" htmlFor={field.name}>
      {field.label}{field.required && <span className="ml-1 text-[#d95300]" aria-hidden="true">*</span>}
      {field.type === "textarea" ? (
        <textarea {...commonProps} rows={4} />
      ) : field.type === "select" ? (
        <select {...commonProps}>
          <option value="">Select readiness level</option>
          {field.options.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      ) : (
        <input {...commonProps} type={field.type || "text"} min={field.type === "number" ? "0" : undefined} />
      )}
    </label>
  );
}

export default function StartupApplication({ startup, challenge, onSubmitted }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState(() => createInitialAnswers(startup));
  const [documents, setDocuments] = useState([]);
  const [storageError, setStorageError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    const draft = loadDraft(startup.startup_id, challenge.challenge_id);
    setStorageError("");
    if (draft?.storageError) {
      setStorageError("Unable to read the saved draft. You can start a fresh application or try again.");
      return;
    }
    setAnswers({ ...createInitialAnswers(startup), ...(draft?.answers || {}) });
    if (draft) {
      setDocuments((draft.documents || []).map((document) => ({ ...document, file: null })));
    } else setDocuments([]);
  }, [challenge.challenge_id, startup.startup_id]);

  const requiredFields = useMemo(() => STEPS.flatMap((item) => item.fields.filter((field) => field.required).map((field) => field.name)), []);
  const hasAttachedDocument = documents.some((document) => document.file);
  const completedCount = requiredFields.filter((name) => String(answers[name] || "").trim()).length + (hasAttachedDocument ? 1 : 0);
  const completeness = Math.round((completedCount / (requiredFields.length + 1)) * 100);
  const currentStep = STEPS[step];

  const updateAnswer = (name, value) => {
    setAnswers((current) => ({ ...current, [name]: value }));
    setSaveMessage("");
  };

  const saveDraft = () => {
    try {
      const drafts = JSON.parse(localStorage.getItem(DRAFTS_KEY) || "{}");
      drafts[draftKey(startup.startup_id, challenge.challenge_id)] = {
        startupId: startup.startup_id,
        challengeId: challenge.challenge_id,
        answers,
        documents: documents.map(({ name, size, type }) => ({ name, size, type })),
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
      setStorageError("");
      setSaveMessage("Draft saved on this device.");
    } catch (error) {
      setStorageError("Unable to save the draft on this device.");
      setSaveMessage("");
    }
  };

  const addDocuments = (event) => {
    const selected = Array.from(event.target.files || []);
    setDocuments((current) => {
      const additions = selected
        .filter((file) => !current.some((document) => document.name === file.name && document.size === file.size))
        .map((file) => ({ id: `${file.name}-${file.size}-${file.lastModified}`, name: file.name, size: file.size, type: file.type, file }));
      return [...current, ...additions];
    });
    event.target.value = "";
    setSaveMessage("");
  };

  const removeDocument = (id) => setDocuments((current) => current.filter((document) => document.id !== id));

  const submitApplication = async () => {
    if (completeness < 100 || !hasAttachedDocument) {
      setSubmitError("Complete all required fields and attach at least one document before submitting.");
      return;
    }
    setSubmitting(true);
    setSubmitError("");
    try {
      const application = await api.createApplication({
        challenge_id: challenge.challenge_id,
        startup_id: startup.startup_id,
        match_score: challenge.match.overallMatch,
      });
      const submission = {
        ...application,
        startup_id: startup.startup_id,
        challenge_id: challenge.challenge_id,
        answers,
        documents: documents.map(({ name, size, type }) => ({ name, size, type })),
        submitted_at: application.submitted_at || new Date().toISOString(),
      };
      try {
        const submissions = JSON.parse(localStorage.getItem(SUBMISSIONS_KEY) || "[]");
        localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify([...submissions, submission]));
        const drafts = JSON.parse(localStorage.getItem(DRAFTS_KEY) || "{}");
        delete drafts[draftKey(startup.startup_id, challenge.challenge_id)];
        localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
      } catch (error) {
        setStorageError("Application submitted, but the local summary could not be saved.");
      }
      onSubmitted(application);
      setSubmitted(true);
    } catch (error) {
      setSubmitError("Unable to submit the application right now. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const reviewRows = STEPS.slice(0, -1).map((item, index) => (
    {
      title: item.title,
      index,
      content: item.fields.map((field) => ({ label: field.label, value: answers[field.name] })),
    }
  ));

  return (
    <div className="page-shell">
      <Link to={`/startup/challenges?startup=${encodeURIComponent(startup.startup_id)}`} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-[#d95300]">
        <ArrowLeft className="h-4 w-4" />Back to challenges
      </Link>

      <div className="page-intro">
        <div>
          <div className="section-label">Startup Workspace · Application</div>
          <h1 className="mt-2 text-3xl font-black tracking-[-0.045em] text-[#0b2d4a]">Apply to this challenge</h1>
          <p>{challenge.title}</p>
        </div>
        <button type="button" onClick={saveDraft} className="btn-secondary shrink-0"><Save className="h-4 w-4" />Save Draft</button>
      </div>

      <section className="card p-5 sm:p-6" aria-label="Application progress">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><div className="text-sm font-bold text-slate-800">Application completeness</div><div className="mt-1 text-xs text-slate-500">Save your answers as a draft on this device. Reattach files when you return to a saved draft.</div></div>
          <div className="text-xl font-black text-[#0b2d4a]">{completeness}%</div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={completeness} aria-valuemin={0} aria-valuemax={100} aria-label={`${completeness}% complete`}>
          <div className="h-full rounded-full bg-[#ff6b0a] transition-all" style={{ width: `${completeness}%` }} />
        </div>
        <div className="mt-5 grid grid-cols-4 gap-2 md:grid-cols-8">
          {STEPS.map((item, index) => (
            <button key={item.title} type="button" aria-current={step === index ? "step" : undefined} onClick={() => { setStep(index); setSubmitError(""); }} className={`flex min-w-0 flex-col items-center gap-1.5 rounded-xl p-2 text-center text-[10px] font-semibold leading-4 transition sm:text-xs ${step === index ? "bg-[#fff3eb] text-[#c45100]" : index < step ? "text-[#166534] hover:bg-emerald-50" : "text-slate-500 hover:bg-slate-50"}`}>
              <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${step === index ? "bg-[#ff6b0a] text-white" : index < step ? "bg-emerald-100" : "bg-slate-100"}`}>
                {index < step ? <Check className="h-4 w-4" /> : index + 1}
              </span>
              <span className="hidden sm:block">{item.title}</span>
              <span className="sm:hidden">Step {index + 1}</span>
            </button>
          ))}
        </div>
      </section>

      {storageError && <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{storageError}</div>}
      {saveMessage && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{saveMessage}</div>}

      {submitted ? (
        <section className="card p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><CheckCircle2 className="h-6 w-6" /></div>
            <div><div className="section-label">Application submitted</div><h2 className="mt-2 text-2xl font-black text-slate-900">Your application is on its way</h2><p className="mt-2 text-sm leading-6 text-slate-600">Your application for {challenge.title} has been submitted successfully.</p></div>
          </div>
          <ApplicationSummary rows={reviewRows} answers={answers} documents={documents} />
          <div className="mt-6 flex flex-wrap justify-end gap-3"><Link to={`/startup/applications?startup=${encodeURIComponent(startup.startup_id)}`} className="btn-primary">View My Applications <ArrowRight className="h-4 w-4" /></Link></div>
        </section>
      ) : step < STEPS.length - 1 ? (
        <section className="card p-5 sm:p-7">
          <div className="mb-6 flex items-start justify-between gap-3">
            <div><div className="text-xs font-bold uppercase tracking-[0.14em] text-[#d95300]">Step {step + 1} of {STEPS.length}</div><h2 className="mt-2 text-2xl font-black text-slate-900">{currentStep.title}</h2><p className="mt-1 text-sm text-slate-500">{currentStep.description}</p></div>
            <div className="hidden rounded-xl bg-slate-50 p-3 text-xs font-semibold text-slate-500 sm:block">{step + 1} / {STEPS.length}</div>
          </div>

          {step < STEPS.length - 2 ? (
            <div className="grid gap-5 md:grid-cols-2">
              {currentStep.fields.map((field) => <div key={field.name} className={field.type === "textarea" ? "md:col-span-2" : ""}><ApplicationField field={field} value={answers[field.name]} onChange={updateAnswer} /></div>)}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                <Upload className="mx-auto h-8 w-8 text-slate-400" />
                <h3 className="mt-3 font-bold text-slate-800">Upload supporting documents</h3>
                <p className="mt-1 text-sm text-slate-500">Add a pitch deck, company registration, financials, or other supporting documents.</p>
                <label className="btn-secondary mt-4 cursor-pointer">
                  <FileText className="h-4 w-4" />Choose files
                  <input className="sr-only" type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg" onChange={addDocuments} />
                </label>
              </div>
              {documents.length > 0 ? <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">{documents.map((document) => <li key={document.id || `${document.name}-${document.size}`} className="flex items-center justify-between gap-3 p-3"><div className="flex min-w-0 items-center gap-3"><FileText className="h-4 w-4 shrink-0 text-[#d95300]" /><div className="min-w-0"><div className="truncate text-sm font-semibold text-slate-800">{document.name}</div><div className="text-xs text-slate-400">{document.size ? `${(document.size / 1024 / 1024).toFixed(2)} MB` : "Previously added · reattach to upload"}</div></div></div>{document.file && <button type="button" aria-label={`Remove ${document.name}`} onClick={() => removeDocument(document.id)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-red-600"><X className="h-4 w-4" /></button>}</li>)}</ul> : <p className="text-center text-xs text-slate-500">At least one supporting document is required to submit.</p>}
              <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs leading-5 text-blue-800">Drafts keep your answers and document names on this device. Reattach files if you return to a saved draft.</div>
            </div>
          )}

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
            <button type="button" onClick={() => { setStep((current) => Math.max(0, current - 1)); setSubmitError(""); }} disabled={step === 0} className="btn-secondary"><ArrowLeft className="h-4 w-4" />Previous</button>
            <div className="ml-auto flex gap-3"><button type="button" onClick={saveDraft} className="btn-secondary sm:hidden"><Save className="h-4 w-4" />Save Draft</button><button type="button" onClick={() => { setStep((current) => Math.min(STEPS.length, current + 1)); setSubmitError(""); }} className="btn-primary">Continue <ArrowRight className="h-4 w-4" /></button></div>
          </div>
        </section>
      ) : (
        <section className="card p-5 sm:p-7">
          <div className="mb-6"><div className="section-label">Step 8 of 8</div><h2 className="mt-2 text-2xl font-black text-slate-900">Application Summary</h2><p className="mt-1 text-sm text-slate-500">Review your application and make any changes before submitting.</p></div>
          <div className="mb-6 grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-3">
            <SummaryItem label="Company" value={answers.companyName} />
            <SummaryItem label="Challenge" value={challenge.title} />
            <SummaryItem label="Proposed pilot cost" value={formatCurrency(answers.totalCost)} />
          </div>
          <ApplicationSummary rows={reviewRows} answers={answers} documents={documents} onEdit={setStep} />
          {submitError && <div role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{submitError}</div>}
          <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
            <button type="button" onClick={() => setStep(STEPS.length - 1)} className="btn-secondary"><ArrowLeft className="h-4 w-4" />Documents</button>
            <div className="flex flex-wrap gap-3"><button type="button" onClick={saveDraft} className="btn-secondary"><Save className="h-4 w-4" />Save Draft</button><button type="button" disabled={submitting || completeness < 100} onClick={submitApplication} className="btn-primary">{submitting ? "Submitting..." : "Submit Application"} {!submitting && <ArrowRight className="h-4 w-4" />}</button></div>
          </div>
          {completeness < 100 && <p className="mt-3 text-right text-xs text-slate-500">Complete the required fields and attach a document to submit.</p>}
        </section>
      )}
    </div>
  );
}

function ApplicationSummary({ rows, answers, documents, onEdit }) {
  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <section key={row.title} className="rounded-xl border border-slate-200 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="font-bold text-slate-900">{row.title}</h3>
            {onEdit && <button type="button" onClick={() => onEdit(row.index)} className="text-sm font-bold text-[#d95300] hover:underline">Edit</button>}
          </div>
          <dl className="grid gap-x-5 gap-y-3 sm:grid-cols-2">
            {row.content.map(({ label, value }) => <SummaryItem key={label} label={label} value={value} />)}
            {row.index === STEPS.length - 2 && <div className="sm:col-span-2"><dt className="text-xs font-semibold text-slate-400">Supporting documents</dt><dd className="mt-1 text-sm font-semibold text-slate-700">{documents.length ? documents.map((document) => document.name).join(", ") : "No documents uploaded"}</dd></div>}
          </dl>
        </section>
      ))}
    </div>
  );
}

function SummaryItem({ label, value }) {
  return <div><dt className="text-xs font-semibold text-slate-400">{label}</dt><dd className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{value || "Not provided"}</dd></div>;
}
