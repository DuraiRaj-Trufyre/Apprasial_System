"use client";

import { useEffect, useState } from "react";
import { FaTrash, FaPlus, FaEdit, FaSave, FaTimes } from "react-icons/fa";

interface User {
  id?: string;
  name: string;
  email: string;
  role: string;
  manager_id?: string | null;
}

const roleOptions = [
  { value: "employee", label: "Employee" },
  { value: "manager", label: "Manager" },
  { value: "hr", label: "HR" },
  { value: "superadmin", label: "Super Admin" },
];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [newUser, setNewUser] = useState<User & { password?: string }>({
    name: "",
    email: "",
    role: "employee",
    manager_id: null,
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchUsers();
  }, []);

  /* ================= API ================= */

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://127.0.0.1:8000/auth/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch users");
      setUsers(await res.json());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: any, field: keyof User, isNew = false) => {
    const value = e.target.value;
    if (isNew) {
      setNewUser((u) => ({ ...u, [field]: value }));
    } else if (editing) {
      setUsers((prev) =>
        prev.map((u) => (u.id === editing ? { ...u, [field]: value } : u))
      );
    }
  };

  const handleAdd = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://127.0.0.1:8000/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newUser),
      });
      if (!res.ok) throw new Error("Add failed");

      setSuccess("User added successfully");
      setNewUser({ name: "", email: "", role: "employee", manager_id: null, password: "" });
      fetchUsers();
      setTimeout(() => setSuccess(""), 2000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSave = async (id: string) => {
    const user = users.find((u) => u.id === id);
    if (!user) return;

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://127.0.0.1:8000/users/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(user),
      });
      if (!res.ok) throw new Error("Update failed");

      setEditing(null);
      setSuccess("User updated");
      fetchUsers();
      setTimeout(() => setSuccess(""), 2000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this user?")) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://127.0.0.1:8000/users/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Delete failed");

      setSuccess("User deleted");
      fetchUsers();
      setTimeout(() => setSuccess(""), 2000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  /* ================= UI ================= */

  return (
    <div className="max-w-7xl mx-auto p-8 bg-slate-50 min-h-screen space-y-10">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-slate-800">User Management</h1>
        <p className="text-slate-500 mt-1">Manage employees, managers, HR and admins</p>
      </div>

      {error && <div className="alert error">{error}</div>}
      {success && <div className="alert success">{success}</div>}

      {/* Add User Card */}
      <div className="card">
        <h2 className="card-title">Add New User</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <input className="input" placeholder="Name" value={newUser.name} onChange={e => handleInputChange(e, "name", true)} />
          <input className="input" placeholder="Email" value={newUser.email} onChange={e => handleInputChange(e, "email", true)} />
          <select className="input" value={newUser.role} onChange={e => handleInputChange(e, "role", true)}>
            {roleOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
          <input className="input" placeholder="Password" type="password" value={newUser.password || ""} onChange={e => setNewUser(u => ({ ...u, password: e.target.value }))} />
          <button onClick={handleAdd} className="btn-primary">
            <FaPlus /> Add User
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-slate-100">
            <tr>
              {["Name", "Email", "Role", "Manager", "Actions"].map(h => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="text-center p-6 text-slate-500">Loading...</td></tr>
            ) : (
              users.map(u => (
                <tr key={u.id} className="hover:bg-slate-50 transition">
                  <td>{editing === u.id ? <input className="input-sm" value={u.name} onChange={e => handleInputChange(e, "name")} /> : u.name}</td>
                  <td>{editing === u.id ? <input className="input-sm" value={u.email} onChange={e => handleInputChange(e, "email")} /> : u.email}</td>
                  <td>
                    {editing === u.id ? (
                      <select className="input-sm" value={u.role} onChange={e => handleInputChange(e, "role")}>
                        {roleOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                      </select>
                    ) : (
                      <span className={`badge ${u.role}`}>{u.role}</span>
                    )}
                  </td>
                  <td>{u.manager_id || "-"}</td>
                  <td className="flex gap-2">
                    {editing === u.id ? (
                      <>
                        <button onClick={() => handleSave(u.id!)} className="icon green"><FaSave /></button>
                        <button onClick={() => setEditing(null)} className="icon gray"><FaTimes /></button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => setEditing(u.id!)} className="icon blue"><FaEdit /></button>
                        <button onClick={() => handleDelete(u.id!)} className="icon red"><FaTrash /></button>
                      </>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Styles */}
      <style jsx>{`
        th { padding: 12px; text-align: left; font-weight: 600; color: #334155; }
        td { padding: 12px; color: #334155; }

        .card {
          background: white;
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.06);
        }
        .card-title {
          font-size: 1.25rem;
          font-weight: 600;
          margin-bottom: 16px;
        }
        .input, .input-sm {
          border: 1px solid #cbd5f5;
          border-radius: 10px;
          padding: 10px;
          width: 100%;
        }
        .input-sm { padding: 6px; }
        .btn-primary {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          background: #2563eb;
          color: white;
          border-radius: 12px;
          font-weight: 600;
        }
        .icon {
          padding: 8px;
          border-radius: 10px;
          color: white;
        }
        .icon.blue { background: #3b82f6; }
        .icon.red { background: #ef4444; }
        .icon.green { background: #22c55e; }
        .icon.gray { background: #94a3b8; }
        .badge {
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 600;
          text-transform: capitalize;
        }
        .badge.employee { background: #e0f2fe; color: #0369a1; }
        .badge.manager { background: #ede9fe; color: #5b21b6; }
        .badge.hr { background: #dcfce7; color: #166534; }
        .badge.superadmin { background: #fee2e2; color: #991b1b; }
        .alert.error { background:#fee2e2;padding:12px;border-radius:10px;color:#991b1b; }
        .alert.success { background:#dcfce7;padding:12px;border-radius:10px;color:#166534; }
      `}</style>
    </div>
  );
}
