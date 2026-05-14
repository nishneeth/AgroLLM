import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUsers, FiLogOut, FiRefreshCw, FiTrash2, FiEdit, FiMessageSquare, FiThumbsUp, FiThumbsDown, FiFilter, FiBarChart2, FiClock, FiShield, FiAlertCircle } from 'react-icons/fi';
import { FaSun, FaMoon } from 'react-icons/fa';
import { getAllUsers, getDashboardStats, deleteUser, getAllFeedback, updateFeedback, deleteFeedback, getAnalytics, timeoutUser, blockUser, unblockUser } from '../services/api';
import ConfirmationModal from '../components/common/ConfirmationModal';
import Loader from '../components/common/Loader';
import { useTheme } from '../contexts/ThemeContext';
import { LineChart, BarChart, PieChart } from '../components/Admin/AnalyticsCharts';
import styles from './AdminDashboard.module.css';

const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [feedback, setFeedback] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [activeTab, setActiveTab] = useState('users'); // 'users', 'feedback', or 'analytics'
  const [analyticsPeriod, setAnalyticsPeriod] = useState('monthly');
  const [lastAnalyticsUpdate, setLastAnalyticsUpdate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showDeleteFeedbackModal, setShowDeleteFeedbackModal] = useState(false);
  const [showLogoutConfirmModal, setShowLogoutConfirmModal] = useState(false);
  const [showDeleteUserModal, setShowDeleteUserModal] = useState(false);
  const [showModerationModal, setShowModerationModal] = useState(false);
  const [moderationAction, setModerationAction] = useState(''); // 'timeout', 'block', 'unblock'
  const [moderationReason, setModerationReason] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [feedbackToDelete, setFeedbackToDelete] = useState(null);
  const [userToDelete, setUserToDelete] = useState(null);
  const [feedbackStatus, setFeedbackStatus] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [feedbackFilter, setFeedbackFilter] = useState('all'); // 'all', 'positive', 'negative'
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const userInfo = JSON.parse(localStorage.getItem('userInfo'));
    if (!userInfo || userInfo.role !== 'admin') {
      navigate('/login');
      return;
    }
    fetchData();
  }, [navigate]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [usersRes, statsRes, feedbackRes] = await Promise.all([
        getAllUsers(),
        getDashboardStats(),
        getAllFeedback(),
      ]);
      console.log('Users data received:', usersRes.data.users);
      setUsers(usersRes.data.users);
      setStats(statsRes.data.stats);
      setFeedback(feedbackRes.data.feedback);
      setError('');
    } catch (err) {
      setError('Failed to fetch data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const analyticsRes = await getAnalytics(analyticsPeriod);
      setAnalytics(analyticsRes.data.analytics);
      setLastAnalyticsUpdate(new Date());
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    }
  };

  useEffect(() => {
    if (activeTab === 'analytics') {
      fetchAnalytics();
      
      // Auto-refresh analytics every 30 seconds for real-time updates
      const intervalId = setInterval(() => {
        fetchAnalytics();
      }, 30000); // 30 seconds
      
      // Cleanup interval on unmount or when tab changes
      return () => clearInterval(intervalId);
    }
  }, [activeTab, analyticsPeriod, fetchAnalytics]);

  const handleDeleteUserClick = (user) => {
    setUserToDelete(user);
    setShowDeleteUserModal(true);
  };

  const handleConfirmDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      await deleteUser(userToDelete._id);
      setShowDeleteUserModal(false);
      setUserToDelete(null);
      fetchData();
    } catch (err) {
      setError('Failed to delete user');
      console.error(err);
    }
  };

  const openFeedbackModal = (feedbackItem) => {
    setSelectedFeedback(feedbackItem);
    setFeedbackStatus(feedbackItem.status);
    setAdminNotes(feedbackItem.adminNotes || '');
    setShowFeedbackModal(true);
  };

  const handleFeedbackUpdate = async () => {
    if (!selectedFeedback) return;

    try {
      await updateFeedback(selectedFeedback._id, {
        status: feedbackStatus,
        adminNotes,
      });
      setShowFeedbackModal(false);
      setSelectedFeedback(null);
      setFeedbackStatus('');
      setAdminNotes('');
      fetchData();
      // Refresh analytics if on analytics tab to update satisfaction chart
      if (activeTab === 'analytics') {
        fetchAnalytics();
      }
    } catch (err) {
      setError('Failed to update feedback');
      console.error(err);
    }
  };

  const handleDeleteFeedbackClick = (feedbackItem) => {
    setFeedbackToDelete(feedbackItem);
    setShowDeleteFeedbackModal(true);
  };

  const handleConfirmDeleteFeedback = async () => {
    if (!feedbackToDelete) return;

    try {
      await deleteFeedback(feedbackToDelete._id);
      setShowDeleteFeedbackModal(false);
      setFeedbackToDelete(null);
      fetchData();
      // Refresh analytics to update satisfaction chart
      if (activeTab === 'analytics') {
        fetchAnalytics();
      }
    } catch (err) {
      setError('Failed to delete feedback');
      console.error(err);
    }
  };

  const handleLogoutClick = () => {
    setShowLogoutConfirmModal(true);
  };

  const handleConfirmLogout = () => {
    localStorage.removeItem('userInfo');
    navigate('/login');
  };

  const handleModerationClick = (user, action) => {
    setSelectedUser(user);
    setModerationAction(action);
    setModerationReason('');
    setShowModerationModal(true);
  };

  const handleConfirmModeration = async () => {
    if (!selectedUser) return;

    try {
      if (moderationAction === 'timeout') {
        await timeoutUser(selectedUser._id, moderationReason);
      } else if (moderationAction === 'block') {
        await blockUser(selectedUser._id, moderationReason);
      } else if (moderationAction === 'unblock') {
        await unblockUser(selectedUser._id);
      }
      setShowModerationModal(false);
      setSelectedUser(null);
      setModerationReason('');
      fetchData();
    } catch (err) {
      setError(`Failed to ${moderationAction} user`);
      console.error(err);
    }
  };

  // Filter feedback based on selected filter
  const filteredFeedback = feedback.filter(item => {
    if (feedbackFilter === 'all') return true;
    if (feedbackFilter === 'positive') return item.rating === 'positive';
    if (feedbackFilter === 'negative') return item.rating === 'negative';
    return true;
  });

  if (loading) {
    return (
      <div className={`${styles.container} ${theme === 'light' ? styles.lightMode : ''}`}>
        <div className={styles.mainLoaderContainer}>
          <Loader />
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.container} ${theme === 'light' ? styles.lightMode : ''}`}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Admin Dashboard</h1>
          <p className={styles.subtitle}>AgroLLM Management Portal</p>
        </div>
        <div className={styles.headerRight}>
          <button onClick={toggleTheme} className={styles.themeBtn}>
            {theme === 'dark' ? <FaSun /> : <FaMoon />}
            <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
          </button>
          <button onClick={fetchData} className={styles.refreshBtn}>
            <FiRefreshCw />
            <span>Refresh</span>
          </button>
          <button onClick={handleLogoutClick} className={styles.logoutBtn}>
            <FiLogOut />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {stats && (
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <FiUsers />
            </div>
            <div className={styles.statContent}>
              <h3 className={styles.statValue}>{users.filter(u => u.role !== 'admin').length}</h3>
              <p className={styles.statLabel}>Total Users</p>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <FiUsers />
            </div>
            <div className={styles.statContent}>
              <h3 className={styles.statValue}>{stats.totalChats}</h3>
              <p className={styles.statLabel}>Total Chats</p>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <FiMessageSquare />
            </div>
            <div className={styles.statContent}>
              <h3 className={styles.statValue}>{stats.totalFeedback}</h3>
              <p className={styles.statLabel}>Total Feedback</p>
            </div>
          </div>
        </div>
      )}

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'users' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('users')}
        >
          <FiUsers />
          <span>Users ({users.length})</span>
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'feedback' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('feedback')}
        >
          <FiMessageSquare />
          <span>Feedback ({feedback.length})</span>
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'analytics' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          <FiBarChart2 />
          <span>Analytics</span>
        </button>
      </div>

      {activeTab === 'users' && (
        <div className={styles.usersSection}>
          <h2 className={styles.sectionTitle}>All Users ({users.length})</h2>
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const isTimedOut = user.timeoutUntil && new Date(user.timeoutUntil) > new Date();
                  return (
                    <tr key={user._id}>
                      <td>{user.name}</td>
                      <td>{user.email}</td>
                      <td>
                        <span className={`${styles.badge} ${styles[`badge${user.role}`]}`}>
                          {user.role}
                        </span>
                      </td>
                      <td>
                        {user.isBlocked ? (
                          <span className={`${styles.badge} ${styles.badgeBlocked}`} title={user.blockedReason}>
                            <FiShield size={12} /> Blocked
                          </span>
                        ) : isTimedOut ? (
                          <span className={`${styles.badge} ${styles.badgeTimeout}`} title={user.timeoutReason}>
                            <FiClock size={12} /> Timeout
                          </span>
                        ) : (
                          <span className={`${styles.badge} ${styles.badgeActive}`}>Active</span>
                        )}
                      </td>
                      <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                      <td>
                        <div className={styles.actions}>
                          {user.role !== 'admin' && (
                            <>
                              {!user.isBlocked && !isTimedOut && (
                                <>
                                  <button
                                    onClick={() => handleModerationClick(user, 'timeout')}
                                    className={`${styles.actionBtn} ${styles.timeoutBtn}`}
                                    title="Timeout for 24h"
                                  >
                                    <FiClock />
                                  </button>
                                  <button
                                    onClick={() => handleModerationClick(user, 'block')}
                                    className={`${styles.actionBtn} ${styles.blockBtn}`}
                                    title="Block User"
                                  >
                                    <FiShield />
                                  </button>
                                </>
                              )}
                              {(user.isBlocked || isTimedOut) && (
                                <button
                                  onClick={() => handleModerationClick(user, 'unblock')}
                                  className={`${styles.actionBtn} ${styles.unblockBtn}`}
                                  title="Unblock User"
                                >
                                  <FiAlertCircle />
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteUserClick(user)}
                                className={`${styles.actionBtn} ${styles.deleteBtn}`}
                                title="Delete User"
                              >
                                <FiTrash2 />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'feedback' && (
        <div className={styles.feedbackSection}>
          <div className={styles.feedbackSectionHeader}>
            <h2 className={styles.sectionTitle}>User Feedback ({filteredFeedback.length})</h2>
            <div className={styles.filterContainer}>
              <FiFilter className={styles.filterIcon} />
              <select 
                value={feedbackFilter} 
                onChange={(e) => setFeedbackFilter(e.target.value)}
                className={styles.filterSelect}
              >
                <option value="all">All Feedback ({feedback.length})</option>
                <option value="positive">Positive ({feedback.filter(f => f.rating === 'positive').length})</option>
                <option value="negative">Negative ({feedback.filter(f => f.rating === 'negative').length})</option>
              </select>
            </div>
          </div>
          <div className={styles.feedbackGrid}>
            {filteredFeedback.map((item) => (
              <div key={item._id} className={styles.feedbackCard}>
                <div className={styles.feedbackHeader}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <h3 className={styles.feedbackSubject}>{item.subject}</h3>
                      {item.rating && (
                        <span className={styles.ratingBadge}>
                          {item.rating === 'positive' ? (
                            <FiThumbsUp size={14} color="#10b981" />
                          ) : (
                            <FiThumbsDown size={14} color="#ef4444" />
                          )}
                        </span>
                      )}
                    </div>
                    <p className={styles.feedbackMeta}>
                      From: <strong>{item.userName}</strong> ({item.userEmail})
                    </p>
                    <p className={styles.feedbackMeta}>
                      {new Date(item.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className={styles.feedbackBadges}>
                    <span className={`${styles.badge} ${styles[`badge${item.category}`]}`}>
                      {item.category}
                    </span>
                    <span className={`${styles.badge} ${styles[`status${item.status}`]}`}>
                      {item.status}
                    </span>
                  </div>
                </div>
                {item.messageContent && (
                  <div className={styles.originalMessage}>
                    <strong>Original Response:</strong>
                    <p>{item.messageContent}</p>
                  </div>
                )}
                <p className={styles.feedbackMessage}>{item.message}</p>
                {item.adminNotes && (
                  <div className={styles.adminNotes}>
                    <strong>Admin Notes:</strong> {item.adminNotes}
                  </div>
                )}
                <div className={styles.feedbackActions}>
                  <button
                    onClick={() => openFeedbackModal(item)}
                    className={styles.actionBtn}
                    title="Update Status"
                  >
                    <FiEdit />
                  </button>
                  <button
                    onClick={() => handleDeleteFeedbackClick(item)}
                    className={`${styles.actionBtn} ${styles.deleteBtn}`}
                    title="Delete Feedback"
                  >
                    <FiTrash2 />
                  </button>
                </div>
              </div>
            ))}
            {filteredFeedback.length === 0 && (
              <div className={styles.emptyState}>
                <FiMessageSquare size={48} />
                <p>{feedbackFilter === 'all' ? 'No feedback received yet' : `No ${feedbackFilter} feedback found`}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className={styles.analyticsSection}>
          <div className={styles.analyticsHeader}>
            <div>
              <h2 className={styles.sectionTitle}>Analytics Dashboard</h2>
              {lastAnalyticsUpdate && (
                <p className={styles.lastUpdate}>
                  Last updated: {lastAnalyticsUpdate.toLocaleTimeString()} 
                  <span style={{ marginLeft: '8px', fontSize: '12px', opacity: 0.7 }}>
                    (Auto-refreshes every 30s)
                  </span>
                </p>
              )}
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button onClick={fetchAnalytics} className={styles.refreshBtn} title="Refresh analytics now">
                <FiRefreshCw />
                <span>Refresh</span>
              </button>
              <select
                value={analyticsPeriod}
                onChange={(e) => setAnalyticsPeriod(e.target.value)}
                className={styles.periodSelect}
              >
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          </div>

          {analytics ? (
            <div className={styles.analyticsGrid}>
              <div className={styles.chartWrapper}>
                <LineChart
                  data={analytics.chatActivity}
                  title="Chat Activity"
                  color="#3b82f6"
                />
              </div>
              <div className={styles.chartWrapper}>
                <BarChart
                  data={analytics.languageStats}
                  title="Language Usage"
                  color="#f59e0b"
                />
              </div>
              <div className={styles.chartWrapper}>
                <PieChart
                  data={analytics.satisfaction}
                  title="Response Satisfaction"
                />
              </div>
            </div>
          ) : (
            <div className={styles.analyticsLoaderContainer}>
              <Loader />
            </div>
          )}
        </div>
      )}

      {showFeedbackModal && (
        <div className={styles.modalOverlay} onClick={() => setShowFeedbackModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Update Feedback</h3>
            <p className={styles.modalSubtitle}>
              From: {selectedFeedback?.userName} - {selectedFeedback?.subject}
            </p>
            <div className={styles.modalContent}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Status:</label>
                <select
                  value={feedbackStatus}
                  onChange={(e) => setFeedbackStatus(e.target.value)}
                  className={styles.select}
                >
                  <option value="pending">Pending</option>
                  <option value="reviewed">Reviewed</option>
                  <option value="resolved">Resolved</option>
                  <option value="dismissed">Dismissed</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Admin Notes:</label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className={styles.textarea}
                  rows="4"
                  placeholder="Add notes about this feedback..."
                />
              </div>
            </div>
            <div className={styles.modalActions}>
              <button onClick={() => setShowFeedbackModal(false)} className={styles.cancelBtn}>
                Cancel
              </button>
              <button onClick={handleFeedbackUpdate} className={styles.saveBtn}>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Feedback Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteFeedbackModal}
        onClose={() => {
          setShowDeleteFeedbackModal(false);
          setFeedbackToDelete(null);
        }}
        onConfirm={handleConfirmDeleteFeedback}
        title="Delete Feedback"
        message={`Are you sure you want to delete this feedback from ${feedbackToDelete?.userName}?`}
        confirmText="Delete"
        cancelText="Cancel"
        confirmVariant="danger"
      />

      {/* Delete User Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteUserModal}
        onClose={() => {
          setShowDeleteUserModal(false);
          setUserToDelete(null);
        }}
        onConfirm={handleConfirmDeleteUser}
        title="Delete User"
        message={`Are you sure you want to delete ${userToDelete?.name} (${userToDelete?.email})? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        confirmVariant="danger"
      />

      {/* Logout Confirmation Modal */}
      <ConfirmationModal
        isOpen={showLogoutConfirmModal}
        onClose={() => setShowLogoutConfirmModal(false)}
        onConfirm={handleConfirmLogout}
        title="Log Out"
        message="Are you sure you want to log out?"
        confirmText="Log Out"
        cancelText="Cancel"
        confirmVariant="danger"
      />

      {/* User Moderation Modal */}
      {showModerationModal && (
        <div className={styles.modalOverlay} onClick={() => setShowModerationModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>
              {moderationAction === 'timeout' && 'Timeout User (24 hours)'}
              {moderationAction === 'block' && 'Block User'}
              {moderationAction === 'unblock' && 'Unblock User'}
            </h3>
            <p className={styles.modalSubtitle}>
              User: {selectedUser?.name} ({selectedUser?.email})
            </p>
            <div className={styles.modalContent}>
              {moderationAction !== 'unblock' && (
                <div className={styles.formGroup}>
                  <label className={styles.label}>Reason:</label>
                  <textarea
                    value={moderationReason}
                    onChange={(e) => setModerationReason(e.target.value)}
                    className={styles.textarea}
                    rows="4"
                    placeholder={`Enter reason for ${moderationAction}...`}
                    required
                  />
                </div>
              )}
              {moderationAction === 'unblock' && (
                <p className={styles.warningText}>
                  This will remove all restrictions from this user's account.
                </p>
              )}
            </div>
            <div className={styles.modalActions}>
              <button onClick={() => setShowModerationModal(false)} className={styles.cancelBtn}>
                Cancel
              </button>
              <button 
                onClick={handleConfirmModeration} 
                className={moderationAction === 'unblock' ? styles.saveBtn : styles.dangerBtn}
                disabled={moderationAction !== 'unblock' && !moderationReason.trim()}
              >
                {moderationAction === 'timeout' && 'Timeout User'}
                {moderationAction === 'block' && 'Block User'}
                {moderationAction === 'unblock' && 'Unblock User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
