"use client";

import { useState, useEffect } from "react";
import {
  FaHistory, FaSignOutAlt, FaBell, FaUsers,
  FaChartBar, FaAward, FaTachometerAlt, FaFileAlt,
  FaBars, FaTimes, FaMoon, FaSun, FaStar, FaRocket,
  FaCheckCircle, FaSpinner, FaSearch, FaFilter, FaClock
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";

const getUserRole = () => localStorage.getItem("role");
const logout = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("role");
};

interface Notification {
  id?: string;
  _id?: string;
  employeeName?: string;
  employee_id?: string;
  appraisalId?: string;
  status: string;
  cycle_id?: string;
  overall_score?: number;
  final_score?: number;
  manager_rating?: number;
  manager_overall_score?: number;
  manager_overall_comment?: string;
  hr_overall_score?: number;
  overall_comment?: string;
  parameters?: Array<{
    category?: string;
    parameter?: string;
    objective?: string;
    kpi?: string;
    weightage?: number;
    rating?: number;
    comments?: string;
    manager_rating?: number;
    manager_comments?: string;
    hr_rating?: number;
    hr_comments?: string;
  }>;
}

export default function ModernHRDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [history, setHistory] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [userName, setUserName] = useState("HR");
  const [selectedAccordion, setSelectedAccordion] = useState<string | null>(null);
  const [selectedAppraisal, setSelectedAppraisal] = useState<Notification | null>(null); // For accordion only
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [hrParams, setHrParams] = useState<Array<{ rating: number | string; comments: string }>>([]);

  // Set HR name dynamically from JWT token
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(c =>
          '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
        ).join(''));
        const decoded = JSON.parse(jsonPayload);
        setUserName(decoded.name || "HR");
      } catch {
        setUserName("HR");
      }
    }
  }, []);

  useEffect(() => {
    if (selectedAppraisal && Array.isArray(selectedAppraisal.parameters)) {
      setHrParams(selectedAppraisal.parameters.map((p: any) => ({
        rating: p.hr_rating ?? '',
        comments: p.hr_comments ?? ''
      })));
    } else {
      setHrParams([]);
    }
  }, [selectedAppraisal]);

  useEffect(() => {
    fetchAppraisals();
  }, []);

  const fetchAppraisals = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://127.0.0.1:8000/appraisal/all", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch appraisals");
      const data = await res.json();
      const appraisals = Array.isArray(data) ? data : (data.appraisals || []);

      // Only show manager approved appraisals in HR dashboard
      const managerApproved = appraisals.filter((a: any) => a.status?.toLowerCase().includes('manager approved'));
      setNotifications(managerApproved);

      // Show HR approved appraisals in history tab (case-insensitive, flexible)
      const hrApproved = appraisals.filter((a: any) =>
        typeof a.status === 'string' && a.status.toLowerCase().includes('hr approved')
      );
      setHistory(hrApproved);
    } catch (err) {
      setNotifications([]);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const setHrParamValue = (idx: number, field: 'rating' | 'comments', value: any) => {
    setHrParams(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: value };
      return copy;
    });
  };

  const [hrComment, setHrComment] = useState("");

  const handleRejectAppraisal = async () => {
    setError("");
    if (!selectedAppraisal) return;
    try {
      const token = localStorage.getItem("token");
      const payload = {
        appraisal_id: selectedAppraisal._id || selectedAppraisal.appraisalId || selectedAppraisal.id,
        reason: hrComment.trim() || "Rejected by HR",
        hr_comments: hrComment.trim() || ""
      };
      const res = await fetch("http://127.0.0.1:8000/appraisal/hr/reject", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("Failed to reject appraisal");
      setSuccess("Appraisal rejected and manager/employee notified.");
      setSelectedAccordion(null);
      setSelectedAppraisal(null);
      setHrComment("");
      fetchAppraisals();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError("Failed to reject appraisal");
      setTimeout(() => setError(""), 3000);
    }
  };

  const handleApproveAppraisal = async () => {
    try {
      const token = localStorage.getItem("token");
      const appraisalId = selectedAppraisal?._id || selectedAppraisal?.appraisalId || selectedAppraisal?.id || "";
      if (!appraisalId) {
        setError("Appraisal ID is missing");
        return;
      }
      // No HR ratings/comments needed, just approve
      const payload = { appraisalId };
      const res = await fetch("http://127.0.0.1:8000/appraisal/hr/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("Failed to submit HR approval");
      setSuccess("Appraisal approved successfully!");
      setSelectedAccordion(null);
      setSelectedAppraisal(null);
      fetchAppraisals();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError("Failed to submit HR approval");
      setTimeout(() => setError(""), 3000);
    }
  };

  const total = notifications.length + history.length;
  const pendingCount = notifications.length;
  const approvedCount = history.length;
  const avgRating = (notifications.length + history.length) > 0
    ? ((notifications.reduce((acc, n) => acc + (Number(n.manager_rating) || 0), 0) + history.reduce((acc, h) => acc + (Number(h.manager_rating) || 0), 0)) / (notifications.length + history.length)).toFixed(2)
    : '0';

  const filtered = notifications.filter(n => {
    const displayName = n.employeeName || n.employee_id || '';
    const matchesSearch = search === '' || displayName.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === '' || (n.status || '').toLowerCase().includes(filter.toLowerCase());
    return matchesSearch && matchesFilter;
  });

  return (
    <div className={`min-h-screen flex ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>

      {/* SIDEBAR */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarOpen ? 280 : 80 }}
        className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-r flex flex-col transition-all duration-300 fixed top-0 left-0 h-screen z-30`}
        style={{ minHeight: '100vh' }}
      >
        <div className="p-6 flex items-center justify-between">
          {sidebarOpen && (
            <motion.h1 initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
              AppraisalPro
            </motion.h1>
          )}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className={`p-2 rounded-lg ${theme === 'dark' ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'}`}>
            {sidebarOpen ? <FaTimes size={20} /> : <FaBars size={20} />}
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          {[
            { id: 'dashboard', icon: FaTachometerAlt, label: 'Dashboard' },
            { id: 'pending', icon: FaBell, label: 'Pending Reviews', badge: pendingCount },
            { id: 'history', icon: FaHistory, label: 'History' }
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all relative ${
                activeTab === item.id ? (theme === 'dark' ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white') : (theme === 'dark' ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100')
              }`}
            >
              <item.icon size={20} />
              {sidebarOpen && <span className="font-medium">{item.label}</span>}
              {item.badge !== undefined && item.badge > 0 && (
                <span className={`absolute ${sidebarOpen ? 'right-2 top-2' : 'right-1 top-1'} w-5 h-5 flex items-center justify-center rounded-full text-xs font-bold ${activeTab === item.id ? 'bg-white text-blue-600' : 'bg-red-500 text-white'}`}>
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 space-y-2">
          <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${theme === 'dark' ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}>
            {theme === 'dark' ? <FaSun size={20} /> : <FaMoon size={20} />}
            {sidebarOpen && <span className="font-medium">Theme</span>}
          </button>

          <button onClick={() => { logout(); window.location.href = "/"; }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${theme === 'dark' ? 'text-red-400 hover:bg-gray-700' : 'text-red-600 hover:bg-red-50'}`}>
            <FaSignOutAlt size={20} />
            {sidebarOpen && <span className="font-medium">Logout</span>}
          </button>
        </div>
      </motion.aside>

      {/* MAIN */}
  <div className="flex-1 flex flex-col overflow-hidden" style={{ marginLeft: sidebarOpen ? 280 : 80, transition: 'margin-left 0.3s' }}>

        {/* HEADER */}
        <header className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b px-8 py-4 flex items-center justify-between`}>
          <div>
            <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
              Welcome back, {userName}! 👋
            </h2>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Oversee and approve performance reviews
            </p>
          </div>

          <div className={`flex items-center gap-3 px-4 py-2 rounded-full ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${theme === 'dark' ? 'bg-blue-600' : 'bg-blue-500'} text-white font-bold`}>
              {userName[0]}
            </div>
            <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>{userName}</span>
          </div>
        </header>

        {/* MAIN CONTENT */}
        <main className="flex-1 overflow-auto p-8">
          {success && (
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-4 p-4 rounded-lg bg-green-100 border border-green-300 text-green-700 flex items-center gap-2">
              <FaCheckCircle /> {success}
            </motion.div>
          )}

          {error && (
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-4 p-4 rounded-lg bg-red-100 border border-red-300 text-red-700">
              {error}
            </motion.div>
          )}

          <AnimatePresence mode="wait">

            {/* DASHBOARD TAB */}
            {activeTab === 'dashboard' && (
              <motion.div key="dashboard" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
                
                {/* METRIC CARDS */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

                  {/* TOTAL */}
                  <motion.div whileHover={{ y: -4 }} className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-2xl p-6 shadow-lg border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                    <div className="flex items-center justify-between mb-4">
                      <div className={`p-3 rounded-xl ${theme === 'dark' ? 'bg-blue-900' : 'bg-blue-100'}`}>
                        <FaChartBar className={`text-2xl ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
                      </div>
                      <FaStar className="text-blue-400 text-xl" />
                    </div>
                    <h3 className={`text-3xl font-bold mb-1 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>{total}</h3>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Total Appraisals</p>
                  </motion.div>

                  {/* PENDING */}
                  <motion.div whileHover={{ y: -4 }} className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-2xl p-6 shadow-lg border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                    <div className="flex items-center justify-between mb-4">
                      <div className={`p-3 rounded-xl ${theme === 'dark' ? 'bg-yellow-900' : 'bg-yellow-100'}`}>
                        <FaClock className={`text-2xl ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'}`} />
                      </div>
                      <FaBell className="text-yellow-400 text-xl animate-bounce" />
                    </div>
                    <h3 className={`text-3xl font-bold mb-1 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>{pendingCount}</h3>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Pending Reviews</p>
                  </motion.div>

                  {/* APPROVED */}
                  <motion.div whileHover={{ y: -4 }} className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-2xl p-6 shadow-lg border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                    <div className="flex items-center justify-between mb-4">
                      <div className={`p-3 rounded-xl ${theme === 'dark' ? 'bg-green-900' : 'bg-green-100'}`}>
                        <FaCheckCircle className={`text-2xl ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />
                      </div>
                      <FaAward className="text-green-400 text-xl" />
                    </div>
                    <h3 className={`text-3xl font-bold mb-1 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>{approvedCount}</h3>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Approved</p>
                  </motion.div>

                  {/* AVG RATING */}
                  <motion.div whileHover={{ y: -4 }} className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-2xl p-6 shadow-lg border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                    <div className="flex items-center justify-between mb-4">
                      <div className={`p-3 rounded-xl ${theme === 'dark' ? 'bg-purple-900' : 'bg-purple-100'}`}>
                        <FaUsers className={`text-2xl ${theme === 'dark' ? 'text-purple-400' : 'text-purple-600'}`} />
                      </div>
                      <FaStar className="text-purple-400 text-xl" />
                    </div>
                    <h3 className={`text-3xl font-bold mb-1 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>{avgRating}</h3>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Avg Manager Rating</p>
                  </motion.div>
                </div>

                {/* QUICK ACTIONS */}
                <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-2xl p-6 shadow-lg border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                  <h3 className={`text-xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>Quick Actions</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button onClick={() => setActiveTab('pending')} className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-blue-500 to-teal-600 text-white hover:from-blue-600 hover:to-teal-700 transition-all">
                      <FaBell className="text-2xl" />
                      <div className="text-left">
                        <div className="font-semibold">Review Pending</div>
                        <div className="text-sm opacity-90">{pendingCount} awaiting approval</div>
                      </div>
                    </button>

                    <button onClick={() => setActiveTab('history')} className={`flex items-center gap-4 p-4 rounded-xl transition-all ${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-800'}`}>
                      <FaHistory className="text-2xl" />
                      <div className="text-left">
                        <div className="font-semibold">View History</div>
                        <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Check completed reviews</div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* RECENT ACTIVITY */}
                {(notifications.length > 0 || history.length > 0) && (
                  <div className={`${theme === 'dark' ? 'bg-gray-900' : 'bg-white'} rounded-2xl p-8 shadow-xl border-0 mt-8`}>
                    <h3 className={`text-2xl font-extrabold mb-6 tracking-tight ${theme === 'dark' ? 'text-white' : 'text-blue-900'}`}>
                      Recent Activity
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {[
                        ...notifications.slice(0, 3),
                        ...history.slice(0, Math.max(0, 3 - notifications.length))
                      ].map((n, idx) => (
                        <div
                          key={n._id || n.appraisalId || idx}
                          className={`relative p-6 rounded-2xl shadow-lg border-0 flex flex-col gap-4 items-start justify-between ${
                            theme === 'dark' ? 'bg-gradient-to-br from-gray-800 via-gray-900 to-gray-700' : 'bg-gradient-to-br from-blue-50 via-white to-blue-100'
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <div className={`flex items-center justify-center w-12 h-12 rounded-full shadow-md text-xl font-bold ${theme === 'dark' ? 'bg-blue-900 text-blue-300' : 'bg-blue-200 text-blue-700'}`}>{(n.employeeName || n.employee_id || '?')[0]}</div>
                            <div>
                              <div className={`text-lg font-bold truncate ${theme === 'dark' ? 'text-white' : 'text-blue-900'}`}>{n.employeeName || n.employee_id}</div>
                              <div className={`text-xs font-medium mt-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Cycle: <span className="font-semibold">{n.cycle_id}</span></div>
                            </div>
                          </div>
                          <span className={`self-end px-4 py-1 rounded-full text-xs font-semibold tracking-wide shadow-sm ${
                            n.status?.toLowerCase().includes('approved')
                              ? 'bg-green-100 text-green-700 border border-green-200'
                              : 'bg-yellow-100 text-yellow-700 border border-yellow-200'
                          }`}>
                            {n.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </motion.div>
            )}

            {/* PENDING TAB */}
            {activeTab === 'pending' && (
              <motion.div key="pending" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-2xl p-8 shadow-lg border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                  <h2 className={`text-2xl font-bold mb-6 flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                    <FaBell className="text-yellow-500" /> Pending Reviews
                  </h2>

                  {/* SEARCH + FILTER */}
                  <div className="flex gap-4 mb-6">
                    {/* SEARCH */}
                    <div className={`flex-1 flex items-center gap-2 px-4 py-2 rounded-lg border ${theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-300'}`}>
                      <FaSearch className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`} />
                      <input
                        type="text"
                        placeholder="Search by employee name..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className={`flex-1 bg-transparent outline-none ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}
                      />
                    </div>

                    {/* FILTER */}
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-300'}`}>
                      <FaFilter className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`} />
                      <select
                        value={filter}
                        onChange={e => setFilter(e.target.value)}
                        className={`bg-transparent outline-none ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}
                      >
                        <option value="">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                      </select>
                    </div>
                  </div>

                  {/* LOADING */}
                  {loading ? (
                    <div className="flex items-center justify-center py-12"><FaSpinner className="animate-spin text-4xl text-blue-500" /></div>
                  ) : filtered.length === 0 ? (
                    <div className="text-center py-12">
                      <FaCheckCircle className={`text-6xl mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-300'}`} />
                      <p className={`text-lg ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>No pending reviews</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filtered.map((n, idx) => {
                        const id = String(n._id || n.appraisalId || idx);
                        return (
                          <motion.div
                            key={id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className={`p-6 rounded-xl border transition-all ${theme === 'dark' ? 'bg-gray-700 border-gray-600 hover:border-blue-500' : 'bg-gray-50 border-gray-200 hover:border-blue-400'}`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <h3 className={`text-lg font-semibold mb-1 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>{n.employeeName || n.employee_id || "Unknown"}</h3>
                                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Cycle: {n.cycle_id} • Manager Score: {n.manager_overall_score ?? '-'}</p>
                                <span className="inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">{n.status || 'Pending HR Approval'}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  if (selectedAccordion === id) {
                                    setSelectedAccordion(null);
                                    setSelectedAppraisal(null);
                                  } else {
                                    setSelectedAccordion(id);
                                    setSelectedAppraisal(n);
                                  }
                                }}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg border font-semibold transition-all shadow-sm
                                  ${theme === 'dark'
                                    ? 'bg-blue-900 border-blue-600 text-blue-200 hover:bg-blue-800 hover:border-blue-400'
                                    : 'bg-blue-50 border-blue-500 text-blue-700 hover:bg-blue-100 hover:border-blue-700'}
                                `}
                              >
                                Review
                                <FaRocket className="text-blue-500 text-xl" />
                              </button>
                            </div>
                            {/* Accordion Review Form */}
                            {selectedAccordion === id && selectedAppraisal && (
                              <div className="mt-6 mb-2 bg-white border border-gray-200 rounded-2xl shadow-lg p-8">
                                {/* HEADER */}
                                <div className="flex items-center justify-between mb-6">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-teal-400 flex items-center justify-center text-white text-2xl font-bold">
                                      <FaUsers />
                                    </div>
                                    <span className="text-lg font-semibold text-gray-700 tracking-tight">Performance Review</span>
                                    <span className="text-base font-medium text-gray-500">– {selectedAppraisal.employeeName || selectedAppraisal.employee_id}</span>
                                  </div>
                                  <button onClick={() => { setSelectedAccordion(null); setSelectedAppraisal(null); }} className={`${theme === 'dark' ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-800'}`}> <FaTimes size={24} /></button>
                                </div>
                                {/* CYCLE, SCORES */}
                                <div className="mb-8 flex flex-col md:flex-row gap-6">
                                  <div className={`px-4 py-3 rounded-xl border shadow-sm flex-1 ${theme === 'dark' ? 'border-gray-700 bg-gray-800 text-white' : 'border-gray-200 bg-gray-50 text-gray-900'}`}>
                                    <div className="font-semibold text-sm mb-1">Cycle ID</div>
                                    <div className="text-lg font-bold">{selectedAppraisal.cycle_id ?? '-'}</div>
                                  </div>
                                  <div className={`px-4 py-3 rounded-xl border shadow-sm flex-1 ${theme === 'dark' ? 'border-gray-700 bg-gray-800 text-white' : 'border-gray-200 bg-gray-50 text-gray-900'}`}>
                                    <div className="font-semibold text-sm mb-1">Employee Score</div>
                                    <div className="text-lg font-bold">{selectedAppraisal.overall_score != null ? Number(selectedAppraisal.overall_score).toFixed(2) : '-'}</div>
                                  </div>
                                  <div className={`px-4 py-3 rounded-xl border shadow-sm flex-1 ${theme === 'dark' ? 'border-gray-700 bg-gray-800 text-white' : 'border-gray-200 bg-gray-50 text-gray-900'}`}>
                                    <div className="font-semibold text-sm mb-1">Manager Score</div>
                                    <div className="text-lg font-bold">{
                                      selectedAppraisal.manager_overall_score != null
                                        ? Number(selectedAppraisal.manager_overall_score).toFixed(2)
                                        : (Array.isArray(selectedAppraisal.parameters) && selectedAppraisal.parameters.length > 0
                                            ? (
                                                (
                                                  selectedAppraisal.parameters.reduce((acc, p) => acc + (typeof p.manager_rating === 'number' ? p.manager_rating : 0), 0)
                                                ) / selectedAppraisal.parameters.length
                                              ).toFixed(2)
                                            : '-')
                                    }</div>
                                  </div>
                                </div>
                                {/* PARAMETERS */}
                                <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-8 custom-scroll">
                                  {selectedAppraisal.parameters?.map((p, idx2) => (
                                    <div key={idx2} className={`p-6 rounded-xl border shadow-sm ${theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}> 
                                      <h3 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>{p.parameter}</h3>
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                                        {/* Employee Rating/Comments */}
                                        <div>
                                          <div className={`text-xs font-semibold mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Employee Rating</div>
                                          <div className={`px-3 py-2 rounded-lg border text-sm ${theme === 'dark' ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}>{p.rating ?? '-'}</div>
                                          <div className={`text-xs font-semibold mt-2 mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Employee Comments</div>
                                          <div className={`px-3 py-2 rounded-lg border text-sm min-h-[40px] ${theme === 'dark' ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}>{p.comments ?? '-'}</div>
                                        </div>
                                        {/* Manager Rating/Comments */}
                                        <div>
                                          <div className={`text-xs font-semibold mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Manager Rating</div>
                                          <div className={`px-3 py-2 rounded-lg border text-sm ${theme === 'dark' ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}>{p.manager_rating ?? '-'}</div>
                                          <div className={`text-xs font-semibold mt-2 mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Manager Comments</div>
                                          <div className={`px-3 py-2 rounded-lg border text-sm min-h-[40px] ${theme === 'dark' ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}>{p.manager_comments ?? '-'}</div>
                                        </div>
                                      </div>
                                      <div className={`text-xs mt-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}><strong>Objective:</strong> {p.objective} &nbsp; | &nbsp; <strong>KPI:</strong> {p.kpi}</div>
                                    </div>
                                  ))}
                                  {/* OVERALL COMMENTS */}
                                  {selectedAppraisal?.overall_comment && (
                                    <div className={`p-6 rounded-xl border shadow-sm ${theme === 'dark' ? 'border-blue-700 bg-blue-900' : 'border-blue-200 bg-blue-50'} mt-2`}>
                                      <h3 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>Overall Comments</h3>
                                      <div className={`text-base ${theme === 'dark' ? 'text-blue-100' : 'text-blue-900'}`}>{selectedAppraisal.overall_comment}</div>
                                    </div>
                                  )}
                                  {/* MANAGER OVERALL COMMENTS */}
                                  {selectedAppraisal?.manager_overall_comment && (
                                    <div className={`p-6 rounded-xl border shadow-sm ${theme === 'dark' ? 'border-green-700 bg-green-900' : 'border-green-200 bg-green-50'} mt-2`}>
                                      <h3 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-green-200' : 'text-green-800'}`}>Manager Overall Comments</h3>
                                      <div className={`text-base ${theme === 'dark' ? 'text-green-100' : 'text-green-900'}`}>{selectedAppraisal.manager_overall_comment}</div>
                                    </div>
                                  )}
                                </div>
                                {/* FOOTER */}
                                <div className="pt-4">
                                  <div style={{ height: '1em' }}></div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2 mt-0">HR Comments (optional)</label>
                                  <textarea className="w-full border rounded px-3 py-3 min-h-[60px] focus:ring-2 focus:ring-gray-400 focus:border-gray-400 text-gray-900 bg-gray-50" placeholder="Add your comments about this appraisal..." value={hrComment} onChange={e => setHrComment(e.target.value)} />
                                  <div className="flex gap-4 mt-6">
                                    <button onClick={handleApproveAppraisal} className="flex-1 py-3 bg-gray-800 text-white rounded-lg font-semibold text-lg shadow hover:bg-gray-900 transition-all">Approve Appraisal</button>
                                    <button onClick={handleRejectAppraisal} className="flex-1 py-3 bg-red-600 text-white rounded-lg font-semibold text-lg shadow hover:bg-red-700 transition-all">Reject Appraisal</button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* HISTORY */}
            {activeTab === 'history' && (
              <motion.div key="history" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-2xl p-8 shadow-lg border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                  <h2 className={`text-2xl font-bold mb-6 flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                    <FaHistory className="text-green-500" /> Approved History
                  </h2>

                  {history.length === 0 ? (
                    <div className="text-center py-12">
                      <FaFileAlt className={`text-6xl mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-300'}`} />
                      <p className={`text-lg ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>No approved appraisals yet</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {history.map((h, idx) => (
                        <div key={h._id || h.appraisalId || idx}>
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className={`p-6 rounded-xl border shadow-sm cursor-pointer select-none ${theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}
                            onClick={() => setSelectedAccordion(selectedAccordion === String(idx) ? null : String(idx))}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <h3 className={`text-lg font-semibold mb-1 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>{h.employeeName || h.employee_id || "Unknown"}</h3>
                                <span className="inline-block px-3 py-1 rounded-full bg-yellow-200 text-yellow-800 text-xs font-semibold mb-2" style={{letterSpacing: 0.5}}>
                                  Cycle: {h.cycle_id}
                                </span>
                                <div className={`text-xs font-medium mt-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Employee Score: <span className="font-semibold">{h.overall_score != null ? Number(h.overall_score).toFixed(2) : '-'}</span></div>
                              </div>
                              <div className="ml-4">
                                <span className={`inline-block transform transition-transform duration-200 ${selectedAccordion === String(idx) ? 'rotate-90' : ''}`}>▶</span>
                              </div>
                            </div>
                          </motion.div>
                          <AnimatePresence>
                            {selectedAccordion === String(idx) && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className={`overflow-hidden border-l-4 ${theme === 'dark' ? 'border-blue-700 bg-gray-800' : 'border-blue-300 bg-blue-50'} p-4 mb-2`}
                              >
                                <h4 className={`font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>Submitted Entries</h4>
                                <div className="space-y-2">
                                  {(h.parameters || []).map((param: any, pidx: number) => (
                                    <div key={pidx} className={`p-3 rounded-lg mb-1 border ${theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-white/80 border-gray-200'}`}> 
                                      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                                        <div>
                                          <span className="font-semibold text-sm text-blue-500">{param.parameter}</span>
                                          <span className="ml-2 text-xs text-gray-500">({param.category})</span>
                                        </div>
                                      </div>
                                      <div className="grid grid-cols-1 md:grid-cols-4 gap-1 mt-2">
                                        <div className="flex items-center">
                                          <span className={`font-semibold mr-1 ${theme === 'dark' ? 'text-white' : 'text-black'}`}>Employee Rating:</span>
                                          <span className={`font-bold ${theme === 'dark' ? 'text-yellow-400' : 'text-blue-600'}`}>{param.rating}</span>
                                        </div>
                                        <div className="flex items-center">
                                          <span className={`font-semibold mr-1 ${theme === 'dark' ? 'text-white' : 'text-black'}`}>Manager Rating:</span>
                                          <span className={`font-bold ${theme === 'dark' ? 'text-teal-600' : 'text-green-600'}`}>{param.manager_rating}</span>
                                        </div>
                                        <div className="flex items-center">
                                          <span className={`font-semibold mr-1 ${theme === 'dark' ? 'text-white' : 'text-black'}`}>Emp Comments:</span>
                                          <span className={`font-normal ${theme === 'dark' ? 'text-white' : 'text-gray-700'}`}>{param.comments}</span>
                                        </div>
                                        <div className="flex items-center">
                                          <span className={`font-semibold mr-1 ${theme === 'dark' ? 'text-white' : 'text-black'}`}>Manager Comments:</span>
                                          <span className={`font-normal ${theme === 'dark' ? 'text-white' : 'text-gray-700'}`}>{param.manager_comments || '-'}</span>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                {h.overall_comment && (
                                  <div className="mt-3 text-sm text-gray-700"><b>Overall Comment:</b> {h.overall_comment}</div>
                                )}
                                {h.manager_overall_comment && (
                                  <div className="mt-3 text-sm text-green-700"><b>Manager Overall:</b> {h.manager_overall_comment}</div>
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </main>
      </div>

  {/* MODAL removed, now handled inline as accordion */}

    </div>
  );
}
