import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import Layout from '../../components/Layout';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorMessage from '../../components/ErrorMessage';
import EmptyState from '../../components/EmptyState';
import { 
  FaBell, 
  FaTrain, 
  FaExclamationTriangle, 
  FaCheckCircle,
  FaFilter,
  FaSort,
  FaClock,
  FaThLarge,
  FaList
} from 'react-icons/fa';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import useAuthStore from '../../stores/useAuthStore';
import useToastStore from '../../stores/useToastStore';
import alertService from '../../services/alertService';
import { useQuery } from '@tanstack/react-query';
import { AlertCard } from '../../components/AlertCard';

dayjs.extend(relativeTime);

const AlertPage = () => {
  const navigate = useNavigate();
  const { token } = useAuthStore();
  const { warning } = useToastStore();
  const socketRef = useRef(null);
  
  // State management
  // const [alerts, setAlerts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  
  // Filter and sort state
  const [filterType, setFilterType] = useState('all'); // all, 7hr, 8hr, 9hr, 10hr, 11hr, 14hr
  const [filterStatus, setFilterStatus] = useState('all'); // all, pending, responded
  const [sortBy, setSortBy] = useState('dutyHours'); // dutyHours, time
  const [showCompleted, setShowCompleted] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

  // Filter alerts based on selected filters


  // Get alert severity color and icon
  const getAlertConfig = (dutyHours) => {
    if (dutyHours >= 14) {
      return {
        level: 'critical',
        color: 'bg-red-50 border-red-200',
        badge: 'bg-red-100 text-red-800',
        icon: 'text-red-600',
        label: '14+ Hours - CRITICAL'
      };
    }
    if (dutyHours >= 11) {
      return {
        level: 'danger',
        color: 'bg-orange-50 border-orange-200',
        badge: 'bg-orange-100 text-orange-800',
        icon: 'text-orange-600',
        label: '11-14 Hours - DANGER'
      };
    }
    if (dutyHours >= 10) {
      return {
        level: 'warning',
        color: 'bg-yellow-50 border-yellow-200',
        badge: 'bg-yellow-100 text-yellow-800',
        icon: 'text-yellow-600',
        label: '10-11 Hours - WARNING'
      };
    }
    if (dutyHours >= 9) {
      return {
        level: 'alert',
        color: 'bg-blue-50 border-blue-200',
        badge: 'bg-blue-100 text-blue-800',
        icon: 'text-blue-600',
        label: '9-10 Hours - ALERT'
      };
    }
    return {
      level: 'info',
      color: 'bg-gray-50 border-gray-200',
      badge: 'bg-gray-100 text-gray-800',
      icon: 'text-gray-600',
      label: 'Info'
    };
  };

  const handleShiftDetails = (shiftId) => {
    navigate(`/dashboard/shift/${shiftId}`);
  };

  const handleRefresh = () => {
    // In socket mode, refresh means clearing alerts to see fresh data
    // or reconnecting the socket
    if (!isConnected && socketRef.current) {
      socketRef.current.connect();
    }
  };

  // Query function to fetch all alerts (for initial load)
  const {data: fetchedAlerts, isPending, isError, error} = useQuery({
    queryKey: ['alerts'],
    queryFn: alertService.getAllAlertNotifications,
    })


useEffect(() => {
  if (fetchedAlerts) {
    console.log('Fetched alerts:', fetchedAlerts);
  }
}, [fetchedAlerts]);

  // Group alerts logic
  const processedAlerts = Array.isArray(fetchedAlerts) ? fetchedAlerts : [];
  
  // 1. Filter alerts
  const filteredAlerts = processedAlerts.filter(alert => {
    // Type filter
    if (filterType !== 'all') {
      const typeStr = filterType.toUpperCase(); // e.g., '8HR'
      // alert.type is like 'DUTY_8HR'
      if (!alert.type.includes(typeStr)) return false;
    }
    // Status filter
    if (filterStatus !== 'all') {
      if (filterStatus === 'pending' && alert.status !== 'PENDING') return false;
      if (filterStatus === 'responded' && alert.status === 'PENDING') return false;
    }
    return true;
  });

  // 2. Group by shiftId
  const activeShiftGroups = {};
  const completedShiftGroups = {};

  filteredAlerts.forEach(alert => {
    const shift = alert.shift;
    if (!shift) return;
    const isCompleted = shift.status === 'COMPLETED';
    const targetGroup = isCompleted ? completedShiftGroups : activeShiftGroups;

    if (!targetGroup[shift.id]) {
      targetGroup[shift.id] = {
        shift: shift,
        alerts: []
      };
    }
    targetGroup[shift.id].alerts.push(alert);
  });

  const activeGroupsArray = Object.values(activeShiftGroups);
  const completedGroupsArray = Object.values(completedShiftGroups);

  // Loading state
  if (isPending) {
    return (
      <Layout>
        <LoadingSpinner message="Loading shift alerts..." />
      </Layout>
    );
  }

  // Error state
  if (isError) {
    return (
      <Layout>
        <ErrorMessage
          title="Failed to Load Alerts"
          message={error.message}
          onRetry={handleRefresh}
        />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-[#003d82] p-3 rounded-lg">
                <FaBell className="text-2xl text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-800">Shift Alerts</h1>
                <p className="text-gray-600 mt-1">
                  Monitor duty hour alerts across active shifts
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <div className="flex bg-gray-100 rounded-lg p-1 border border-gray-200">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded flex items-center justify-center transition-colors ${
                    viewMode === 'grid' 
                      ? 'bg-white shadow-sm text-[#003d82]' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  title="Grid View"
                >
                  <FaThLarge />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded flex items-center justify-center transition-colors ${
                    viewMode === 'list' 
                      ? 'bg-white shadow-sm text-[#003d82]' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  title="List View"
                >
                  <FaList />
                </button>
              </div>
              <button
                onClick={handleRefresh}
                disabled={isLoading}
                className="px-6 py-2 bg-[#003d82] text-white rounded-lg hover:bg-[#002b5c] transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <FaFilter size={16} />
                Refresh
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          {/* <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-linear-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
              <p className="text-gray-600 text-sm font-medium">Total Alerts</p>
              <p className="text-3xl font-bold text-blue-600 mt-1">{fetchedAlerts.length}</p>
            </div>
            <div className="bg-linear-to-br from-yellow-50 to-yellow-100 p-4 rounded-lg border border-yellow-200">
              <p className="text-gray-600 text-sm font-medium">Pending Response</p>
              <p className="text-3xl font-bold text-yellow-600 mt-1">
                {fetchedAlerts.filter(a => !a.responseAction).length}
              </p>
            </div>
            <div className="bg-linear-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
              <p className="text-gray-600 text-sm font-medium">Responded</p>
              <p className="text-3xl font-bold text-green-600 mt-1">
                {fetchedAlerts.filter(a => a.responseAction).length}
              </p>
            </div>
            <div className="bg-linear-to-br from-red-50 to-red-100 p-4 rounded-lg border border-red-200">
              <p className="text-gray-600 text-sm font-medium">Critical (14+hrs)</p>
              <p className="text-3xl font-bold text-red-600 mt-1">
                {fetchedAlerts.filter(a => a.dutyHours >= 14).length}
              </p>
            </div>
          </div> */}
        </div>

        {/* Filter and Sort Controls */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Filter by Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Alert Type
              </label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003d82] focus:border-transparent"
              >
                <option value="all">All Types</option>
                <option value="8hr">8 Hour</option>
                <option value="10hr">10 Hour</option>
                <option value="12hr">12 Hour</option>
              </select>
            </div>

            {/* Filter by Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Response Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003d82] focus:border-transparent"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending Response</option>
                <option value="responded">Responded</option>
              </select>
            </div>

            {/* Sort By */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003d82] focus:border-transparent"
              >
                <option value="dutyHours">Highest Duty Hours</option>
                <option value="time">Most Recent</option>
              </select>
            </div>
          </div>
        </div>

        {/* Alerts List */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-6 border-b pb-4">
            <h2 className="text-xl font-bold text-gray-800">Active Shifts Alerts</h2>
            <span className="bg-[#003d82] text-white text-xs font-bold px-3 py-1 rounded-full">
              {activeGroupsArray.length} Shift{activeGroupsArray.length !== 1 ? 's' : ''}
            </span>
          </div>
          
          {activeGroupsArray.length === 0 ? (
            <div className='flex max-w-5xl mx-auto'> 
              <p className='text-gray-500 py-8 text-center w-full'>No active alerts found for active shifts.</p>
            </div>
          ) : (
            <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" : "space-y-6"}>
              {activeGroupsArray.map((group) => (
                <div key={group.shift.id} className="border-2 border-[#003d82] rounded-lg overflow-hidden shadow-md flex flex-col h-full bg-white">
                  <div className="bg-[#003d82] px-5 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="bg-white p-2 rounded text-[#003d82]">
                        <FaTrain />
                      </div>
                      <span className="font-bold text-white text-lg tracking-wide">Train: {group.shift.trainNumber}</span>
                    </div>
                    <span className="text-sm font-bold bg-white text-[#003d82] px-3 py-1 rounded-full shadow-sm">
                      {group.alerts.length} Alert{group.alerts.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="p-5 space-y-4 flex-1">
                    {group.alerts.map(alert => (
                      <AlertCard key={alert.id} alert={alert} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Toggle for completed shifts */}
          <div className="mt-10 pt-6 border-t border-gray-200">
            <button 
              onClick={() => setShowCompleted(!showCompleted)}
              className="text-[#003d82] hover:text-[#002b5c] font-semibold flex items-center gap-2 transition-colors"
            >
              {showCompleted ? 'Hide Completed Shifts' : 'Show Completed Shifts'} 
              <span className="bg-gray-100 border border-gray-200 text-gray-600 text-xs px-2 py-1 rounded-full">
                {completedGroupsArray.length}
              </span>
            </button>
            
            {showCompleted && (
              <div className={`mt-6 ${viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" : "space-y-6"}`}>
                {completedGroupsArray.length === 0 ? (
                  <p className="text-gray-500 py-4 text-center">No alerts found for completed shifts.</p>
                ) : (
                  completedGroupsArray.map((group) => (
                    <div key={group.shift.id} className="border-2 border-gray-400 rounded-lg overflow-hidden opacity-80 hover:opacity-100 transition-opacity shadow-md flex flex-col h-full bg-white">
                      <div className="bg-gray-600 px-5 py-4 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className="bg-white p-2 rounded text-gray-600">
                            <FaTrain />
                          </div>
                          <span className="font-bold text-white text-lg tracking-wide">Train: {group.shift.trainNumber}</span>
                        </div>
                        <span className="text-sm font-bold bg-white text-gray-700 px-3 py-1 rounded-full shadow-sm">
                          COMPLETED
                        </span>
                      </div>
                      <div className="p-5 space-y-4 flex-1">
                        {group.alerts.map(alert => (
                          <AlertCard key={alert.id} alert={alert} />
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}


export default AlertPage;