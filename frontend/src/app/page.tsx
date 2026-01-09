
"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  UserPlus,
  Building2,
  TrendingUp,
  Lock,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";

export default function HomePage() {
  const [loading, setLoading] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [registerForm, setRegisterForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "employee",
    manager_id: ""
  });
  const [registerError, setRegisterError] = useState("");
  const [managers, setManagers] = useState<{id: string, name: string, email: string}[]>([]);
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>("login");

  useEffect(() => {
    if (registerForm.role === "employee") {
      fetch("http://127.0.0.1:8000/auth/managers")
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setManagers(data);
          } else if (Array.isArray(data.managers)) {
            setManagers(data.managers);
          } else {
            setManagers([]);
          }
        })
        .catch(() => setManagers([]));
    }
  }, [registerForm.role]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setLoginError("");
    const params = new URLSearchParams();
    params.append("username", loginForm.email);
    params.append("password", loginForm.password);
    try {
      const res = await fetch("http://127.0.0.1:8000/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString()
      });
      if (!res.ok) throw new Error((await res.json()).detail || "Login failed");
      const data = await res.json();
      localStorage.setItem("token", data.access_token);
      router.push("/dashboard");
    } catch (err: any) {
      setLoginError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setRegisterError("");
    const payload = { ...registerForm };
    if (registerForm.role === "hr") payload.manager_id = "";
    try {
      const res = await fetch("http://127.0.0.1:8000/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error((await res.json()).detail || "Registration failed");
      // After successful register, switch to login tab within the same page
      setActiveTab("login");
      // Optionally clear the register form
      setRegisterForm({ name: "", email: "", password: "", role: "employee", manager_id: "" });
    } catch (err: any) {
      setRegisterError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-zinc-950 via-slate-900 to-zinc-800">
      {/* Decorative Blurs */}
      <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-indigo-600/30 blur-3xl" />
      <div className="absolute top-1/3 -right-32 h-96 w-96 rounded-full bg-fuchsia-600/20 blur-3xl" />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-12"
        >
          {/* Left – Premium Marketing */}
          <div className="flex flex-col justify-center text-white space-y-8">
            <span className="w-fit rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1 text-xs font-medium text-indigo-300">
              Enterprise HRMS • Appraisal Platform
            </span>

            <h1 className="text-5xl font-extrabold leading-tight tracking-tight">
              Modern Performance
              <br />
              <span className="text-indigo-400">Appraisal System</span>
            </h1>

            <p className="max-w-xl text-lg leading-relaxed text-zinc-300">
              Run transparent, structured, and data-driven appraisal cycles for
              employees, managers, and HR — all in one secure enterprise-grade
              platform.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Feature
                icon={<TrendingUp size={18} />}
                title="Goal & KRA Alignment"
                desc="Connect OKRs, KRAs, and competencies directly to performance outcomes."
              />
              <Feature
                icon={<Building2 size={18} />}
                title="Manager & HR Reviews"
                desc="Multi-level reviews with scoring, feedback, and calibration."
              />
              <Feature
                icon={<Lock size={18} />}
                title="Enterprise Security"
                desc="Role-based access, audit trails, and secure authentication."
              />
              <Feature
                icon={<ShieldCheck size={18} />}
                title="Compliance Ready"
                desc="Consistent, fair, and compliant appraisal workflows."
              />
            </div>

            <p className="text-xs text-zinc-500">
              Designed for fast-growing companies and mature enterprises.
            </p>
          </div>

          {/* Right – Auth Card */}
          <Card className="relative overflow-hidden bg-white/5 backdrop-blur-xl border-white/10 text-white shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
            <CardHeader className="relative">
              <CardTitle className="text-center text-2xl font-semibold">
                Welcome to HRMS
              </CardTitle>
              <p className="text-center text-sm text-zinc-400">
                Login or create an account to continue
              </p>
            </CardHeader>
            <CardContent className="relative">
              <Tabs defaultValue="login" value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid grid-cols-2 mb-8">
                  <TabsTrigger value="login">Login</TabsTrigger>
                  <TabsTrigger value="register">Register</TabsTrigger>
                </TabsList>


                <TabsContent value="login">
                  <form
                    className="flex flex-col gap-4 w-full max-w-md mx-auto"
                    onSubmit={handleLogin}
                  >
                    <Input name="email" placeholder="Work Email" type="email" required value={loginForm.email} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLoginForm(f => ({ ...f, email: e.target.value }))} className="w-full" />
                    <Input name="password" placeholder="Password" type="password" required value={loginForm.password} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLoginForm(f => ({ ...f, password: e.target.value }))} className="w-full" />
                    {loginError && <div className="text-red-400 text-xs w-full">{loginError}</div>}
                      <Button disabled={loading} className="w-full flex items-center justify-center gap-2">
                        <ShieldCheck size={16} /> <span>Secure Login</span>
                      </Button>
                    <p className="text-center text-xs text-zinc-500 w-full">
                      Protected with enterprise-grade security
                    </p>
                  </form>
                </TabsContent>


                <TabsContent value="register">
                  <form
                    className="flex flex-col gap-4 w-full max-w-md mx-auto"
                    onSubmit={handleRegister}
                  >
                    <Input name="name" placeholder="Full Name" required value={registerForm.name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRegisterForm(f => ({ ...f, name: e.target.value }))} className="w-full" />
                    <Input name="email" placeholder="Work Email" type="email" required value={registerForm.email} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRegisterForm(f => ({ ...f, email: e.target.value }))} className="w-full" />
                    <Input name="password" placeholder="Create Password" type="password" required value={registerForm.password} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRegisterForm(f => ({ ...f, password: e.target.value }))} className="w-full" />
                      <select name="role" value={registerForm.role} onChange={e => setRegisterForm(f => ({ ...f, role: e.target.value }))} className="w-full px-3 py-2 rounded border border-zinc-300 bg-white/80 text-black focus:outline-none focus:ring-2 focus:ring-indigo-400">
                        <option value="employee">Employee</option>
                        <option value="manager">Manager</option>
                        <option value="hr">HR</option>
                      </select>
                      {registerForm.role === "employee" && (
                        <select name="manager_id" value={registerForm.manager_id} onChange={e => setRegisterForm(f => ({ ...f, manager_id: e.target.value }))} required className="w-full px-3 py-2 rounded border border-zinc-300 bg-white/80 text-black focus:outline-none focus:ring-2 focus:ring-indigo-400">
                          <option value="">Select Manager</option>
                          {managers.map((m) => (
                            <option key={m.id} value={m.id}>{m.name} ({m.email})</option>
                          ))}
                        </select>
                      )}
                    {registerError && <div className="text-red-400 text-xs w-full">{registerError}</div>}
                      <Button disabled={loading} className="w-full flex items-center justify-center gap-2">
                        <UserPlus size={16} /> <span>Create Account</span>
                      </Button>
                    <p className="text-center text-xs text-zinc-500 w-full">
                      By registering, you agree to your organization’s HR policies
                    </p>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </main>
  );
}

function Feature({ icon, title, desc }: any) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="mt-1 text-indigo-400">{icon}</div>
      <div>
        <p className="font-semibold text-white">{title}</p>
        <p className="text-sm text-zinc-400 mt-1">{desc}</p>
      </div>
    </div>
  );
}
