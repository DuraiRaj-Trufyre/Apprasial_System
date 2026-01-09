"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "employee",
    manager_id: ""
  });
  const [managers, setManagers] = useState<{id: string, name: string, email: string}[]>([]);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    if (form.role === "employee") {
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
  }, [form.role]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const payload = { ...form };
    if (form.role === "hr") payload.manager_id = "";
    try {
      const res = await fetch("http://127.0.0.1:8000/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error((await res.json()).detail || "Registration failed");
      router.push("/login");
    } catch (err: any) {
      setError(err.message || "Registration failed");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded shadow-md w-full max-w-md space-y-4 text-black">
        <h2 className="text-2xl font-bold mb-4">Register</h2>
        <input name="name" type="text" placeholder="Name" value={form.name} onChange={handleChange} required className="w-full p-2 border rounded text-black" />
        <input name="email" type="email" placeholder="Email" value={form.email} onChange={handleChange} required className="w-full p-2 border rounded text-black" />
        <input name="password" type="password" placeholder="Password" value={form.password} onChange={handleChange} required className="w-full p-2 border rounded text-black" />
        <select name="role" value={form.role} onChange={handleChange} className="w-full p-2 border rounded text-black">
          <option value="employee">Employee</option>
          <option value="manager">Manager</option>
          <option value="hr">HR</option>
        </select>
        {form.role === "employee" && (
          <select name="manager_id" value={form.manager_id} onChange={handleChange} required className="w-full p-2 border rounded text-black">
            <option value="">Select Manager</option>
            {managers.map((m) => (
              <option key={m.id} value={m.id}>{m.name} ({m.email})</option>
            ))}
          </select>
        )}
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">Register</button>
      </form>
    </div>
  );
}
