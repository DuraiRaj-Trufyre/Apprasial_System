"use client";

import { useState, useEffect, useRef } from "react";

import { 
  FaHistory, FaSignOutAlt, FaPlusCircle, FaUserTie, 
  FaChartBar, FaAward, FaTachometerAlt, FaFileAlt,
  FaBars, FaTimes, FaMoon, FaSun, FaStar, FaRocket,
  FaCheckCircle, FaClock, FaSpinner, FaBell, FaEdit,
  FaUsers, FaClipboardList
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";

// Mock functions (replace with your actual implementations)


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
  overall_comment?: string; // Employee's overall comment
  manager_overall_comment?: string; // Manager's overall comment
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
  }>;
}

interface Appraisal {
  id: string;
  appraisalId?: string;
  cycle_id?: string;
  status: string;
  employeeName?: string;
  employee_id?: string;
  manager_overall_score?: number;
  manager_rating?: number;
  final_score?: number;
  overall_score?: number;
}

export default function ModernManagerDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [history, setHistory] = useState<Appraisal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const errorRef = useRef<HTMLDivElement>(null);
  const [success, setSuccess] = useState("");
  const [userName, setUserName] = useState("Manager");
  const [managerId, setManagerId] = useState("");
  const [selectedAccordion, setSelectedAccordion] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // ================= STATE =================
  const [selfFormState, setSelfFormState] = useState<any[]>([]);
  const [reviewFormState, setReviewFormState] = useState<any[]>([]);
  const [overallComment, setOverallComment] = useState("");
  const [appraisalParameters, setAppraisalParameters] = useState<any[]>([]);
  const [paramsLoading, setParamsLoading] = useState(true);
  const [paramsError, setParamsError] = useState("");
  // UX polish: disable Approve button while submitting
  const [submitting, setSubmitting] = useState(false);

  // ================= EFFECTS =================
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
        setSelfFormState(activeParams.map(() => ({ rating: '', comment: '' })));
        setReviewFormState(activeParams.map(() => ({ rating: '', comment: '' })));
      } catch (err: any) {
        setParamsError(err.message || "Error loading parameters");
      } finally {
        setParamsLoading(false);
      }
    };
    fetchParameters();
  }, []);

  // ================= EFFECTS =================
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
        setUserName(decoded.name || "Manager");
        setManagerId(decoded.sub);
        
        fetchPendingAppraisals(decoded.sub);
        fetchHistory(decoded.sub);
      } catch {
        setUserName("Manager");
      }
    }
  }, []);

  const fetchPendingAppraisals = async (managerId: string) => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://127.0.0.1:8000/appraisal/manager/pending?manager_id=${managerId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch pending appraisals");
      const data = await res.json();
      setNotifications(data.pending_reviews || []);
    } catch (err: any) {
      setError(err.message || "Error loading notifications");
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async (managerId: string) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://127.0.0.1:8000/appraisal/manager/history?manager_id=${managerId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch history");
      const data = await res.json();
      setHistory(data.history || []);
    } catch (err: any) {
      setError(err.message || "Error loading history");
    }
  };

  // ================= HANDLERS =================
  const openAccordion = (n: Notification) => {
    const id = n.appraisalId || n.id || n._id || null;
    if (selectedAccordion === id) {
      setSelectedAccordion(null);
      return;
    }
    setSelectedAccordion(id);
    setOverallComment("");
    setReviewFormState(
      n.parameters?.map((p: any) => ({
        rating: p.manager_rating ?? '',
        comment: p.manager_comments ?? ''
      })) || appraisalParameters.map(() => ({ rating: '', comment: '' }))
    );
  };

  const setReviewParamValue = (idx: number, field: string, value: string) => {
    setReviewFormState(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      return updated;
    });
  };

  const setSelfParamValue = (idx: number, field: string, value: string) => {
    setSelfFormState(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      return updated;
    });
  };

  const handleSelfAppraisalSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    const formData = new FormData(formRef.current!);
    const year = formData.get("year") as string;
    const cycle = formData.get("cycle") as string;
    const cycle_id = year && cycle ? `${year}-C${cycle}` : "";
    // Validation: Ensure all ratings are filled (comments optional)
    for (let i = 0; i < selfFormState.length; i++) {
      const rating = selfFormState[i]?.rating;
      if (rating === '' || rating == null || !(Number(rating) >= 1 && Number(rating) <= 5)) {
        setError("Please fill all ratings (1–5) before submitting your self appraisal.");
        return;
      }
    }

    try {
      const token = localStorage.getItem("token");
      const parameters = appraisalParameters.map((param, idx) => ({
        category: param.category,
        parameter: param.parameter,
        objective: param.objective,
        kpi: param.kpi,
        weightage: param.weightage,
        rating: Number(selfFormState[idx]?.rating) || null,
        comments: selfFormState[idx]?.comment || "",
        manager_rating: null,
        manager_comments: "",
        hr_rating: null,
        hr_comments: ""
      }));

      const totalWeight = parameters.reduce((acc, param) => acc + param.weightage, 0);
      const overall_score = parameters.reduce((acc, param) => {
        if (param.rating !== null) {
          return acc + (param.rating * param.weightage);
        }
        return acc;
      }, 0);
      const normalized_score = totalWeight > 0 ? (overall_score / totalWeight) : 0;

      const payload = {
        employee_id: managerId,
        manager_id: managerId,
        cycle_id,
        parameters,
        overall_score : Number(normalized_score.toFixed(2)),
        status: "Manager Approved",
        overall_comment: overallComment.trim()
      };

      const res = await fetch("http://127.0.0.1:8000/appraisal/manager/self-appraise", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error((await res.json()).detail || "Submission failed");

      setSuccess("Self-appraisal Submitted successfully!");
      formRef.current?.reset();
      setOverallComment("");
      setTimeout(() => {
        setSuccess("");
        setActiveTab("dashboard");
      }, 2000);
    } catch (err: any) {
  setError(err.message || "Submission failed");
  setTimeout(() => setError(""), 3000);
    }
  };

  const handleApproveAppraisal = async () => {
    setError("");
    setSubmitting(true);
    // Find the notification for the currently open accordion
    const current = notifications.find(n => (n.appraisalId || n.id || n._id) === selectedAccordion);
    if (!current) {
      setSubmitting(false);
      return;
    }
    // Validation: Ensure all ratings are filled
    for (let i = 0; i < reviewFormState.length; i++) {
      if (reviewFormState[i]?.rating === '') {
        setError("Please rate all parameters before approval.");
        setTimeout(() => {
          if (errorRef.current) {
            errorRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
            errorRef.current.classList.add('animate-shake');
            setTimeout(() => errorRef.current?.classList.remove('animate-shake'), 600);
          }
        }, 50);
        setSubmitting(false);
        return;
      }
    }
    try {
      const token = localStorage.getItem("token");
      const manager_parameters = current.parameters?.map((p: any, idx: number) => ({
        parameter: p.parameter,
        manager_rating: reviewFormState[idx]?.rating === '' ? null : Number(reviewFormState[idx]?.rating),
        manager_comments: reviewFormState[idx]?.comment || ''
      })) || [];
      // If backend expects 'parameters', change here:
      const payload = {
        appraisal_id: current.appraisalId || current.id || current._id,
        manager_parameters, // <-- change to 'parameters: manager_parameters' if backend expects 'parameters'
        manager_overall_comment: overallComment.trim()
      };
      const res = await fetch("http://127.0.0.1:8000/appraisal/manager/approve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("Failed to submit for HR approval");
      setNotifications(prev => prev.map(n => 
        (n.appraisalId || n.id || n._id) === (current.appraisalId || current.id || current._id)
          ? { ...n, status: 'Submitted for HR approval', manager_parameters } 
          : n
      ));
      setSelectedAccordion(null);
      setSuccess("Appraisal approved successfully!");
      setOverallComment("");
      setReviewFormState([]); // Clear review form state after submit
      fetchPendingAppraisals(managerId);
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError("Review and Submit");
      setTimeout(() => setError(""), 3000);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejectAppraisal = async () => {
    setError("");
    const current = notifications.find((n: Notification) => (n.appraisalId || n.id || n._id) === selectedAccordion);
    if (!current) return;
    try {
      const token = localStorage.getItem("token");
      const payload = {
        appraisal_id: current.appraisalId || current.id || current._id,
        reason: overallComment.trim() || "Rejected by manager"
      };
      const res = await fetch("http://127.0.0.1:8000/appraisal/manager/reject", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("Failed to reject appraisal");
      setNotifications((prev: Notification[]) => prev.map((n: Notification) =>
        (n.appraisalId || n.id || n._id) === (current.appraisalId || current.id || current._id)
          ? { ...n, status: 'Rejected - Refill Required' }
          : n
      ));
      setSelectedAccordion(null);
      setSuccess("Appraisal rejected and employee notified.");
      setOverallComment("");
      fetchPendingAppraisals(managerId);
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError("Failed to reject appraisal");
      setTimeout(() => setError(""), 3000);
    }
  };

  const pendingCount = notifications.filter(n => n.status !== 'Submitted for HR approval').length;
  const completedCount = history.length;

  // ================= MANAGER SCORE CALCULATION =================
  const getManagerScore = (n: Notification) => {
  if (!Array.isArray(n.parameters) || n.parameters.length === 0) return '-';
  const weightedScore = n.parameters.reduce((acc: number, p: any) => acc + ((p.manager_rating || 0) * (p.weightage || 0)), 0);
  const totalWeight = n.parameters.reduce((acc: number, p: any) => acc + (p.weightage || 0), 0);
  const normalizedScore = totalWeight ? (weightedScore / totalWeight) : 0;
  return normalizedScore.toFixed(2);
  };

  // Ensure formState[idx] is initialized before accessing properties
  // Removed ensureFormState. All form state is initialized up front.

  return (
  <div className={`min-h-screen flex ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarOpen ? 280 : 80 }}
        className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} 
          border-r flex flex-col transition-all duration-300 fixed top-0 left-0 h-screen z-30`}
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
            { id: 'pending', icon: FaBell, label: 'Pending Reviews', badge: pendingCount },
            { id: 'self-appraisal', icon: FaEdit, label: 'Self Appraisal' },
            { id: 'history', icon: FaHistory, label: 'History' }
          ].map(item => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all relative ${
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
              {item.badge !== undefined && item.badge > 0 && (
                <span className={`absolute right-2 top-2 ${sidebarOpen ? '' : 'right-1 top-1'} w-5 h-5 flex items-center justify-center rounded-full text-xs font-bold ${
                  activeTab === item.id ? 'bg-white text-blue-600' : 'bg-red-500 text-white'
                }`}>
                  {item.badge}
                </span>
              )}
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
  <div className="flex-1 flex flex-col" style={{ marginLeft: sidebarOpen ? 280 : 80, transition: 'margin-left 0.3s' }}>
        {/* Top Bar */}
        <header className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} 
          border-b px-8 py-4 flex items-center justify-between`}
        >
          <div>
            <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
              Welcome back, {userName}! 👋
            </h2>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Manage team performance and reviews
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
            <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
              {userName}
            </span>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-auto p-8">
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-4 rounded-lg bg-green-100 border border-green-300 text-green-700 flex items-center gap-2"
            >
              <FaCheckCircle /> {success}
            </motion.div>
          )}

          {error && (
            <motion.div
              ref={errorRef}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-4 rounded-lg bg-red-100 border border-red-300 text-red-700"
            >
              {error}
            </motion.div>
          )}

<style jsx global>{`
  .animate-shake {
    animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both;
  }
  @keyframes shake {
    10%, 90% { transform: translateX(-2px); }
    20%, 80% { transform: translateX(4px); }
    30%, 50%, 70% { transform: translateX(-8px); }
    40%, 60% { transform: translateX(8px); }
  }
`}</style>

          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                {/* HR Rejection Alert */}
                {history.some(h => typeof h.status === 'string' && h.status.toLowerCase().includes('rejected by hr')) && (
                  <div className="p-4 rounded-lg bg-red-100 border border-red-300 text-red-700 font-semibold flex items-center gap-2 mb-6">
                    <FaBell className="text-red-500" />
                    Your previously approved appraisals was rejected by HR
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
                      <div className={`p-3 rounded-xl ${theme === 'dark' ? 'bg-yellow-900' : 'bg-yellow-100'}`}>
                        <FaClock className={`text-2xl ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'}`} />
                      </div>
                      <FaBell className="text-yellow-400 text-xl animate-bounce" />
                    </div>
                    <h3 className={`text-3xl font-bold mb-1 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                      {pendingCount}
                    </h3>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      Pending Reviews
                    </p>
                  </motion.div>

                  <motion.div
                    whileHover={{ y: -4 }}
                    className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} 
                      rounded-2xl p-6 shadow-lg border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className={`p-3 rounded-xl ${theme === 'dark' ? 'bg-green-900' : 'bg-green-100'}`}>
                        <FaCheckCircle className={`text-2xl ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />
                      </div>
                      <FaAward className="text-green-400 text-xl" />
                    </div>
                    <h3 className={`text-3xl font-bold mb-1 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                      {completedCount}
                    </h3>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      Completed Reviews
                    </p>
                  </motion.div>

                  <motion.div
                    whileHover={{ y: -4 }}
                    className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} 
                      rounded-2xl p-6 shadow-lg border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className={`p-3 rounded-xl ${theme === 'dark' ? 'bg-blue-900' : 'bg-blue-100'}`}>
                        <FaUsers className={`text-2xl ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
                      </div>
                      <FaStar className="text-blue-400 text-xl" />
                    </div>
                    <h3 className={`text-3xl font-bold mb-1 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                      {notifications.length + history.length}
                    </h3>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      Total Team Members
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
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button onClick={() => setActiveTab('pending')} className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-blue-500 to-teal-600 text-white hover:from-blue-600 hover:to-teal-700 transition-all">

                      <FaBell className="text-2xl" />
                      <div className="text-left">
                        <div className="font-semibold">Review Pending</div>
                        <div className="text-sm opacity-90">{pendingCount} awaiting approval</div>
                      </div>
                    </button>
                    
                    <button
                      onClick={() => setActiveTab('self-appraisal')}
                      className={`flex items-center gap-4 p-4 rounded-xl transition-all ${
                        theme === 'dark' 
                          ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                      }`}
                    >
                      <FaEdit className="text-2xl" />
                      <div className="text-left">
                        <div className="font-semibold">Self Appraisal</div>
                        <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          Submit your assessment
                        </div>
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
                          Check completed reviews
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Recent Activity */}
                {notifications.length > 0 && (
                  <div className={`${theme === 'dark' ? 'bg-gray-900' : 'bg-white'} rounded-2xl p-8 shadow-xl border-0`}
                  >
                    <h3 className={`text-2xl font-extrabold mb-6 tracking-tight ${theme === 'dark' ? 'text-white' : 'text-blue-900'}`}>
                      Recent Activity
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {notifications.slice(0, 3).map((n, idx) => (
                        <div
                          key={n.appraisalId || idx}
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
                            n.status === 'Submitted for HR approval'
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

            {activeTab === 'pending' && (
              <motion.div
                key="pending"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} 
                  rounded-2xl p-8 shadow-lg border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}
                >
                  <h2 className={`text-2xl font-bold mb-6 flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                    <FaBell className="text-yellow-500" /> Pending Reviews
                  </h2>

                  {loading ? (
                    <div className="flex items-center justify-center py-12">
                      <FaSpinner className="animate-spin text-4xl text-blue-500" />
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="text-center py-12">
                      <FaCheckCircle className={`text-6xl mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-300'}`} />
                      <p className={`text-lg ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        No pending reviews
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {notifications.map((n, idx) => (
                        <motion.div
                          key={n.appraisalId || idx}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.1 }}
                          className={`relative group overflow-hidden p-0 rounded-2xl shadow-lg border-0 ${
                            theme === 'dark' ? 'bg-gradient-to-br from-gray-800 via-gray-900 to-gray-700' : 'bg-gradient-to-br from-white via-blue-50 to-blue-100'
                          }`}
                        >
                          <div className="flex flex-col md:flex-row items-center justify-between gap-4 px-8 py-6">
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                              <div className={`flex items-center justify-center w-14 h-14 rounded-full shadow-md text-2xl font-bold ${theme === 'dark' ? 'bg-blue-900 text-blue-300' : 'bg-blue-200 text-blue-700'}`}>{(n.employeeName || n.employee_id || '?')[0]}</div>
                              <div className="min-w-0">
                                <div className={`text-xl font-bold truncate ${theme === 'dark' ? 'text-white' : 'text-blue-900'}`}>{n.employeeName || n.employee_id || "Unknown Employee"}</div>
                                <div className={`text-sm font-medium mt-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                                  Cycle: <span className="font-semibold">{n.cycle_id}</span>
                                  <span className="mx-1">.</span>
                                  Employee Score: <span className="font-semibold">{n.overall_score != null ? Number(n.overall_score).toFixed(2) : '-'}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <span className={`px-4 py-1 rounded-full text-xs font-semibold tracking-wide shadow-sm ${
                                n.status === 'Submitted for HR approval'
                                  ? 'bg-green-100 text-green-700 border border-green-200'
                                  : 'bg-yellow-100 text-yellow-700 border border-yellow-200'
                              }`}>
                                {n.status}
                              </span>
                              <button
                                onClick={() => openAccordion(n)}
                                disabled={n.status === 'Submitted for HR approval'}
                                className={`mt-2 px-6 py-2 rounded-full font-semibold flex items-center gap-2 transition-all ${
                                  n.status === 'Submitted for HR approval'
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700'
                                }`}
                              >
                                <FaEdit /> Review
                              </button>
                            </div>
                          </div>
                        {/* Accordion Review Form */}
                        {selectedAccordion === (n.appraisalId || n.id || n._id) && (
                          <div className="mt-6 mb-4 bg-white border border-gray-200 rounded-2xl shadow-lg p-8">
                            <div className="flex items-center justify-between mb-6">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-teal-400 flex items-center justify-center text-white text-xl font-bold">
                                  <FaUserTie />
                                </div>
                                <span className="text-lg font-semibold text-gray-700 tracking-tight">Performance Review</span>
                                <span className="text-base font-medium text-gray-500">– {n.employeeName}</span>
                              </div>
                              <button onClick={() => setSelectedAccordion(null)} className="text-gray-400 text-2xl hover:text-red-400 transition-colors rounded-full p-2 hover:bg-gray-200" title="Close">
                                <span className="sr-only">Close</span>✕
                              </button>
                            </div>
                            <div className="space-y-6 max-h-[60vh] overflow-y-auto">
                              {n.parameters?.map((p, idx) => (
                                <div key={idx} className="rounded-xl border border-gray-200 bg-white shadow-sm p-6 mb-2">
                                  <h4 className="font-semibold text-lg text-gray-800 mb-4 tracking-tight flex items-center gap-2">
                                    <span className="inline-block w-2 h-2 rounded-full bg-gray-300"></span>
                                    {p.parameter}
                                    <span className="ml-3 text-xs font-medium px-2 py-1 rounded bg-gray-100 text-gray-700 border border-gray-200">{p.category}</span>
                                  </h4>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-2">
                                    {/* ===== Employee (READ ONLY) ===== */}
                                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                      <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Employee Review</p>
                                      <label className="text-xs font-medium text-gray-600">Rating</label>
                                      <select value={p.rating || ''} disabled className="w-full border rounded px-3 py-2 bg-gray-100 cursor-not-allowed text-gray-500 mt-1">
                                        <option value="">Not Rated</option>
                                        {[1,2,3,4,5].map(r => (
                                          <option key={r} value={r}>{r}</option>
                                        ))}
                                      </select>
                                      <label className="text-xs font-medium text-gray-600 mt-3 block">Comment</label>
                                      <textarea value={p.comments || ''} disabled className="w-full border rounded px-3 py-2 bg-gray-100 cursor-not-allowed text-gray-500 mt-1" />
                                    </div>
                                    {/* ===== Manager (EDITABLE) ===== */}
                                    <div className="bg-white border border-gray-100 rounded-lg p-4 shadow-sm">
                                      <p className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Manager Review</p>
                                      <label className="text-xs font-medium text-gray-700">Rating</label>
                                      <select value={reviewFormState[idx]?.rating || ''} onChange={e => setReviewParamValue(idx, 'rating', e.target.value)} className="w-full border rounded px-3 py-2 mt-1 focus:ring-2 focus:ring-gray-400 focus:border-gray-400 text-gray-900 bg-gray-50">
                                        <option value="">Select Rating</option>
                                        {[1,2,3,4,5].map(r => (
                                          <option key={r} value={r}>{r}</option>
                                        ))}
                                      </select>
                                      <label className="text-xs font-medium text-gray-700 mt-3 block">Comment</label>
                                      <textarea value={reviewFormState[idx]?.comment || ''} onChange={e => setReviewParamValue(idx, 'comment', e.target.value)} className="w-full border rounded px-3 py-2 mt-1 focus:ring-2 focus:ring-gray-400 focus:border-gray-400 text-gray-900 bg-gray-50" placeholder="Manager justification" />
                                    </div>
                                  </div>
                                  <div className="mt-4">
                                    <p className="text-xs text-gray-500 mb-1">Objective: <span className="font-medium text-gray-700">{p.objective}</span></p>
                                    <p className="text-xs text-gray-400">KPIs: <span className="font-medium text-gray-600">{p.kpi}</span></p>
                                  </div>
                                </div>
                              ))}
                              {/* Employee Overall Comment (read-only) */}
                              <div className="mt-6 mb-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Employee Overall Comment</label>
                                <div className="w-full border rounded px-3 py-3 min-h-[48px] bg-gray-100 text-gray-700">
                                  {n.overall_comment || <span className="text-gray-400 italic">No overall comment provided.</span>}
                                </div>
                              </div>
                              {/* Manager Overall Comment (read-only, if present) */}
                              {n.manager_overall_comment && (
                                <div className="mb-2">
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Manager Overall Comment</label>
                                  <div className="w-full border rounded px-3 py-3 min-h-[48px] bg-gray-100 text-gray-700">
                                    {n.manager_overall_comment}
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className="pt-4">
                              <div style={{ height: '1em' }}></div>
                              <label className="block text-sm font-medium text-gray-700 mb-2 mt-0">Manager Overall Comments (optional)</label>
                              <textarea className="w-full border rounded px-3 py-3 min-h-[60px] focus:ring-2 focus:ring-gray-400 focus:border-gray-400 text-gray-900 bg-gray-50" placeholder="Add your overall comments about this appraisal..." value={overallComment} onChange={e => setOverallComment(e.target.value)} />
                              <div className="flex gap-4 mt-6">
                                <button onClick={handleApproveAppraisal} disabled={submitting} className={`flex-1 py-3 bg-gray-800 text-white rounded-lg font-semibold text-lg shadow hover:bg-gray-900 transition-all ${submitting ? 'opacity-60 cursor-not-allowed' : ''}`}>Approve Appraisal</button>
                                <button onClick={handleRejectAppraisal} className="flex-1 py-3 bg-red-600 text-white rounded-lg font-semibold text-lg shadow hover:bg-red-700 transition-all">Reject Appraisal</button>
                              </div>
                            </div>
                          </div>
                        )}
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'self-appraisal' && (
              <motion.div
                key="self-appraisal"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} 
                  rounded-2xl p-8 shadow-lg border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}
                >
                  <h2 className={`text-2xl font-bold mb-6 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                    Self Appraisal
                  </h2>

                  <form ref={formRef} onSubmit={handleSelfAppraisalSubmit} className="space-y-6">
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
                      {appraisalParameters.map((param, idx) => (
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
                            {/* <span className={`text-sm font-medium px-3 py-1 rounded-full ${
                              theme === 'dark' ? 'bg-blue-900 text-blue-300' : 'bg-blue-100 text-blue-700'
                            }`}>
                              {(param.weightage ? param.weightage * 100 : 0).toFixed(0)}%
                            </span> */}
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
                                name={`rating-${idx}`}
                                value={selfFormState[idx]?.rating || ''}
                                onChange={(e) => setSelfParamValue(idx, 'rating', e.target.value)}
                                required
                                className={`w-full px-4 py-3 rounded-lg border ${
                                  theme === 'dark' 
                                    ? 'bg-gray-700 border-gray-600 text-white' 
                                    : 'bg-white border-gray-300 text-gray-900'
                                } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                              >
                                <option value="">Select</option>
                                {[1, 2, 3, 4, 5].map((val) => (
                                  <option key={val} value={val}>{val}</option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                                Comments
                              </label>
                              <textarea
                                name={`comment-${idx}`}
                                value={selfFormState[idx]?.comment || ''}
                                onChange={(e) => setSelfParamValue(idx, 'comment', e.target.value)}
                                placeholder="Justify your rating... (optional)"
                                rows={1}
                                className={`w-full px-4 py-2 rounded-lg border min-h-[32px] ${
                                  theme === 'dark' 
                                    ? 'bg-gray-700 border-gray-600 text-white' 
                                    : 'bg-white border-gray-300 text-gray-900'
                                } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
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
                className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} 
                  rounded-2xl p-8 shadow-lg border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}
              >
                <h2 className={`text-2xl font-bold mb-6 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                  Review History
                </h2>

                {/* Accordion for history */}
                {(() => {
                  const approvedHistory = history.filter(h => h.status && h.status.toLowerCase() !== 'submitted');
                  if (approvedHistory.length === 0) {
                    return (
                      <div className="text-center py-12">
                        <FaCheckCircle className={`text-6xl mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-300'}`} />
                        <p className={`text-lg ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}> 
                          No review history found
                        </p>
                      </div>
                    );
                  }
                  return (
                    <div className="space-y-4">
                      {approvedHistory.map((h, idx) => {
                        const rejectedByHR = typeof h.status === 'string' && h.status.toLowerCase().includes('rejected by hr');
                        const id = String(h.appraisalId || h.id || idx);
                        return (
                          <div key={id}>
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: idx * 0.1 }}
                              className={`p-6 rounded-xl border shadow-sm cursor-pointer select-none ${theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}
                              onClick={() => setSelectedAccordion(selectedAccordion === id ? null : id)}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <h3 className={`text-lg font-semibold mb-1 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}> 
                                    {h.employeeName || h.employee_id || "Unknown Employee"}
                                  </h3>
                                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}> 
                                    Cycle: {h.cycle_id} • Score: {h.manager_overall_score != null ? Number(h.manager_overall_score).toFixed(2) : h.overall_score != null ? Number(h.overall_score).toFixed(2) : '-'}
                                  </p>
                                  <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium ${
                                    h.status === 'Submitted for HR approval'
                                      ? 'bg-green-100 text-green-700'
                                      : 'bg-yellow-100 text-yellow-700'
                                  }`}>
                                    {h.status}
                                  </span>
                                  {rejectedByHR && (
                                    <div className="mt-4 p-4 rounded-lg bg-red-100 border border-red-300 text-red-700 font-semibold flex items-center gap-2">
                                      <FaBell className="text-red-500" />
                                      Your previously approved appraisal was rejected by HR
                                    </div>
                                  )}
                                </div>
                                <div className="ml-4">
                                  <span className={`inline-block transform transition-transform duration-200 ${selectedAccordion === id ? 'rotate-90' : ''}`}>▶</span>
                                </div>
                              </div>
                            </motion.div>
                            <AnimatePresence>
                              {selectedAccordion === id && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className={`overflow-hidden border-l-4 ${theme === 'dark' ? 'border-blue-700 bg-gray-800' : 'border-blue-300 bg-blue-50'} p-4 mb-2`}
                                >
                                  {Array.isArray((h as any).parameters) && (h as any).parameters.length > 0 ? (
                                    <>
                                      <h4 className={`font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>Submitted Entries</h4>
                                      <div className="space-y-2">
                                        {(h as any).parameters.map((param: any, pidx: number) => (
                                          <div key={pidx} className={`p-3 rounded-lg mb-1 border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white/80 border-gray-200'}`}>
                                            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                                              <div>
                                                <span className={`font-semibold text-sm ${theme === 'dark' ? 'text-blue-300' : 'text-blue-700'}`}>{param.parameter}</span>
                                                <span className={`ml-2 text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>({param.category})</span>
                                              </div>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-1 mt-2">
                                              <div className="flex items-center">
                                                <span className={`font-semibold mr-1 ${theme === 'dark' ? 'text-white' : 'text-black'}`}>Employee Rating:</span>
                                                <span className={`font-bold ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>{param.rating}</span>
                                              </div>
                                              <div className="flex items-center">
                                                <span className={`font-semibold mr-1 ${theme === 'dark' ? 'text-white' : 'text-black'}`}>Manager Rating:</span>
                                                <span className={`font-bold ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>{param.manager_rating}</span>
                                              </div>
                                              <div className="flex items-center">
                                                <span className={`font-semibold mr-1 ${theme === 'dark' ? 'text-white' : 'text-black'}`}>Emp Comments:</span>
                                                <span className={`font-normal ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>{param.comments}</span>
                                              </div>
                                              <div className="flex items-center">
                                                <span className={`font-semibold mr-1 ${theme === 'dark' ? 'text-white' : 'text-black'}`}>Manager Comments:</span>
                                                <span className={`font-normal ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>{param.manager_comments || '-'}</span>
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </>
                                  ) : (
                                    <div className="text-sm text-gray-500">No detailed parameter entries available for this record.</div>
                                  )}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </motion.div>
            )}
          </AnimatePresence> {/* Ensure AnimatePresence is properly closed */}

          {/* ...existing code... (modal removed, now handled inline as accordion) */}
        </main> {/* Closing tag for the main element */}
      </div> {/* Closing tag for the main content div */}
    </div> 
  );
}