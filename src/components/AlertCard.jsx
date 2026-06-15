import { Clock, AlertTriangle, CheckCircle, Train } from 'lucide-react'; // Optional: for nice icons


// Helper to style components based on severity/type
const getSeverityStyles = (type) => {
  switch (type) {
    case 'DUTY_12HR':
      return {
        bg: 'bg-red-50 border-red-200 hover:border-red-300',
        badge: 'bg-red-100 text-red-800 border-red-200',
        iconColor: 'text-red-600'
      };
    case 'DUTY_10HR':
      return {
        bg: 'bg-amber-50 border-amber-200 hover:border-amber-300',
        badge: 'bg-amber-100 text-amber-800 border-amber-200',
        iconColor: 'text-amber-600'
      };
    case 'DUTY_8HR':
    default:
      return {
        bg: 'bg-blue-50 border-blue-200 hover:border-blue-300',
        badge: 'bg-blue-100 text-blue-800 border-blue-200',
        iconColor: 'text-blue-600'
      };
  }
};

export const AlertCard = ({ alert }) => {
  const styles = getSeverityStyles(alert.type);
  const formattedTime = new Date(alert.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const formattedDate = new Date(alert.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' });

  return (
    <div className={`p-4 rounded-xl border transition-all duration-200 shadow-sm ${styles.bg}`}>
      <div className="flex items-start justify-between gap-4">
        {/* Left: Icon and Core Text */}
        <div className="flex gap-3">
          <div className={`p-2 rounded-lg bg-white mt-0.5 shadow-sm ${styles.iconColor}`}>
            <AlertTriangle size={20} />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              {alert.title}
              <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium border ${styles.badge}`}>
                {alert.status}
              </span>
            </h4>
            <p className="text-xs text-slate-600 mt-1 font-medium leading-relaxed">
              {alert.message}
            </p>
            
            {/* Meta tags (Train details) */}
            {alert.shift?.trainNumber && (
              <div className="flex items-center gap-3 mt-3 text-[11px] font-medium text-slate-500">
                <span className="flex items-center gap-1 bg-white px-2 py-1 rounded border border-slate-200">
                  <Train size={12} className="text-slate-400" />
                  Train: {alert.shift.trainNumber}
                </span>
                <span className="flex items-center gap-1 bg-white px-2 py-1 rounded border border-slate-200">
                  <Clock size={12} className="text-slate-400" />
                  Triggered: {formattedDate}, {formattedTime}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Action Button */}
        <button 
          onClick={() => alert('Acknowledge handler here')}
          className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 bg-white text-slate-700 rounded-lg border border-slate-200 shadow-sm hover:bg-slate-50 transition-colors whitespace-nowrap"
        >
          <CheckCircle size={14} className="text-emerald-600" />
          Acknowledge
        </button>
      </div>
    </div>
  );
};

export default function AlertsDashboard() {
  // Replace mockAlertsData with your actual state/props fetched from the API
  const alerts = mockAlertsData; 

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-2xl shadow-sm border border-slate-100">
      <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Active Duty Alerts</h2>
          <p className="text-xs text-slate-500">Real-time shift management notifications</p>
        </div>
        <span className="bg-slate-100 text-slate-700 text-xs font-bold px-2.5 py-1 rounded-full">
          {alerts.length} New
        </span>
      </div>

      {/* The Map implementation */}
      <div className="space-y-3">
        {alerts.length > 0 ? (
          alerts.map((alert) => (
            <AlertCard key={alert.id} alert={alert} />
          ))
        ) : (
          <div className="text-center py-8 text-sm text-slate-400">
            No pending alerts found.
          </div>
        )}
      </div>
    </div>
  );
}