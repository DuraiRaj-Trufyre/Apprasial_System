import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FaCheckCircle, FaRocket } from 'react-icons/fa';

interface Notification {
  appraisalId?: string;
  _id?: string;
  employeeName?: string;
  employee_id?: string;
  status?: string;
}

interface ReviewPageProps {
  notifications: Notification[];
  theme: 'dark' | 'light';
}

const ReviewPage: React.FC<ReviewPageProps> = ({ notifications, theme }) => {
  const [selectedAppraisal, setSelectedAppraisal] = useState<Notification | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [managerComments, setManagerComments] = useState('');
  const [managerRating, setManagerRating] = useState('');

  const [error, setError] = useState('');
  const handleReviewSubmit = () => {
    if (!managerRating || !managerComments.trim()) {
      setError('Please fill both rating and comments before submitting.');
      return;
    }
    if (selectedAppraisal) {
      // Logic to submit the manager's review
      console.log('Submitting review:', {
        appraisalId: selectedAppraisal.appraisalId,
        managerComments,
        managerRating,
      });
      setShowModal(false);
      setManagerComments('');
      setManagerRating('');
      setError('');
    }
  };

  return (
    <div>
      <h2 className={`text-2xl font-extrabold drop-shadow flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-blue-900'}`}>
        Notifications
      </h2>
      <>{console.log('Notifications:', notifications)}</>
      {Array.isArray(notifications) && notifications.length === 0 ? (
        <div className={`text-lg ${theme === 'dark' ? 'text-gray-400' : 'text-gray-700'}`}>
          No pending appraisals to review.
        </div>
      ) : Array.isArray(notifications) ? (
        <div className="flex flex-col gap-4 w-full">
          {notifications.map((n, idx) => (
            <motion.div
              key={n.appraisalId || n._id || idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className={`rounded-xl shadow-lg border-2 flex flex-col md:flex-row items-center justify-between px-6 py-4 gap-4 transition-all duration-200
                ${theme === 'dark' ? 'bg-gray-900 border-gray-700 text-white' : 'bg-blue-50 border-blue-300 text-blue-900'}`}
            >
              <div className="flex flex-col items-start flex-1">
                <span className="text-xs font-semibold uppercase tracking-wide mb-1 opacity-70">Employee</span>
                <span className="text-lg font-bold">
                  {typeof n.employeeName === 'string' && n.employeeName}
                  {(!n.employeeName && typeof n.employee_id === 'string') && n.employee_id}
                  {(!n.employeeName && !n.employee_id) && <span className="text-xs text-red-500">{JSON.stringify(n)}</span>}
                </span>
              </div>
              <div className="flex flex-col items-center flex-1">
                <span className="text-xs font-semibold uppercase tracking-wide mb-1 opacity-70">Appraisal</span>
                <span className="flex items-center gap-2 text-yellow-500 font-bold animate-pulse">
                  <FaRocket className="animate-spin" />
                  {typeof n.status === 'string' ? n.status : JSON.stringify(n.status) || 'Pending Approval'}
                </span>
              </div>
              <div className="flex flex-col items-end flex-1">
                <button
                  className={`bg-blue-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 shadow hover:scale-105 transition-all ${n.status === 'Submitted for HR approval' ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onClick={() => {
                    if (n.status !== 'Submitted for HR approval') {
                      setSelectedAppraisal(n);
                      setShowModal(true);
                    }
                  }}
                  disabled={n.status === 'Submitted for HR approval'}
                >
                  <FaCheckCircle /> Review & Approve
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className={`text-lg ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>
          No pending appraisals to review or data format error.
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className={`p-6 rounded-lg shadow-lg ${theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}`}>
            <h3 className="text-xl font-bold mb-4">Review Appraisal</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Manager Rating (1-5)</label>
              <select
                value={managerRating}
                onChange={(e) => setManagerRating(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
              >
                <option value="">Select</option>
                {[1, 2, 3, 4, 5].map((val) => (
                  <option key={val} value={val}>{val}</option>
                ))}
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Manager Comments</label>
              <textarea
                value={managerComments}
                onChange={(e) => setManagerComments(e.target.value)}
                placeholder="Add your comments here..."
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>
            {error && (
              <div className="mb-4 p-2 rounded bg-red-100 text-red-700 border border-red-300 text-sm">{error}</div>
            )}
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleReviewSubmit}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewPage;