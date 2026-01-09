"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaSave,
  FaTimes,
  FaCheckCircle,
  FaTimesCircle,
} from "react-icons/fa";

interface Parameter {
  id?: string;
  category: string;
  parameter: string;
  objective: string;
  kpi: string;
  weightage: number;
  active: boolean;
}

export default function AdminParametersPage() {
  const router = useRouter();
  const [parameters, setParameters] = useState<Parameter[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [newParam, setNewParam] = useState<Parameter>({
    category: "",
    parameter: "",
    objective: "",
    kpi: "",
    weightage: 0,
    active: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchParameters();
  }, []);

  const fetchParameters = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://127.0.0.1:8000/parameters", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch parameters");
      setParameters(await res.json());
    } catch (err: any) {
      setError(err.message || "Error loading parameters");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (
    e: any,
    field: keyof Parameter,
    isNew = false
  ) => {
    const value =
      field === "weightage"
        ? parseFloat(e.target.value)
        : field === "active"
        ? e.target.checked
        : e.target.value;

    if (isNew) {
      setNewParam((p) => ({ ...p, [field]: value }));
    } else if (editing) {
      setParameters((prev) =>
        prev.map((p) => (p.id === editing ? { ...p, [field]: value } : p))
      );
    }
  };

  const handleAdd = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://127.0.0.1:8000/parameters", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newParam),
      });
      if (!res.ok) throw new Error("Add failed");
      setSuccess("Parameter added successfully");
      setNewParam({
        category: "",
        parameter: "",
        objective: "",
        kpi: "",
        weightage: 0,
        active: true,
      });
      fetchParameters();
      setTimeout(() => setSuccess(""), 2000);
    } catch (err: any) {
      setError(err.message || "Add failed");
    }
  };

  const handleSave = async (id: string) => {
    const param = parameters.find((p) => p.id === id);
    if (!param) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://127.0.0.1:8000/parameters/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(param),
      });
      if (!res.ok) throw new Error("Update failed");
      setSuccess("Parameter updated");
      setEditing(null);
      fetchParameters();
      setTimeout(() => setSuccess(""), 2000);
    } catch (err: any) {
      setError(err.message || "Update failed");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this parameter?")) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://127.0.0.1:8000/parameters/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Delete failed");
      setSuccess("Parameter deleted");
      fetchParameters();
      setTimeout(() => setSuccess(""), 2000);
    } catch (err: any) {
      setError(err.message || "Delete failed");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    router.push("/");
  };

  return (
    <div className="max-w-6xl mx-auto p-8 space-y-8 bg-gray-50 min-h-screen">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-800">
          Evaluation Parameters
        </h1>
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition"
        >
          Logout
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 rounded-lg bg-green-50 border border-green-200 text-green-700">
          {success}
        </div>
      )}

      {/* Add New */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Add New Parameter
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {["category", "parameter", "objective", "kpi"].map((f) => (
            <div key={f} className="flex flex-col">
              <label className="mb-1 text-xs font-medium text-gray-700 capitalize">{f.charAt(0).toUpperCase() + f.slice(1)}</label>
              <input
                className="input bg-white text-gray-900 border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-sm"
                placeholder={f.charAt(0).toUpperCase() + f.slice(1)}
                value={(newParam as any)[f]}
                onChange={(e) => handleInputChange(e, f as keyof Parameter, true)}
              />
            </div>
          ))}
          <div className="flex flex-col">
            <label className="mb-1 text-xs font-medium text-gray-700 capitalize">Weightage</label>
            <input
              type="number"
              min="0"
              max="1"
              step="0.01"
              className="input bg-white text-gray-900 border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-sm"
              placeholder="Weightage (0 - 1)"
              value={newParam.weightage}
              onChange={(e) => handleInputChange(e, "weightage", true)}
            />
          </div>
          <label className="flex items-center gap-2 text-gray-700 mt-6">
            <input
              type="checkbox"
              checked={newParam.active}
              onChange={(e) => handleInputChange(e, "active", true)}
            />
            Active
          </label>
        </div>

        <button
          onClick={handleAdd}
          className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <FaPlus /> Add Parameter
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              {[
                "Category",
                "Parameter",
                "Objective",
                "KPI",
                "Weight",
                "Status",
                "Actions",
              ].map((h) => (
                <th
                  key={h}
                  className="p-3 text-left font-semibold text-gray-700"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr key="loading">
                <td colSpan={7} className="p-6 text-center text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : (
              parameters.map((p, idx) => (
                <tr
                  key={p.id || idx}
                  className="border-t hover:bg-gray-50 transition"
                >
                  {(
                    ["category", "parameter", "objective", "kpi"] as const
                  ).map((f) => (
                    <td key={f} className="p-3 text-gray-800">
                      {editing === p.id ? (
                        <input
                          className="input-sm"
                          value={(p as any)[f]}
                          onChange={(e) =>
                            handleInputChange(e, f)
                          }
                        />
                      ) : (
                        (p as any)[f]
                      )}
                    </td>
                  ))}

                  <td className="p-3 text-gray-800">
                    {editing === p.id ? (
                      <input
                        type="number"
                        step="0.01"
                        className="input-sm"
                        value={p.weightage}
                        onChange={(e) =>
                          handleInputChange(e, "weightage")
                        }
                      />
                    ) : (
                      p.weightage
                    )}
                  </td>

                  <td className="p-3">
                    {editing === p.id ? (
                      <input
                        type="checkbox"
                        checked={p.active}
                        onChange={(e) =>
                          handleInputChange(e, "active")
                        }
                      />
                    ) : p.active ? (
                      <span className="badge green">
                        <FaCheckCircle /> Active
                      </span>
                    ) : (
                      <span className="badge red">
                        <FaTimesCircle /> Inactive
                      </span>
                    )}
                  </td>

                  <td className="p-3 flex gap-2">
                    {editing === p.id ? (
                      <>
                        <button
                          onClick={() => handleSave(p.id!)}
                          className="icon-btn green"
                        >
                          <FaSave />
                        </button>
                        <button
                          onClick={() => setEditing(null)}
                          className="icon-btn gray"
                        >
                          <FaTimes />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => setEditing(p.id!)}
                          className="icon-btn blue"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id!)}
                          className="icon-btn red"
                        >
                          <FaTrash />
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Utility styles */}
      <style jsx>{`
        .input {
          padding: 0.6rem;
          border-radius: 0.5rem;
          border: 1px solid #d1d5db;
          background: white;
        }
        .input:focus {
          outline: none;
          border-color: #2563eb;
          box-shadow: 0 0 0 1px #2563eb;
        }
        .input-sm {
          padding: 0.35rem;
          border-radius: 0.4rem;
          border: 1px solid #d1d5db;
          background: white;
        }
        .badge {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          padding: 0.2rem 0.6rem;
          border-radius: 999px;
          font-size: 0.75rem;
          font-weight: 500;
        }
        .badge.green {
          background: #dcfce7;
          color: #166534;
        }
        .badge.red {
          background: #fee2e2;
          color: #991b1b;
        }
        .icon-btn {
          padding: 0.45rem;
          border-radius: 0.45rem;
          color: white;
        }
        .icon-btn.blue {
          background: #3b82f6;
        }
        .icon-btn.red {
          background: #ef4444;
        }
        .icon-btn.green {
          background: #22c55e;
        }
        .icon-btn.gray {
          background: #9ca3af;
        }
      `}</style>
    </div>
  );
}
