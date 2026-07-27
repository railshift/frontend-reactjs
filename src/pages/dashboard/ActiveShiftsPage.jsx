import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import EmptyState from '../../components/EmptyState';
import ErrorBoundary from '../../components/ErrorBoundary';
import { FaTrain, FaClock, FaUser, FaExclamationTriangle, FaCheckCircle, FaPhone, FaHistory } from 'react-icons/fa';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import relativeTime from 'dayjs/plugin/relativeTime';
import useAuthStore from '../../stores/useAuthStore';
import useToastStore from '../../stores/useToastStore';
import shiftService from '../../services/shiftService';
import {useQuery} from '@tanstack/react-query'

dayjs.extend(duration);
dayjs.extend(relativeTime);

const ActiveShiftsPage = () => {
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(dayjs());
  const [showReliefModal, setShowReliefModal] = useState(false);
  const [selectedShift, setSelectedShift] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [shifts, setShifts] = useState([]);
  const [activeShifts, setActiveShifts] = useState([]);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completeFormData, setCompleteFormData] = useState({
    signOffDateTime: '',
    signOffStation: '',
  });


  const [dutyHours, setDutyHours] = useState({ hours: 0, minutes: 0, totalHours: 0 });
  const [shift, setShift] = useState(null);
  const canEdit = useAuthStore((state) => state.canEdit);
  const { success, warning, info } = useToastStore();

  // Pagination and filter state
  const [currentPage, setCurrentPage] = useState(1);
  const [alertFilter, setAlertFilter] = useState('ALL'); // 'ALL', '8HR', '10HR', '12HR', 'RELIEF'

  // Utility function to calculate duty hours
  const calculateDutyHours = (signOnTime, endTime = currentTime) => {
    const signOn = dayjs(signOnTime);
    const end = dayjs(endTime);
    const diff = end.diff(signOn);
    const totalHours = Math.floor(diff / (1000 * 60 * 60));
    const totalMinutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return {
      totalHours: Math.floor(diff / (1000 * 60 * 60)),
      hours: totalHours,
      minutes: totalMinutes,
      formatted: `${totalHours}h ${totalMinutes}m`
    };
  };

  // Fetching shifts with react query
  const {
    data: activeShiftsData, 
    isLoading: isActiveShiftsLoading, 
    refetch: refetchActiveShifts} = useQuery({
    queryKey: ['activeShifts', 'pagination', currentPage],
    queryFn: () => shiftService.getAllShifts({ status: 'IN_PROGRESS', page: currentPage, limit: 20 }),
    keepPreviousData: true,
    });

    const allActiveShifts = activeShiftsData?.data?.map(shift => {
            return {
              id: shift.id,
              trainNumber: shift.trainNumber,
              trainName: shift.trainName,
              locomotiveNumber: shift.locomotiveNo || 'N/A',
              dutyType: shift.dutyType,
              signOnStation: shift.signOnStation,
              section: shift.section,
              signOnTime: shift.signOnDateTime, // Backend uses signOnDateTime
              departureTime: shift.departureDateTime, // Backend uses departureDateTime
              trainArrivalTime: shift.trainArrivalDateTime,
              status: shift.status,
              locoPilot: {
                name: shift.locoPilot?.name || 'N/A',
                id: shift.locoPilot?.employeeId || 'N/A',
                phone: shift.locoPilot?.phone || 'N/A',
              },
              trainManager: {
                name: shift.trainManager?.name || 'N/A',
                id: shift.trainManager?.employeeId || 'N/A',
                phone: shift.trainManager?.phone || 'N/A',
              },
              reliefPlanned: shift.reliefPlanned,
              reliefTime: shift.reliefTime,
              dutyHours: shift.dutyHours,
              notifications: [],
            };
          });
    const shiftPagination = activeShiftsData?.pagination || { page: 1, pages: 1, total: 0 };

    const filteredShifts = (allActiveShifts || []).filter(shift => {
      const hours = calculateDutyHours(shift.signOnTime).totalHours;
      if (alertFilter === '8HR') return hours >= 8 && hours < 10;
      if (alertFilter === '10HR') return hours >= 10 && hours < 12;
      if (alertFilter === '12HR') return hours >= 12;
      if (alertFilter === 'RELIEF') return shift.reliefPlanned;
      return true;
    });

  // Update current time every second for live tracking
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(dayjs());
    }, 1000); // Update every second

    return () => clearInterval(timer);
  }, []);

  const getAlertLevelDisplay = (totalHours) => {
    if (totalHours >= 14) return { level: 'critical', color: 'red', text: 'CRITICAL - 14+ Hours' };
    if (totalHours >= 12) return { level: 'danger', color: 'red', text: 'DANGER - 12+ Hours' };
    if (totalHours >= 11) return { level: 'warning', color: 'orange', text: 'WARNING - 11+ Hours' };
    if (totalHours >= 9) return { level: 'alert', color: 'yellow', text: 'ALERT - 9+ Hours' };
    if (totalHours >= 8) return { level: 'caution', color: 'blue', text: 'CAUTION - 8+ Hours' };
    return { level: 'normal', color: 'green', text: 'Normal' };
  };

  const handleReliefAction = (shift, action) => {
    setSelectedShift(shift);
    setShowReliefModal(true);
  };

  const handleReliefConfirm = async (shouldPlanRelief) => {
    if (shouldPlanRelief) {
      try {
        // Plan relief via API
        const dutyHours = calculateDutyHours(selectedShift.signOnTime);
        await shiftService.updateShift(selectedShift.id, {
          reliefPlanned: true,
          reliefTime: dayjs().toISOString()
        });
        
        // Update local state
        setActiveShifts(prevShifts =>
          prevShifts.map(s =>
            s.id === selectedShift.id
              ? { ...s, reliefPlanned: true, reliefTime: dayjs().toISOString() }
              : s
          )
        );
        
        warning(`Relief planned for Train ${selectedShift.trainNumber} (${dutyHours.hours}h ${dutyHours.minutes}m)`);
      } catch (error) {
        console.error('Error planning relief:', error);
        warning('Failed to plan relief');
      }
    } else {
      // Continue tracking
      info(`Tracking continues for Train ${selectedShift.trainNumber}`);
    }
    setShowReliefModal(false);
    setSelectedShift(null);
  };


  const handleComplete = (shift) => {
      setShift(shift);
       const dutyHours = shift.status === 'IN_PROGRESS' 
    ? calculateDutyHours(shift.signOnTime)
    : { hours: 0, minutes: 0, totalHours: shift.dutyHours || 0 };
    // Set default values
    setDutyHours(dutyHours);
    setCompleteFormData({
      signOffDateTime: dayjs().format('YYYY-MM-DDTHH:mm'),
      signOffStation: shift.signOnStation || '',
    });
    setShowCompleteModal(true);
  };

  const handleCompleteSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // Convert to ISO format - backend expects signOffDateTime (combined)
      const signOffData = {
        signOffDateTime: dayjs(completeFormData.signOffDateTime).toISOString(),
        signOffStation: completeFormData.signOffStation,
        status: 'COMPLETED', // Mark shift as completed
      };

      console.log(' Completing shift with data:', signOffData);

      const response = await shiftService.updateShift(shift.id, signOffData);
      
      if (response.success) {
        success('Shift completed successfully');
        setShift({ ...shift, status: 'COMPLETED', ...response.data });
        setShowCompleteModal(false);
      }
    } catch (err) {
      console.error(' Failed to complete shift:', err);
      showError(err.response?.data?.message || 'Failed to complete shift');
    }
  };

  const handleCompleteModalClose = () => {
    setShowCompleteModal(false);
  };

 

  return (
    <Layout>
      <ErrorBoundary>
        <div className="space-y-6">
        {/* Page Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-[#003d82] flex items-center gap-3">
              <FaClock />
              Active Shifts Monitoring
            </h2>
            <p className="text-gray-600 mt-2">
              Real-time tracking of duty hours for all active shifts
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Current Time</p>
            <p className="text-2xl font-bold text-[#003d82]">
              {currentTime.format('HH:mm:ss')}
            </p>
            <p className="text-xs text-gray-500">{currentTime.format('DD MMM YYYY')}</p>
          </div>
        </div>

        {/* Statistics - Clickable to Filter */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div 
            onClick={() => setAlertFilter('ALL')}
            className={`bg-white rounded-lg shadow-md p-4 border-l-4 border-green-500 cursor-pointer transition-all hover:shadow-lg ${
              alertFilter === 'ALL' ? 'ring-2 ring-[#003d82] bg-blue-50/30' : ''
            }`}
          >
            <p className="text-sm text-gray-600 font-medium">Total Active</p>
            <p className="text-3xl font-bold text-gray-800">{shiftPagination.total}</p>
          </div>
          <div 
            onClick={() => setAlertFilter('8HR')}
            className={`bg-white rounded-lg shadow-md p-4 border-l-4 border-yellow-500 cursor-pointer transition-all hover:shadow-lg ${
              alertFilter === '8HR' ? 'ring-2 ring-yellow-500 bg-yellow-50/30' : ''
            }`}
          >
            <p className="text-sm text-gray-600 font-medium">Alerts (8+ hrs)</p>
            <p className="text-3xl font-bold text-gray-800">
              {(allActiveShifts || []).filter(s => {
                const h = calculateDutyHours(s.signOnTime).totalHours;
                return h >= 8 && h < 10;
              }).length}
            </p>
          </div>
          <div 
            onClick={() => setAlertFilter('10HR')}
            className={`bg-white rounded-lg shadow-md p-4 border-l-4 border-orange-500 cursor-pointer transition-all hover:shadow-lg ${
              alertFilter === '10HR' ? 'ring-2 ring-orange-500 bg-orange-50/30' : ''
            }`}
          >
            <p className="text-sm text-gray-600 font-medium">Warnings (10+ hrs)</p>
            <p className="text-3xl font-bold text-gray-800">
              {(allActiveShifts || []).filter(s => {
                const h = calculateDutyHours(s.signOnTime).totalHours;
                return h >= 10 && h < 12;
              }).length}
            </p>
          </div>
          <div 
            onClick={() => setAlertFilter('12HR')}
            className={`bg-white rounded-lg shadow-md p-4 border-l-4 border-red-500 cursor-pointer transition-all hover:shadow-lg ${
              alertFilter === '12HR' ? 'ring-2 ring-red-500 bg-red-50/30' : ''
            }`}
          >
            <p className="text-sm text-gray-600 font-medium">Critical (12+ hrs)</p>
            <p className="text-3xl font-bold text-gray-800">
              {(allActiveShifts || []).filter(s => calculateDutyHours(s.signOnTime).totalHours >= 12).length}
            </p>
          </div>
          <div 
            onClick={() => setAlertFilter('RELIEF')}
            className={`bg-white rounded-lg shadow-md p-4 border-l-4 border-blue-500 cursor-pointer transition-all hover:shadow-lg ${
              alertFilter === 'RELIEF' ? 'ring-2 ring-blue-500 bg-blue-50/30' : ''
            }`}
          >
            <p className="text-sm text-gray-600 font-medium">Relief Planned</p>
            <p className="text-3xl font-bold text-gray-800">
              {(allActiveShifts || []).filter(s => s.reliefPlanned).length}
            </p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 flex-wrap items-center bg-white p-3 rounded-lg shadow-sm border border-gray-100">
          <span className="text-sm font-semibold text-gray-700 mr-2 flex items-center gap-1">
            <FaClock className="text-[#003d82]" /> Filter Alerts:
          </span>
          <button
            onClick={() => setAlertFilter('ALL')}
            className={`px-4 py-1.5 rounded-full font-semibold text-sm transition-all ${
              alertFilter === 'ALL'
                ? 'bg-[#003d82] text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All ({allActiveShifts?.length || 0})
          </button>
          <button
            onClick={() => setAlertFilter('8HR')}
            className={`px-4 py-1.5 rounded-full font-semibold text-sm transition-all flex items-center gap-1.5 ${
              alertFilter === '8HR'
                ? 'bg-yellow-500 text-white shadow-md'
                : 'bg-yellow-50 text-yellow-800 hover:bg-yellow-100'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-yellow-500 inline-block"></span>
            8+ Hr Alerts ({(allActiveShifts || []).filter(s => {
              const h = calculateDutyHours(s.signOnTime).totalHours;
              return h >= 8 && h < 10;
            }).length})
          </button>
          <button
            onClick={() => setAlertFilter('10HR')}
            className={`px-4 py-1.5 rounded-full font-semibold text-sm transition-all flex items-center gap-1.5 ${
              alertFilter === '10HR'
                ? 'bg-orange-500 text-white shadow-md'
                : 'bg-orange-50 text-orange-800 hover:bg-orange-100'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-orange-500 inline-block"></span>
            10+ Hr Warnings ({(allActiveShifts || []).filter(s => {
              const h = calculateDutyHours(s.signOnTime).totalHours;
              return h >= 10 && h < 12;
            }).length})
          </button>
          <button
            onClick={() => setAlertFilter('12HR')}
            className={`px-4 py-1.5 rounded-full font-semibold text-sm transition-all flex items-center gap-1.5 ${
              alertFilter === '12HR'
                ? 'bg-red-600 text-white shadow-md'
                : 'bg-red-50 text-red-800 hover:bg-red-100'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-red-500 inline-block"></span>
            12+ Hr Critical ({(allActiveShifts || []).filter(s => calculateDutyHours(s.signOnTime).totalHours >= 12).length})
          </button>
          <button
            onClick={() => setAlertFilter('RELIEF')}
            className={`px-4 py-1.5 rounded-full font-semibold text-sm transition-all flex items-center gap-1.5 ${
              alertFilter === 'RELIEF'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-blue-50 text-blue-800 hover:bg-blue-100'
            }`}
          >
            Relief Planned ({(allActiveShifts || []).filter(s => s.reliefPlanned).length})
          </button>
        </div>

        {/* Active Shifts List */}
        <div className="space-y-4">
          {isActiveShiftsLoading ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#003d82] mx-auto mb-4"></div>
              <p className="text-gray-600">Loading shifts...</p>
            </div>
          ) : activeShiftsData.data.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <EmptyState
                icon={FaTrain}
                title="No Active Shifts"
                message="There are currently no active shifts being tracked. Create a new shift to start monitoring duty hours for loco pilots and train managers."
                action={canEdit() ? () => navigate('/dashboard/create-shift') : null}
                actionLabel="Create New Shift"
              />
            </div>
          ) : filteredShifts.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <FaCheckCircle className="text-4xl text-green-500 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-gray-700">No shifts match this filter</h3>
              <p className="text-gray-500 mt-1">There are currently no active shifts in the selected alert category.</p>
              <button
                onClick={() => setAlertFilter('ALL')}
                className="mt-4 px-4 py-2 bg-[#003d82] text-white rounded-lg text-sm font-semibold hover:bg-[#002b5c] transition"
              >
                Show All Shifts
              </button>
            </div>
          ) : (
            filteredShifts.map((shift) => {
              const dutyHours = calculateDutyHours(shift.signOnTime);
              const alert = getAlertLevelDisplay(dutyHours.totalHours);
              
              return (
                <div
                  key={shift.id}
                  className={`bg-white rounded-lg shadow-md p-6 border-l-4 ${
                    alert.level === 'critical' || alert.level === 'danger' ? 'border-red-600' :
                    alert.level === 'warning' ? 'border-orange-500' :
                    alert.level === 'alert' ? 'border-yellow-500' :
                    alert.level === 'caution' ? 'border-blue-500' :
                    'border-green-500'
                  }`}
                >
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Train Info */}
                    <div className="lg:col-span-3">
                      <div className="flex items-start gap-3">
                        <FaTrain className="text-2xl text-[#003d82] mt-1" />
                        <div>
                          <h3 
                            className="text-lg font-bold text-[#003d82] hover:text-[#002b5c] cursor-pointer underline"
                            onClick={() => navigate(`/dashboard/shifts/${shift.id}`)}
                          >
                            Train #{shift.trainNumber}
                          </h3>
                          <p className="text-sm text-gray-600">{shift.locomotiveNumber}</p>
                          <p className="text-xs text-gray-500 mt-1">{shift.dutyType}</p>
                          <p className="text-xs text-gray-500">{shift.section}</p>
                        </div>
                      </div>
                    </div>

                    {/* Duty Hours - Prominent */}
                    <div className="lg:col-span-2 flex items-center justify-center">
                      <div className="text-center">
                        <p className="text-sm text-gray-600 mb-1">Duty Hours</p>
                        <div className={`text-4xl font-bold ${
                          alert.level === 'critical' || alert.level === 'danger' ? 'text-red-600' :
                          alert.level === 'warning' ? 'text-orange-500' :
                          alert.level === 'alert' ? 'text-yellow-600' :
                          alert.level === 'caution' ? 'text-blue-600' :
                          'text-green-600'
                        }`}>
                          {dutyHours.hours}h {dutyHours.minutes}m
                        </div>
                        <div className={`mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold ${
                          alert.level === 'critical' || alert.level === 'danger' ? 'bg-red-100 text-red-700' :
                          alert.level === 'warning' ? 'bg-orange-100 text-orange-700' :
                          alert.level === 'alert' ? 'bg-yellow-100 text-yellow-700' :
                          alert.level === 'caution' ? 'bg-blue-100 text-blue-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {(alert.level === 'critical' || alert.level === 'danger' || alert.level === 'warning') && (
                            <FaExclamationTriangle />
                          )}
                          {alert.text}
                        </div>
                      </div>
                    </div>

                    {/* Personnel Info */}
                    <div className="lg:col-span-4">
                      <div className="space-y-3">
                        <div className="flex items-start gap-2">
                          <FaUser className="text-gray-400 mt-1" />
                          <div className="flex-1">
                            <p className="text-xs text-gray-500">Loco Pilot</p>
                            <p className="font-semibold text-gray-800">{shift.locoPilot.name}</p>
                            <div className="flex items-center gap-3 text-xs text-gray-600 mt-1">
                              <span>ID: {shift.locoPilot.id}</span>
                              <span className="flex items-center gap-1">
                                <FaPhone className="text-xs" /> {shift.locoPilot.phone}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <FaUser className="text-gray-400 mt-1" />
                          <div className="flex-1">
                            <p className="text-xs text-gray-500">Train Manager</p>
                            <p className="font-semibold text-gray-800">{shift.trainManager.name}</p>
                            <div className="flex items-center gap-3 text-xs text-gray-600 mt-1">
                              <span>ID: {shift.trainManager.id}</span>
                              <span className="flex items-center gap-1">
                                <FaPhone className="text-xs" /> {shift.trainManager.phone}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="lg:col-span-3 flex flex-col gap-2 justify-center">
                      <div className="text-xs text-gray-600 mb-1">
                        <p>Sign On: {dayjs(shift.signOnTime).format('HH:mm')}</p>
                        <p>Departure: {dayjs(shift.departureTime).format('HH:mm')}</p>
                      </div>
                      
                      {shift.reliefPlanned ? (
                        <div className="bg-blue-50 border border-blue-200 rounded-md p-3 flex items-center gap-2">
                          <FaCheckCircle className="text-blue-600" />
                          <span className="text-sm font-medium text-blue-700">Relief Planned</span>
                        </div>
                      ) : (
                        <>
                          {dutyHours.totalHours >= 9 && canEdit() && (
                            <button
                              onClick={() => handleReliefAction(shift, 'plan')}
                              className="px-4 py-2 bg-[#d32f2f] text-white rounded-md hover:bg-[#b71c1c] transition-colors text-sm font-medium"
                            >
                              Plan Relief
                            </button>
                          )}
                          {canEdit() && (
                            <button
                              onClick={() => {{
                                handleComplete(shift);
                              }}}
                              className="px-4 py-2 bg-[#003d82] text-white rounded-md hover:bg-[#002b5c] transition-colors text-sm font-medium"
                            >
                              Release Shift
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
        </div>

        {/* Pagination */}
        <div className="flex justify-center gap-2 my-4 ">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={shiftPagination.page === 1}
            className="px-4 py-2 bg-[#003d82] text-white rounded-md hover:bg-[#002b5c] transition-colors disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-gray-700">
            Page {shiftPagination.page} of {shiftPagination.pages}
          </span>
          <button
            onClick={() => {{
              setCurrentPage((prev) => Math.min(prev + 1, shiftPagination.pages));
            }}}
            disabled={shiftPagination.page === shiftPagination.pages}
            className="px-4 py-2 bg-[#003d82] text-white rounded-md hover:bg-[#002b5c] transition-colors disabled:opacity-50"
          >
            Next
          </button>
        </div>
      {/* Relief Planning Modal */}
      {showReliefModal && selectedShift && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <FaExclamationTriangle className="text-3xl text-orange-500" />
              <h3 className="text-xl font-bold text-[#003d82]">Relief Decision Required</h3>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-700 mb-2">
                Train <strong>#{selectedShift.trainNumber}</strong> has exceeded duty hour threshold.
              </p>
              <p className="text-gray-700 mb-4">
                Loco Pilot: <strong>{selectedShift.locoPilot.name}</strong>
              </p>
              <p className="text-sm text-gray-600">
                Please decide whether to plan relief for this crew or continue tracking.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => handleReliefConfirm(true)}
                className="flex-1 px-4 py-3 bg-[#d32f2f] text-white rounded-md hover:bg-[#b71c1c] transition-colors font-medium"
              >
                Plan Relief (Stop Tracking)
              </button>
              <button
                onClick={() => handleReliefConfirm(false)}
                className="flex-1 px-4 py-3 bg-[#003d82] text-white rounded-md hover:bg-[#002b5c] transition-colors font-medium"
              >
                Continue Tracking
              </button>
            </div>
            
            <button
              onClick={() => setShowReliefModal(false)}
              className="w-full mt-3 px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-md hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Complete Shift Modal */}
              {showCompleteModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                  <div className="bg-white rounded-lg shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                    {/* Modal Header */}
                    <div className="bg-[#003d82] text-white px-6 py-4 rounded-t-lg">
                      <h3 className="text-xl font-bold flex items-center gap-2">
                        <FaCheckCircle /> Complete Shift
                      </h3>
                      <p className="text-sm opacity-90 mt-1">
                        Enter sign-off details for Train #{shift.trainNumber}
                      </p>
                    </div>
      
                    {/* Modal Body */}
                    <form onSubmit={handleCompleteSubmit} className="p-6 space-y-4">
                      {/* Sign-Off Date & Time */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Sign-Off Date & Time <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="datetime-local"
                          value={completeFormData.signOffDateTime}
                          onChange={(e) =>
                            setCompleteFormData({ ...completeFormData, signOffDateTime: e.target.value })
                          }
                          required
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#003d82] focus:border-transparent"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Select the date and time when the crew signed off
                        </p>
                      </div>
      
                      {/* Sign-Off Station */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Sign-Off Station <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={completeFormData.signOffStation}
                          onChange={(e) =>
                            setCompleteFormData({ ...completeFormData, signOffStation: e.target.value })
                          }
                          placeholder="Enter station name"
                          required
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#003d82] focus:border-transparent"
                        />
                      </div>
      
                      {/* Duty Hours Summary */}
                      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                        <p className="text-sm font-semibold text-gray-700 mb-2">Duty Hours Summary</p>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Sign On:</span>
                          <span className="font-semibold text-gray-800">
                            {dayjs(shift.signOnTime).format('DD MMM, HH:mm')}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-sm text-gray-600">Total Duty Hours:</span>
                          <span className="font-bold text-[#003d82] text-lg">
                            {(() => {
                              const calculatedHours = shift.status === 'IN_PROGRESS' && completeFormData.signOffDateTime
                                ? calculateDutyHours(shift.signOnTime, completeFormData.signOffDateTime)
                                : dutyHours;
                              return `${calculatedHours.hours}h ${calculatedHours.minutes}m`;
                            })()}
                          </span>
                        </div>
                      </div>
      
                      {/* Action Buttons */}
                      <div className="flex gap-3 pt-4">
                        <button
                          type="button"
                          onClick={handleCompleteModalClose}
                          className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors font-medium"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium flex items-center justify-center gap-2"
                        >
                          <FaCheckCircle /> Complete Shift
                        </button>
                      </div>
      
                      {/* Warning Note */}
                      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                        <p className="text-xs text-yellow-800">
                          <strong>Note:</strong> This action will mark the shift as completed and cannot be undone. 
                          Ensure all details are correct before proceeding.
                        </p>
                      </div>
                    </form>
                  </div>
                </div>
              )}

      </ErrorBoundary>
    </Layout>
  );
};

export default ActiveShiftsPage;
