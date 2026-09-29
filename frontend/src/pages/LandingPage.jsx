import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  Lightbulb,
  LockKeyhole,
  Rocket,
  ShieldCheck,
  Users,
} from "lucide-react";

export const ACTIVE_ROLE_KEY = "maitri-active-workspace-role";

const ROLES = [
  {
    id: "government",
    title: "Government",
    description: "Publish challenges and manage innovation programs.",
    icon: Building2,
    accent: "blue",
    destination: "/government",
  },
  {
    id: "startup",
    title: "Startup",
    description: "Discover opportunities and apply with your solution.",
    icon: Rocket,
    accent: "orange",
    destination: "/startup",
  },
  {
    id: "expert",
    title: "Expert",
    description: "Review applications and contribute your expertise.",
    icon: Lightbulb,
    accent: "green",
    destination: "/expert",
  },
];

const ROLE_STYLES = {
  blue: {
    selected: "border-blue-600 bg-blue-50 ring-2 ring-blue-100",
    icon: "bg-blue-100 text-blue-700",
    check: "text-blue-700",
  },
  orange: {
    selected: "border-orange-500 bg-orange-50 ring-2 ring-orange-100",
    icon: "bg-orange-100 text-orange-700",
    check: "text-orange-700",
  },
  green: {
    selected: "border-emerald-600 bg-emerald-50 ring-2 ring-emerald-100",
    icon: "bg-emerald-100 text-emerald-700",
    check: "text-emerald-700",
  },
};

export default function LandingPage() {
  const navigate = useNavigate();
  const [role, setRole] = useState("government");
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const selectedRole = ROLES.find((item) => item.id === role) || ROLES[0];

  const enterWorkspace = (event) => {
    event.preventDefault();
    sessionStorage.setItem(ACTIVE_ROLE_KEY, role);
    navigate(selectedRole.destination, { replace: true });
  };

  return (
    <main className="min-h-screen overflow-hidden bg-[#f4f7fb] text-slate-900">
      <div className="pointer-events-none absolute -left-40 -top-44 h-[34rem] w-[34rem] rounded-full bg-blue-100/70 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-56 -right-36 h-[38rem] w-[38rem] rounded-full bg-orange-100/60 blur-3xl" />

      <div className="relative mx-auto flex min-h-screen max-w-[1440px] flex-col px-5 py-5 sm:px-8 lg:px-12">
        <header className="flex items-center justify-between">
          <a href="/" className="flex items-center gap-3" aria-label="MAITRI home">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f59e0b] text-xl font-black text-[#102c46] shadow-lg shadow-orange-200/70">M</span>
            <span>
              <span className="block text-[25px] font-black leading-none tracking-[-0.07em] text-[#102c46]">MAITRI</span>
              <span className="mt-1 block text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500">Innovation &amp; Impact</span>
            </span>
          </a>
          <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-2 text-xs font-semibold text-slate-500 sm:flex">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Public innovation platform
          </div>
        </header>

        <div className="grid flex-1 items-center gap-10 py-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(370px,0.85fr)] lg:gap-16 lg:py-12">
          <section className="mx-auto w-full max-w-2xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/80 px-3 py-1.5 text-xs font-bold text-[#194b77] shadow-sm">
              <ShieldCheck className="h-4 w-4" />
              One platform. Three ways to make an impact.
            </div>
            <h1 className="max-w-2xl text-4xl font-black leading-[1.08] tracking-[-0.055em] text-[#102c46] sm:text-5xl xl:text-[58px]">
              Turn bold ideas into <span className="text-[#e96812]">public impact.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
              MAITRI brings government teams, startups, and experts together to solve real-world challenges through innovation.
            </p>

            <div className="mt-9 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-extrabold text-slate-900">Choose your workspace</h2>
                <p className="mt-1 text-xs text-slate-500">Select the role you want to continue as.</p>
              </div>
              <div className="hidden items-center gap-1.5 text-xs font-medium text-slate-400 sm:flex">
                <Users className="h-4 w-4" /> Role-based access
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {ROLES.map((item) => {
                const Icon = item.icon;
                const styles = ROLE_STYLES[item.accent];
                const selected = role === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setRole(item.id)}
                    className={`group relative rounded-2xl border p-4 text-left transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white ${selected ? styles.selected : "border-slate-200 bg-white/75 shadow-sm"}`}
                  >
                    <span className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl ${styles.icon}`}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="block text-sm font-extrabold text-slate-900">{item.title}</span>
                    <span className="mt-1.5 block min-h-10 text-xs leading-5 text-slate-500">{item.description}</span>
                    {selected && <CheckCircle2 className={`absolute right-3 top-3 h-4 w-4 ${styles.check}`} />}
                  </button>
                );
              })}
            </div>

            <div className="mt-8 hidden gap-5 border-t border-slate-200/80 pt-6 sm:grid sm:grid-cols-3">
              {[
                ["01", "Discover", "Find high-impact challenges"],
                ["02", "Collaborate", "Bring the right people together"],
                ["03", "Deliver", "Measure outcomes that matter"],
              ].map(([number, title, description]) => (
                <div key={number} className="flex gap-3">
                  <span className="text-xs font-black text-[#e96812]">{number}</span>
                  <div><div className="text-xs font-bold text-slate-800">{title}</div><div className="mt-1 text-[11px] leading-4 text-slate-500">{description}</div></div>
                </div>
              ))}
            </div>
          </section>

          <section className="mx-auto w-full max-w-md">
            <div className="rounded-[28px] border border-white bg-white p-6 shadow-[0_24px_80px_rgba(15,39,65,0.12)] sm:p-8">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.16em] text-[#e96812]">{selectedRole.title} workspace</div>
                  <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-[#102c46]">
                    {mode === "login" ? "Welcome back" : "Create your account"}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {mode === "login" ? "Sign in to continue to your workspace." : `Register for the ${selectedRole.title.toLowerCase()} workspace.`}
                  </p>
                </div>
                <div className={`hidden h-12 w-12 items-center justify-center rounded-2xl sm:flex ${ROLE_STYLES[selectedRole.accent].icon}`}>
                  {(() => {
                    const Icon = selectedRole.icon;
                    return <Icon className="h-6 w-6" />;
                  })()}
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 rounded-xl bg-slate-100 p-1" role="tablist" aria-label="Account access">
                <button type="button" role="tab" aria-selected={mode === "login"} onClick={() => setMode("login")} className={`rounded-lg px-3 py-2.5 text-sm font-bold transition ${mode === "login" ? "bg-white text-[#102c46] shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>Sign in</button>
                <button type="button" role="tab" aria-selected={mode === "register"} onClick={() => setMode("register")} className={`rounded-lg px-3 py-2.5 text-sm font-bold transition ${mode === "register" ? "bg-white text-[#102c46] shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>Register</button>
              </div>

              <form className="mt-6 space-y-4" onSubmit={enterWorkspace}>
                {mode === "register" && (
                  <label className="block text-sm font-semibold text-slate-700">
                    Full name
                    <input autoComplete="name" required value={name} onChange={(event) => setName(event.target.value)} className="input-shell mt-2" placeholder="Your name" />
                  </label>
                )}
                <label className="block text-sm font-semibold text-slate-700">
                  Work email
                  <input autoComplete="email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="input-shell mt-2" placeholder="you@organization.in" />
                </label>
                <label className="block text-sm font-semibold text-slate-700">
                  Password
                  <span className="relative mt-2 block">
                    <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input autoComplete={mode === "login" ? "current-password" : "new-password"} type={showPassword ? "text" : "password"} required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} className="input-shell pr-11 pl-10" placeholder="At least 8 characters" />
                    <button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((visible) => !visible)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </span>
                </label>

                {mode === "login" && <div className="flex justify-end"><button type="button" className="text-xs font-bold text-[#1d4ed8] hover:underline" onClick={() => window.alert("Password recovery is not configured in this demo.")}>Forgot password?</button></div>}

                <button type="submit" className="btn-primary mt-2 w-full justify-between px-5 py-3">
                  <span>{mode === "login" ? "Sign in" : "Create account"}</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>

              <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-xs leading-5 text-amber-900">
                Demo access: authentication and account registration are not connected to a user service yet. The form opens the selected workspace and does not store your password.
              </div>
              <p className="mt-5 text-center text-[11px] leading-5 text-slate-400">By continuing, you agree to use MAITRI in accordance with your organization’s policies.</p>
            </div>
          </section>
        </div>

        <footer className="flex flex-col items-center justify-between gap-2 border-t border-slate-200/80 py-4 text-[11px] text-slate-400 sm:flex-row">
          <span>© {new Date().getFullYear()} MAITRI · Government Innovation &amp; Startup Enablement</span>
          <span>Built for collaboration. Designed for impact.</span>
        </footer>
      </div>
    </main>
  );
}
