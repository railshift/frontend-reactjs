import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorMessage from '../../components/ErrorMessage';
import { 
  FaUsers, 
  FaTrain, 
  FaClock, 
  FaExclamationTriangle, 
  FaCheckCircle, 
  FaCalendarAlt,
  FaChartBar,
  FaMapMarkerAlt
} from 'react-icons/fa';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie
} from 'recharts';
import useToastStore from '../../stores/useToastStore';
import dashboardService from '../../services/dashboardService';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const HomeDashboard = () => {
  const navigate = useNavigate();
  const { error: showError } = useToastStore();
  
  // State
  const [dashboardStats, setDashboardStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch dashboard data
  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        // We no longer need recentActivities for the new dashboard design
        const statsData = await dashboardService.getStats();
        if (isMounted) {
          setDashboardStats(statsData);
        }
      } catch (err) {
        if (isMounted) {
          const errMsg = err.response?.data?.message || err.message || 'Failed to fetch dashboard data';
          setError(errMsg);
          showError(errMsg);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchData();
    return () => {
      isMounted = false;
    };
  }, [showError]);

  if (isLoading) {
    return (
      <Layout>
        <LoadingSpinner />
      </Layout>
    );
  }

  if (error && !dashboardStats) {
    return (
      <Layout>
        <ErrorMessage 
          message={error} 
          onRetry={() => window.location.reload()} 
        />
      </Layout>
    );
  }

  const stats = dashboardStats?.data || dashboardStats || {};
  const today = stats.today || {};
  const activeShiftsDetails = stats.activeShiftsDetails || [];
  
  // Process Workload Distribution for Chart
  const rawWorkload = stats.workloadDistribution || {};
  const workloadData = Object.keys(rawWorkload).map(key => ({
    name: key,
    count: rawWorkload[key]
  }));

  // Process Route Workload for Chart
  const routeData = (stats.topSections || []).map(section => ({
    name: section.section || 'Unknown',
    value: section.count
  }));

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  // Identify actionable alerts from active shifts
  const highDutyShifts = activeShiftsDetails.filter(s => s.currentDutyHours > 8).slice(0, 5);

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-3xl font-bold text-[#003d82]">Dashboard</h2>
          <p className="text-gray-600 mt-1">
            Overview of shift management system - Last updated {dayjs().format('HH:mm')}
          </p>
        </div>

        {/* 1. Today's Operational Status */}
        <div className="bg-white rounded-lg shadow-md p-6 border-t-4 border-[#003d82]">
          <h3 className="text-sm uppercase tracking-wider text-gray-500 font-bold mb-4">Today's Operations</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 divide-x divide-gray-100">
            <div className="text-center px-4">
              <div className="flex items-center justify-center gap-2 mb-1">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <p className="text-sm text-gray-600 font-medium">On Duty</p>
              </div>
              <p className="text-3xl font-bold text-gray-800">{today.activeShifts || 0}</p>
            </div>
            <div className="text-center px-4">
              <div className="flex items-center justify-center gap-2 mb-1">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <p className="text-sm text-gray-600 font-medium">Upcoming</p>
              </div>
              <p className="text-3xl font-bold text-gray-800">{stats.overview?.scheduledShifts || 0}</p>
            </div>
            <div className="text-center px-4">
              <div className="flex items-center justify-center gap-2 mb-1">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <p className="text-sm text-gray-600 font-medium">Completed</p>
              </div>
              <p className="text-3xl font-bold text-gray-800">{today.shiftsCompleted || 0}</p>
            </div>
            <div className="text-center px-4">
              <div className="flex items-center justify-center gap-2 mb-1">
                <FaClock className="text-gray-400" />
                <p className="text-sm text-gray-600 font-medium">Avg Duty</p>
              </div>
              <p className="text-3xl font-bold text-gray-800">{today.averageHours || '0.0'}h</p>
            </div>
          </div>
        </div>

        {/* Total Duties Overview */}
        {stats.dutyStats && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-bold text-[#003d82] mb-6 flex items-center gap-2">
              <FaCalendarAlt />
              Total Duties Overview
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { title: 'Today', data: stats.dutyStats.today },
                { title: 'This Week', data: stats.dutyStats.thisWeek },
                { title: 'This Month', data: stats.dutyStats.thisMonth }
              ].map((period, idx) => (
                <div key={idx} className="bg-gray-50 rounded-lg p-5 border border-gray-100">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-bold text-gray-700 text-lg">{period.title}</h4>
                    <span className="bg-[#003d82] text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                      {period.data.total} Shifts
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 mb-5">
                    <div className="bg-white p-3 rounded shadow-sm border border-gray-100 flex flex-col items-center justify-center">
                      <span className="text-xs text-gray-500 uppercase font-bold mb-1">Avg Hr</span>
                      <span className="font-bold text-gray-800 text-lg">{period.data.average}h</span>
                    </div>
                    <div className="bg-white p-3 rounded shadow-sm border border-gray-100 flex flex-col items-center justify-center relative">
                      <span className="text-xs text-gray-500 uppercase font-bold mb-1">Max Hr</span>
                      <span className={`font-bold text-lg ${period.data.highest > 10 ? 'text-red-600' : 'text-orange-500'}`}>{period.data.highest}h</span>
                      {period.data.highestShift && (
                        <button 
                          onClick={() => navigate(`/dashboard/shifts/${period.data.highestShift.id}`)}
                          className="mt-1 text-[10px] bg-gray-100 text-[#003d82] px-2 py-0.5 rounded hover:bg-gray-200 border border-gray-200"
                          title="View shift details"
                        >
                          Train #{period.data.highestShift.trainNumber}
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-wider font-bold text-gray-500 mb-3 border-b pb-1">Hours Breakdown</p>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-sm p-1 hover:bg-gray-100 rounded transition-colors">
                        <span className="text-green-700 flex items-center gap-2 font-medium"><span className="w-2.5 h-2.5 rounded-full bg-green-500"></span> &lt; 8 hrs</span>
                        <span className="font-bold text-gray-700 bg-white px-2 py-0.5 rounded border">{period.data.breakdown['< 8 hrs']}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm p-1 hover:bg-gray-100 rounded transition-colors">
                        <span className="text-blue-700 flex items-center gap-2 font-medium"><span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> 8-10 hrs</span>
                        <span className="font-bold text-gray-700 bg-white px-2 py-0.5 rounded border">{period.data.breakdown['8-10 hrs']}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm p-1 hover:bg-gray-100 rounded transition-colors">
                        <span className="text-orange-600 flex items-center gap-2 font-medium"><span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span> 10-12 hrs</span>
                        <span className="font-bold text-gray-700 bg-white px-2 py-0.5 rounded border">{period.data.breakdown['10-12 hrs']}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm p-1 hover:bg-gray-100 rounded transition-colors">
                        <span className="text-red-600 flex items-center gap-2 font-medium"><span className="w-2.5 h-2.5 rounded-full bg-red-600"></span> 12+ hrs</span>
                        <span className="font-bold text-gray-700 bg-white px-2 py-0.5 rounded border">{period.data.breakdown['12+ hrs']}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actionable Alerts Section */}
        {(stats.alerts?.totalAlerts > 0 || highDutyShifts.length > 0) && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-bold text-red-700 flex items-center gap-2 mb-4">
              <FaExclamationTriangle />
              Attention Required
            </h3>
            <div className="space-y-3">
              {highDutyShifts.map(shift => (
                <div key={shift.id} className={`flex justify-between items-center bg-white p-3 rounded shadow-sm border-l-4 ${shift.currentDutyHours >= 10 ? 'border-red-600' : 'border-orange-500'}`}>
                  <div>
                    <span className="font-semibold text-gray-800">Train #{shift.trainNumber}</span>
                    <span className="text-sm text-gray-500 ml-2">Currently Active</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`font-bold px-3 py-1 rounded-full text-sm ${shift.currentDutyHours >= 10 ? 'text-red-700 bg-red-100' : 'text-orange-600 bg-orange-100'}`}>
                      {shift.currentDutyHours}h
                    </span>
                    <button 
                      onClick={() => navigate(`/dashboard/shifts/${shift.id}`)}
                      className="text-[#003d82] text-sm hover:underline"
                    >
                      View
                    </button>
                  </div>
                </div>
              ))}
              
              {/* Aggregate alerts */}
              {stats.alerts?.alert11Hr > 0 && (
                <div className="flex justify-between items-center bg-white p-3 rounded shadow-sm border-l-4 border-red-600">
                  <span className="font-semibold text-gray-800">{stats.alerts.alert11Hr} shifts crossed 11 hours</span>
                  <button onClick={() => navigate('/dashboard/active-shifts')} className="text-[#003d82] text-sm hover:underline">View All</button>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Duty Hours Analytics */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-bold text-[#003d82] mb-6 flex items-center gap-2">
              <FaChartBar />
              Duty Hours Analytics
            </h3>
            
            <div className="grid grid-cols-3 gap-4 mb-8 bg-gray-50 p-4 rounded-lg">
              <div className="text-center">
                <p className="text-sm text-gray-500 mb-1">Today</p>
                <p className="text-2xl font-bold text-gray-800">{today.averageHours || '0.0'}h</p>
              </div>
              <div className="text-center border-l border-r border-gray-200">
                <p className="text-sm text-gray-500 mb-1">This Week</p>
                <p className="text-2xl font-bold text-gray-800">{stats.thisWeek?.averageHours || '0.0'}h</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-500 mb-1">This Month</p>
                <p className="text-2xl font-bold text-gray-800">{stats.thisMonth?.averageHours || '0.0'}h</p>
              </div>
            </div>

            <div className="mb-4">
              <h4 className="text-sm uppercase tracking-wider text-gray-500 font-bold">Workload Distribution</h4>
              <p className="text-xs text-gray-400 mt-1">Showing data for total number of completed shifts till date</p>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={workloadData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#666', fontSize: 12}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#666', fontSize: 12}} />
                  <Tooltip 
                    cursor={{fill: '#f3f4f6'}}
                    contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {
                      workloadData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={
                          entry.name === '10-12 hrs' || entry.name === '12+ hrs' ? '#ef4444' : 
                          entry.name === '8-10 hrs' ? '#f59e0b' : '#3b82f6'
                        } />
                      ))
                    }
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Shift / Train Analytics */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-bold text-[#003d82] mb-6 flex items-center gap-2">
              <FaTrain />
              Shift & Train Analytics
            </h3>

            <h4 className="text-sm uppercase tracking-wider text-gray-500 font-bold mb-3">Top Trains by Duty Count</h4>
            <div className="overflow-x-auto mb-8">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 rounded-l-lg">Train</th>
                    <th className="px-4 py-3 text-center">Duties</th>
                    <th className="px-4 py-3 text-right rounded-r-lg">Avg Hours</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.topTrains?.length > 0 ? (
                    stats.topTrains.map((train, i) => (
                      <tr key={i} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">Train #{train.trainNumber}</td>
                        <td className="px-4 py-3 text-center">{train.count}</td>
                        <td className="px-4 py-3 text-right font-medium text-blue-600">{train.averageHours}h</td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan="3" className="px-4 py-3 text-center text-gray-500">No train data available</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <h4 className="text-sm uppercase tracking-wider text-gray-500 font-bold mb-4 flex items-center gap-2">
              <FaMapMarkerAlt />
              Route Workload
            </h4>
            <div className="h-48 flex items-center justify-center">
              {routeData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={routeData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {routeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-gray-500">No route data available</p>
              )}
            </div>
            {/* Route legend */}
            <div className="flex flex-wrap justify-center gap-3 mt-4">
              {routeData.map((entry, index) => (
                <div key={index} className="flex items-center text-xs text-gray-600">
                  <span className="w-3 h-3 rounded-full mr-1" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                  {entry.name} ({entry.value})
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default HomeDashboard;
