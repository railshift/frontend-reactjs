import { Clock, AlertTriangle, CheckCircle, Train } from 'lucide-react'; // Optional: for nice icons


// Helper to style components based on severity/type
const getSeverityStyles = (type) => {
  switch (type) {
    case 'DUTY_14HR':
    case 'DUTY_12HR':
      return {
        card: 'bg-white border-l-4 border-l-red-500 border-y border-r border-slate-200 hover:shadow-md',
        badge: 'bg-red-50 text-red-700 border-red-100',
        iconBg: 'bg-red-50',
        iconColor: 'text-red-500'
      };
    case 'DUTY_11HR':
    case 'DUTY_10HR':
      return {
        card: 'bg-white border-l-4 border-l-amber-500 border-y border-r border-slate-200 hover:shadow-md',
        badge: 'bg-amber-50 text-amber-700 border-amber-100',
        iconBg: 'bg-amber-50',
        iconColor: 'text-amber-500'
      };
    case 'DUTY_9HR':
    case 'DUTY_8HR':
    default:
      return {
        card: 'bg-white border-l-4 border-l-blue-500 border-y border-r border-slate-200 hover:shadow-md',
        badge: 'bg-blue-50 text-blue-700 border-blue-100',
        iconBg: 'bg-blue-50',
        iconColor: 'text-blue-500'
      };
  }
};

export const AlertCard = ({ alert }) => {
  const styles = getSeverityStyles(alert.type);
  const formattedTime = new Date(alert.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const formattedDate = new Date(alert.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' });

  return (
    <div className={`flex flex-col p-4 rounded-r-xl rounded-l-md transition-all duration-200 shadow-sm ${styles.card}`}>
      <div className="flex gap-3 w-full mb-3">
        {/* Left: Icon and Core Text */}
        <div className={`p-2 rounded-full mt-0.5 shrink-0 h-fit ${styles.iconBg} ${styles.iconColor}`}>
          <AlertTriangle size={18} strokeWidth={2.5} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <h4 className="text-sm font-bold text-slate-800">
              {alert.title}
            </h4>
            <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold border ${styles.badge}`}>
              {alert.status}
            </span>
          </div>
          
          <div className="flex items-center gap-4 text-xs font-semibold text-slate-500">
            <span className="flex items-center w-full gap-1.5 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
              <Clock size={12} className="text-slate-400 shrink-0" />
              <span className="truncate">{formattedDate}, {formattedTime}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Action Button */}
      {alert.status === 'PENDING' && (
        <button 
          onClick={() => window.alert('Acknowledge handler here')}
          className="mt-2 w-full flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-2 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-100 hover:bg-emerald-100 transition-colors whitespace-nowrap"
        >
          <CheckCircle size={14} />
          Acknowledge
        </button>
      )}
    </div>
  );
};