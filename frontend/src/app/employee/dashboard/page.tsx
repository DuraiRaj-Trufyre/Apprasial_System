"use client";

import { useState, useEffect, useRef } from "react";
import { 
  FaHistory, FaSignOutAlt, FaPlusCircle, FaUserCircle, 
  FaChartBar, FaAward, FaTachometerAlt, FaFileAlt,
  FaBars, FaTimes, FaMoon, FaSun, FaStar, FaRocket,
  FaCheckCircle, FaClock, FaSpinner, FaEdit, FaBell
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import { Appraisal } from "../../../utils/auth";


// Mock functions (replace with your actual implementations)
const getUserRole = () => localStorage.getItem("role");
const logout = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("role");
};

// DRY: Helper to decode JWT token
const decodeToken = () => {
  const token = localStorage.getItem("token");
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload;
  } catch {
    return null;
  }
};

export default function ModernEmployeeDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  type EmployeeTab = "dashboard" | "history" | "new-appraisal" | "refill";
  const [activeTab, setActiveTab] = useState<EmployeeTab>("dashboard");
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [history, setHistory] = useState<Appraisal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [userName, setUserName] = useState("Employee");
  const [managerId, setManagerId] = useState("");
  const [refillAppraisalId, setRefillAppraisalId] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const [appraisalParameters, setAppraisalParameters] = useState<any[]>([]);
  const [paramsLoading, setParamsLoading] = useState(true);
  const [paramsError, setParamsError] = useState("");

  useEffect(() => {
    const fetchParameters = async () => {
      setParamsLoading(true);
      setParamsError("");
      try {
        const token = localStorage.getItem("token");
  const res = await fetch("http://127.0.0.1:8000/parameters/active", {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error("Failed to fetch parameters");
  const data = await res.json();
  // Handle array response from /parameters/active
  const activeParams = (Array.isArray(data) ? data : []).filter((p: any) => p.active !== false);
  activeParams.sort((a: any, b: any) => (a.category + a.parameter).localeCompare(b.category + b.parameter));
  setAppraisalParameters(activeParams);
  setFormState(activeParams.map(() => ({ rating: '', comment: '' })));
      } catch (err: any) {
        setParamsError(err.message || "Error loading parameters");
      } finally {
        setParamsLoading(false);
      }
    };
    fetchParameters();
  }, []);

  const [formState, setFormState] = useState<any[]>([]);
  const [overallComment, setOverallComment] = useState("");

  useEffect(() => {
    const decoded = decodeToken();
    if (decoded && decoded.name) {
      setUserName(decoded.name);
    } else {
      setUserName("Employee");
    }
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://127.0.0.1:8000/appraisal/history", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch history");
      const data = await res.json();
      setHistory(data.history || []);
    } catch (err: any) {
      setError(err.message || "Error loading history");
    } finally {
      setLoading(false);
    }
  };

  const handleParamChange = (idx: number, field: 'rating' | 'comment', value: string) => {
    setFormState(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    const formData = new FormData(e.currentTarget);
    const selectedYear = formData.get("year") as string;
    const selectedCycle = formData.get("cycle") as string;
    const cycle_id = selectedYear && selectedCycle ? `${selectedYear}-Cycle ${selectedCycle}` : "";
    // Validation: Ensure all ratings are filled (comments optional)
    for (let i = 0; i < formState.length; i++) {
      if (!formState[i].rating) {
        setError("Please fill all ratings before submitting.");
        return;
      }
    }

    const token = localStorage.getItem("token");
    const decoded = decodeToken();
    if (!decoded) {
      setError("Invalid or missing token.");
      return;
    }

    const parameters = appraisalParameters.map((param, idx) => ({
      category: param.category,
      parameter: param.parameter,
      objective: param.objective,
      kpi: param.kpi,
      weightage: param.weightage,
      rating: Number(formState[idx]?.rating),
      comments: formState[idx]?.comment?.trim() || ''
    }));

    const payload = {
      cycle_id,
      employee_id: decoded.sub,
      manager_id: managerId,
      parameters,
      overall_comment: overallComment.trim()
    };

    try {
      const res = await fetch("http://127.0.0.1:8000/appraisal/submit-self", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error((await res.json()).detail || "Submission failed");
      fetchHistory();
      setSuccess("Appraisal Submitted successfully!");
      formRef.current?.reset();
  setFormState(appraisalParameters.map(() => ({ rating: '', comment: '' })));
  setOverallComment("");
      setTimeout(() => setActiveTab("history"), 2000);
    } catch (err: any) {
      setError(err.message || "Submission failed");
    }
  };

  const handleRefillSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    // Try to auto-select the rejected appraisal if not set
    let appraisalId = refillAppraisalId;
    let original = null;
    if (!appraisalId) {
      const rejected = history.find(a => a.status === 'Rejected - Refill Required');
      appraisalId = rejected?._id || rejected?.appraisalId || rejected?.id || null;
      setRefillAppraisalId(appraisalId);
      original = rejected;
    } else {
      original = history.find(a => (a._id || a.appraisalId || a.id) === appraisalId);
    }
    if (!appraisalId || !original) {
      setError("No appraisal selected for refill.");
      return;
    }
    // Validation: Ensure all ratings are filled (comments optional)
    for (let i = 0; i < formState.length; i++) {
      if (!formState[i].rating) {
        setError("Please fill all ratings before submitting.");
        return;
      }
    }
    const token = localStorage.getItem("token");
    const parameters = appraisalParameters.map((param, idx) => ({
      category: param.category,
      parameter: param.parameter,
      objective: param.objective,
      kpi: param.kpi,
      weightage: param.weightage,
      rating: Number(formState[idx]?.rating),
      comments: formState[idx]?.comment?.trim() || ''
    }));
    const payload = {
      id: appraisalId,
      employee_id: original.employee_id,
      cycle_id: original.cycle_id,
      manager_id: original.manager_id,
      parameters,
      overall_comment: overallComment.trim(),
      status: "Submitted for Manager approval"
    };
    try {
      const res = await fetch("http://127.0.0.1:8000/appraisal/submit-self", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error((await res.json()).detail || "Refill failed");
      fetchHistory();
      setSuccess("Appraisal resubmitted successfully!");
  setFormState(appraisalParameters.map(() => ({ rating: '', comment: '' })));
      setOverallComment("");
      setRefillAppraisalId(null);
      setTimeout(() => setActiveTab("history"), 2000);
    } catch (err: any) {
      setError(err.message || "Refill failed");
    }
  };

  const avgRating = history.length > 0 
    ? (history.reduce((acc, a) => acc + (a.manager_rating ?? 0), 0) / history.length).toFixed(2) 
    : "0";

  // Accordion expanded state for history
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <div className={`min-h-screen flex ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarOpen ? 280 : 80 }}
        className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-r flex flex-col transition-all duration-300 fixed top-0 left-0 h-screen z-30`}
        style={{ minHeight: '100vh' }}
      >
        <div className="p-6 flex items-center justify-between">
          {sidebarOpen && (
            <motion.h1 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}
            >
              AppraisalPro
            </motion.h1>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`p-2 rounded-lg ${theme === 'dark' ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'}`}
          >
            {sidebarOpen ? <FaTimes size={20} /> : <FaBars size={20} />}
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          {[
            { id: 'dashboard', icon: FaTachometerAlt, label: 'Dashboard' },
            { id: 'new-appraisal', icon: FaPlusCircle, label: 'New Appraisal' },
            { id: 'history', icon: FaHistory, label: 'History' },
            { id: 'refill', icon: FaEdit, label: 'Refill' },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as EmployeeTab)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                activeTab === item.id
                  ? theme === 'dark' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-blue-500 text-white'
                  : theme === 'dark'
                    ? 'text-gray-300 hover:bg-gray-700'
                    : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <item.icon size={20} />
              {sidebarOpen && <span className="font-medium">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="p-4 space-y-2">
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              theme === 'dark' ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {theme === 'dark' ? <FaSun size={20} /> : <FaMoon size={20} />}
            {sidebarOpen && <span className="font-medium">Theme</span>}
          </button>
          
          <button
            onClick={() => {
              logout();
              window.location.href = "/";
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              theme === 'dark' ? 'text-red-400 hover:bg-gray-700' : 'text-red-600 hover:bg-red-50'
            }`}
          >
            <FaSignOutAlt size={20} />
            {sidebarOpen && <span className="font-medium">Logout</span>}
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden" style={{ marginLeft: sidebarOpen ? 280 : 80, transition: 'margin-left 0.3s' }}>
        {/* Top Bar */}
        <header className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} 
          border-b px-8 py-4 flex items-center justify-between`}
        >
          <div>
            <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
              Welcome back, {userName}! 👋
            </h2>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Track and manage your performance reviews
            </p>
          </div>
          
          <div className={`flex items-center gap-3 px-4 py-2 rounded-full ${
            theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'
          }`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              theme === 'dark' ? 'bg-blue-600' : 'bg-blue-500'
            } text-white font-bold`}>
              {userName[0]}
            </div>
            {sidebarOpen && (
              <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                {userName}
              </span>
            )}
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-auto p-8">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                {/* Show alert if any appraisal is rejected and refill required */}
                {history.some(a => typeof a.status === 'string' && a.status.toLowerCase().includes('rejected by hr')) && (
                  <div className="p-4 mb-4 rounded-xl border-2 border-red-300 bg-red-50 text-red-900 font-semibold flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center justify-center w-9 h-9 rounded-full bg-red-200 mr-2">
                        <FaBell className="text-red-500 text-xl" />
                      </span>
                      <span className="text-base font-semibold tracking-wide">Your appraisal was rejected by HR</span>
                    </div>
                    <button
                      className="ml-4 px-4 py-2 bg-blue-600 text-white rounded font-semibold hover:bg-blue-700 transition-all"
                      onClick={() => {
                        const rejected = history.find(a => typeof a.status === 'string' && a.status.toLowerCase().includes('rejected by hr'));
                        if (rejected) {
                          setFormState(rejected.parameters?.map((p: any) => ({ rating: p.rating || '', comment: p.comments || '' })) || appraisalParameters.map(() => ({ rating: '', comment: '' })));
                          setOverallComment(rejected.overall_comment || '');
                          setRefillAppraisalId(rejected._id || rejected.appraisalId || rejected.id || null);
                          setActiveTab('refill');
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }
                      }}
                    >
                      Refill & Resubmit
                    </button>
                  </div>
                )}
                {/* Show alert if any appraisal is rejected and refill required (manager rejection) */}
                {history.some(a => a.status === 'Rejected - Refill Required') && (
                  <div className="p-4 mb-4 rounded-lg bg-red-100 border border-red-300 text-red-700 flex items-center justify-between">
                    <div>
                       Your appraisal was <b>rejected</b> by your manager. Please refill and resubmit.
                    </div>
                    <button
                      className="ml-4 px-4 py-2 bg-blue-600 text-white rounded font-semibold hover:bg-blue-700 transition-all"
                      onClick={() => {
                        const rejected = history.find(a => a.status === 'Rejected - Refill Required');
                        if (rejected) {
                          setFormState(rejected.parameters?.map((p: any) => ({ rating: p.rating || '', comment: p.comments || '' })) || appraisalParameters.map(() => ({ rating: '', comment: '' })));
                          setOverallComment(rejected.overall_comment || '');
                          setRefillAppraisalId(rejected._id || rejected.appraisalId || null);
                          setActiveTab('refill');
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }
                      }}
                    >
                      Refill & Resubmit
                    </button>
                  </div>
                )}

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <motion.div
                    whileHover={{ y: -4 }}
                    className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} 
                      rounded-2xl p-6 shadow-lg border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className={`p-3 rounded-xl ${theme === 'dark' ? 'bg-blue-900' : 'bg-blue-100'}`}>
                        <FaFileAlt className={`text-2xl ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
                      </div>
                      <FaStar className="text-yellow-400 text-xl" />
                    </div>
                    <h3 className={`text-3xl font-bold mb-1 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                      {history.length}
                    </h3>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      Total Appraisals
                    </p>
                  </motion.div>

                  <motion.div
                    whileHover={{ y: -4 }}
                    className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} 
                      rounded-2xl p-6 shadow-lg border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className={`p-3 rounded-xl ${theme === 'dark' ? 'bg-green-900' : 'bg-green-100'}`}>
                        <FaChartBar className={`text-2xl ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />
                      </div>
                      <FaAward className="text-yellow-400 text-xl" />
                    </div>
                    <h3 className={`text-3xl font-bold mb-1 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                      {avgRating}
                    </h3>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      Average Rating
                    </p>
                  </motion.div>

                  <motion.div
                    whileHover={{ y: -4 }}
                    className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} 
                      rounded-2xl p-6 shadow-lg border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className={`p-3 rounded-xl ${theme === 'dark' ? 'bg-purple-900' : 'bg-purple-100'}`}>
                        <FaRocket className={`text-2xl ${theme === 'dark' ? 'text-purple-400' : 'text-purple-600'}`} />
                      </div>
                      <FaCheckCircle className="text-green-400 text-xl" />
                    </div>
                    <h3 className={`text-3xl font-bold mb-1 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                      {history.filter(a => a.status === 'hr_evaluated').length}
                    </h3>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      Completed
                    </p>
                  </motion.div>
                </div>

                {/* Quick Actions */}
                <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} 
                  rounded-2xl p-6 shadow-lg border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}
                >
                  <h3 className={`text-xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                    Quick Actions
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                      onClick={() => setActiveTab('new-appraisal')}
                      className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 transition-all"
                    >
                      <FaPlusCircle className="text-2xl" />
                      <div className="text-left">
                        <div className="font-semibold">Start New Appraisal</div>
                        <div className="text-sm opacity-90">Submit your self-assessment</div>
                      </div>
                    </button>
                    
                    <button
                      onClick={() => setActiveTab('history')}
                      className={`flex items-center gap-4 p-4 rounded-xl transition-all ${
                        theme === 'dark' 
                          ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                      }`}
                    >
                      <FaHistory className="text-2xl" />
                      <div className="text-left">
                        <div className="font-semibold">View History</div>
                        <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          Check past appraisals
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'new-appraisal' && (
              <motion.div
                key="new-appraisal"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} 
                  rounded-2xl p-8 shadow-lg border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}
                >
                  <h2 className={`text-2xl font-bold mb-6 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                    New Self-Assessment
                  </h2>

                  <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                          Year
                        </label>
                        <select
                          name="year"
                          required
                          className={`w-full px-4 py-3 rounded-lg border ${
                            theme === 'dark' 
                              ? 'bg-gray-700 border-gray-600 text-white' 
                              : 'bg-white border-gray-300 text-gray-900'
                          } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                        >
                          <option value="">Select Year</option>
                          <option value="2025">2025</option>
                          <option value="2026">2026</option>
                          {/* <option value="2027">2027</option> */}
                        </select>
                      </div>
                      <div>
                        <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                          Cycle
                        </label>
                        <select
                          name="cycle"
                          required
                          className={`w-full px-4 py-3 rounded-lg border ${
                            theme === 'dark' 
                              ? 'bg-gray-700 border-gray-600 text-white' 
                              : 'bg-white border-gray-300 text-gray-900'
                          } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                        >
                          <option value="">Select Cycle</option>
                          <option value="1">Mid-Year Appraisal</option>
                          <option value="2">Year-End Appraisal</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {paramsLoading ? (
                        <div className="text-center py-8 text-blue-600 font-semibold">Loading parameters...</div>
                      ) : paramsError ? (
                        <div className="text-center py-8 text-red-600 font-semibold">{paramsError}</div>
                      ) : appraisalParameters.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 font-semibold">No parameters defined.</div>
                      ) : appraisalParameters.map((param, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className={`p-6 rounded-xl border ${
                            theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h4 className={`font-semibold text-lg mb-1 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                                {param.parameter}
                              </h4>
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                theme === 'dark' ? 'bg-gray-600 text-gray-300' : 'bg-gray-200 text-gray-700'
                              }`}>
                                {param.category}
                              </span>
                            </div>
                            <span className={`text-sm font-medium px-3 py-1 rounded-full ${
                              theme === 'dark' ? 'bg-blue-900 text-blue-300' : 'bg-blue-100 text-blue-700'
                            }`}>
                              Weightage: {(param.weightage * 100).toFixed(0)}%
                            </span>
                          </div>

                          <p className={`text-sm mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                            {param.objective}
                          </p>
                          <p className={`text-xs mb-4 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                            KPIs: {param.kpi}
                          </p>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                                Rating (1-5)
                              </label>
                              <select
                                required
                                value={formState[idx].rating}
                                onChange={e => handleParamChange(idx, 'rating', e.target.value)}
                                className={`w-full px-4 py-2 rounded-lg border ${
                                  theme === 'dark' 
                                    ? 'bg-gray-800 border-gray-600 text-white' 
                                    : 'bg-white border-gray-300 text-gray-900'
                                } focus:ring-2 focus:ring-blue-500`}
                              >
                                <option value="">Select</option>
                                {[1, 2, 3, 4, 5].map(n => (
                                  <option key={n} value={n}>{n}</option>
                                ))}
                              </select>
                            </div>
                            
                            <div>
                              <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                                Comments
                              </label>
                              <input
                                type="text"
                                placeholder="Justify your rating... "
                                value={formState[idx].comment}
                                onChange={e => handleParamChange(idx, 'comment', e.target.value)}
                                className={`w-full px-4 py-2 rounded-lg border ${
                                  theme === 'dark' 
                                    ? 'bg-gray-800 border-gray-600 text-white' 
                                    : 'bg-white border-gray-300 text-gray-900'
                                } focus:ring-2 focus:ring-blue-500`}
                              />
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    {error && (
                      <div className="p-4 rounded-lg bg-red-100 border border-red-300 text-red-700">
                        {error}
                      </div>
                    )}
                    
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        Overall Comments (optional)
                      </label>
                      <textarea
                        value={overallComment}
                        onChange={e => setOverallComment(e.target.value)}
                        placeholder="Add any overall comments about your performance, goals, or feedback... (optional)"
                        className={`w-full px-4 py-2 rounded-lg border min-h-[60px] ${
                          theme === 'dark' 
                            ? 'bg-gray-800 border-gray-600 text-white' 
                            : 'bg-white border-gray-300 text-gray-900'
                        } focus:ring-2 focus:ring-blue-500`}
                      />
                      {success && (
                        <div className="p-4 rounded-lg bg-green-100 border border-green-300 text-green-700 mt-4">
                          {success}
                        </div>
                      )}
                    </div>
                    <button
                      type="submit"
                      className="w-full py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-blue-700 transition-all flex items-center justify-center gap-2"
                    >
                      <FaPlusCircle /> Submit Appraisal
                    </button>
                  </form>
                </div>
              </motion.div>
            )}

            {activeTab === 'history' && (
              <motion.div
                key="history"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} 
                  rounded-2xl p-8 shadow-lg border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}
                >
                  <h2 className={`text-2xl font-bold mb-6 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                    Appraisal History
                  </h2>

                  {loading ? (
                    <div className="flex items-center justify-center py-12">
                      <FaSpinner className="animate-spin text-4xl text-blue-500" />
                    </div>
                  ) : history.length === 0 ? (
                    <div className="text-center py-12">
                      <FaFileAlt className={`text-6xl mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-300'}`} />
                      <p className={`text-lg ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        No appraisals found
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {history.map((item, index) => (
                        <div key={item._id || item.appraisalId || index}>
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className={`p-6 rounded-xl border shadow-sm cursor-pointer select-none ${theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}
                            onClick={() => setExpanded(expanded === index ? null : index)}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className={`text-sm mb-1 font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>Cycle: {item.cycle_id || '-'}</p>
                                <div className="mb-1">
                                  {item.status === 'Rejected by HR - Refill Required' ? (
                                    <span className="inline-block px-3 py-1 rounded-full bg-yellow-200 text-yellow-800 text-xs font-semibold" style={{letterSpacing: 0.5}}>
                                      {item.status}
                                    </span>
                                  ) : item.status === 'Submitted' ? (
                                    <span className="inline-block px-3 py-1 rounded-full bg-yellow-200 text-yellow-800 text-xs font-semibold" style={{letterSpacing: 0.5}}>
                                      Status: {item.status}
                                    </span>
                                  ) : item.status === 'Manager Approved' ? (
                                    <span className="inline-block px-3 py-1 rounded-full bg-yellow-200 text-yellow-800 text-xs font-semibold" style={{letterSpacing: 0.5}}>
                                      Status: {item.status}
                                    </span>
                                  ) : item.status === 'HR Approved' ? (
                                    <span className="inline-block px-3 py-1 rounded-full bg-yellow-200 text-yellow-800 text-xs font-semibold" style={{letterSpacing: 0.5}}>
                                      Status: {item.status}
                                    </span>
                                  ) : item.status === 'Rejected by Manager' ? (
                                    <span className="inline-block px-3 py-1 rounded-full bg-yellow-200 text-yellow-800 text-xs font-semibold" style={{letterSpacing: 0.5}}>
                                      Status: {item.status}
                                    </span>
                                  ) : item.status === 'Rejected by HR' ? (
                                    <span className="inline-block px-3 py-1 rounded-full bg-yellow-200 text-yellow-800 text-xs font-semibold" style={{letterSpacing: 0.5}}>
                                      Status: {item.status}
                                    </span>
                                  ) : (
                                    <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}> 
                                      Status: {item.status || '-'}
                                    </span>
                                  )}
                                </div>
                                <p className={`text-sm mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}><strong>Overall Score: </strong>{item.overall_score ?? '-'}</p>
                              </div>
                              <div className="ml-4">
                                <span className={`inline-block transform transition-transform duration-200 ${expanded === index ? 'rotate-90' : ''}`}>▶</span>
                              </div>
                            </div>
                            {typeof item.status === 'string' && item.status.toLowerCase().includes('rejected by hr') && (
                              <div className="mt-4">
                                <div className="p-4 rounded-xl border-2 border-red-300 bg-red-50 text-red-900 font-semibold mb-2 flex items-center gap-3 shadow-sm">
                                  <span className="flex items-center justify-center w-9 h-9 rounded-full bg-red-200 mr-2">
                                    <FaBell className="text-red-500 text-xl" />
                                  </span>
                                  <span className="text-base font-semibold tracking-wide">Your appraisal was rejected by HR</span>
                                </div>
                                <br />
                                <button
                                  className="py-2 px-4 bg-blue-600 text-white rounded font-semibold hover:bg-blue-700 transition-all"
                                  onClick={e => {
                                    e.stopPropagation();
                                    setFormState(item.parameters?.map((p: any) => ({ rating: p.rating || '', comment: p.comments || '' })) || appraisalParameters.map(() => ({ rating: '', comment: '' })));
                                    setOverallComment(item.overall_comment || '');
                                    setRefillAppraisalId(item._id || item.appraisalId || null);
                                    setActiveTab('refill');
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                  }}
                                >
                                  Refill & Resubmit
                                </button>
                              </div>
                            )}
                            {item.status === 'Rejected - Refill Required' && (
                              <div className="mt-4">
                                <div className="mb-2 p-4 rounded-xl border-2 border-red-300 bg-red-50 text-yellow-900 font-semibold flex items-center justify-between shadow-sm">
                                  <div className="flex items-center gap-3">
                                    <span className="flex items-center justify-center w-9 h-9 rounded-full bg-red-200 mr-2">
                                      <FaBell className="text-red-500 text-xl" />
                                    </span>
                                    <span className="text-base font-semibold tracking-wide">Your appraisal was rejected by the manager. Please refill and resubmit.</span>
                                  </div>
                                  <button
                                    className="ml-4 px-4 py-2 bg-blue-600 text-white rounded font-semibold hover:bg-blue-700 transition-all"
                                    onClick={e => {
                                      e.stopPropagation();
                                      setFormState(item.parameters?.map((p: any) => ({ rating: p.rating || '', comment: p.comments || '' })) || appraisalParameters.map(() => ({ rating: '', comment: '' }))); 
                                      setOverallComment(item.overall_comment || '');
                                      setRefillAppraisalId(item._id || item.appraisalId || null);
                                      setActiveTab('refill');
                                      window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }}
                                  >
                                    Refill & Resubmit
                                  </button>
                                </div>
                              </div>
                            )}
                          </motion.div>
                          <AnimatePresence>
                            {expanded === index && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className={`overflow-hidden border-l-4 ${theme === 'dark' ? 'border-blue-700 bg-gray-800' : 'border-blue-300 bg-blue-50'} p-4 mb-2`}
                              >
                                <h4 className={`font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>Submitted Entries</h4>
                                <div className="space-y-2">
                                  {(item.parameters || []).map((param: any, idx: number) => (
                                    <div key={idx} className={`p-3 rounded-lg mb-1 border ${theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-white/80 border-gray-200'}`}> 
                                      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                                        <div>
                                          <span className="font-semibold text-sm text-blue-700">{param.parameter}</span>
                                          <span className="ml-2 text-xs text-gray-500">({param.category})</span>
                                        </div>
                                      </div>
                                      <div className="grid grid-cols-1 md:grid-cols-4 gap-1 mt-2">
                                        <div className="flex items-center">
                                                                          <span className={`font-semibold mr-1 ${theme === 'dark' ? 'text-white' : 'text-black'}`}>Employee Rating:</span>
                                                                          <span className={`font-bold ${theme === 'dark' ? 'text-yellow-300' : 'text-blue-600'}`}>{param.rating}</span>
                                        </div>
                                        <div className="flex items-center">
                                                                          <span className={`font-semibold mr-1 ${theme === 'dark' ? 'text-white' : 'text-black'}`}>Manager Rating:</span>
                                                                          <span className={`font-bold ${theme === 'dark' ? 'text-teal-300' : 'text-green-600'}`}>{param.manager_rating}</span>
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
                                {item.overall_comment && (
                                  <div className="mt-3 text-sm text-gray-700"><b>Overall Comment:</b> {item.overall_comment}</div>
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

            {activeTab === 'refill' && (
              (() => {
                // Find a rejected appraisal (by manager or HR)
                const rejected = history.find(a => a.status === 'Rejected - Refill Required' || (typeof a.status === 'string' && a.status.toLowerCase().includes('rejected by hr')));
                if (!rejected) {
                  return (
                    <div className="p-4 rounded-lg bg-yellow-100 border border-yellow-300 text-yellow-800 font-semibold mb-4">
                      No appraisal available for refill. Please select a rejected appraisal from your history.
                    </div>
                  );
                }
                return (
                  <motion.div
                    key="refill"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                  >
                    <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-2xl p-8 shadow-lg border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                      <h2 className={`text-2xl font-bold mb-6 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>Refill & Resubmit Appraisal</h2>
                      <form ref={formRef} onSubmit={handleRefillSubmit} className="space-y-6">
                        <div className="space-y-4">
                          {appraisalParameters.map((param, idx) => (
                            <motion.div
                              key={idx}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: idx * 0.05 }}
                              className={`p-6 rounded-xl border ${theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}
                            >
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                  <h4 className={`font-semibold text-lg mb-1 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>{param.parameter}</h4>
                                  <span className={`text-xs px-2 py-1 rounded-full ${theme === 'dark' ? 'bg-gray-600 text-gray-300' : 'bg-gray-200 text-gray-700'}`}>{param.category}</span>
                                </div>
                              </div>
                              <p className={`text-sm mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>{param.objective}</p>
                              <p className={`text-xs mb-4 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>KPIs: {param.kpi}</p>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Rating (1-5)</label>
                                  <select
                                    required
                                    value={formState[idx].rating}
                                    onChange={e => handleParamChange(idx, 'rating', e.target.value)}
                                    className={`w-full px-4 py-2 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} focus:ring-2 focus:ring-blue-500`}
                                  >
                                    <option value="">Select</option>
                                    {[1, 2, 3, 4, 5].map(n => (
                                      <option key={n} value={n}>{n}</option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Comments</label>
                                  <input
                                    type="text"
                                    placeholder="Justify your rating... "
                                    value={formState[idx].comment}
                                    onChange={e => handleParamChange(idx, 'comment', e.target.value)}
                                    className={`w-full px-4 py-2 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} focus:ring-2 focus:ring-blue-500`}
                                  />
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                        {error && (
                          <div className="p-4 rounded-lg bg-red-100 border border-red-300 text-red-700">{error}</div>
                        )}
                        <div>
                          <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Overall Comments (optional)</label>
                          <textarea
                            value={overallComment}
                            onChange={e => setOverallComment(e.target.value)}
                            placeholder="Add any overall comments about your performance, goals, or feedback... (optional)"
                            className={`w-full px-4 py-2 rounded-lg border min-h-[60px] ${theme === 'dark' ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} focus:ring-2 focus:ring-blue-500`}
                          />
                          {success && (
                            <div className="p-4 rounded-lg bg-green-100 border border-green-300 text-green-700 mt-4">{success}</div>
                          )}
                        </div>
                        <button
                          type="submit"
                          className="w-full py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-blue-700 transition-all flex items-center justify-center gap-2"
                        >
                          <FaPlusCircle /> Resubmit Appraisal
                        </button>
                      </form>
                    </div>
                  </motion.div>
                );
              })()
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
