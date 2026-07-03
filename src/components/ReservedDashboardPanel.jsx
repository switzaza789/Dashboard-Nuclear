
const ReservedDashboardPanel = ({
  slotNumber,
  title = 'Reserved',
  description = 'Available for future dashboard modules',
}) => {
  return (
    <div
      id={`dashboard-slot-${slotNumber}`}
      aria-label={`Reserved dashboard slot ${slotNumber}`}
      className="glass-panel flex flex-col justify-center items-center p-6 text-center select-none min-w-0 min-h-0 h-full border border-white/5 bg-slate-900/20 rounded-2xl relative overflow-hidden group"
    >
      {/* Subtle grid decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.01)_0%,transparent_70%)] pointer-events-none" />
      
      <div className="text-gray-600 dark:text-gray-500 font-mono text-xs mb-1 font-semibold tracking-wider">
        SLOT {slotNumber}
      </div>
      <h4 className="text-gray-400 dark:text-gray-400 font-semibold text-sm mb-1 uppercase tracking-wide">
        {title}
      </h4>
      <p className="text-gray-500 dark:text-gray-500 text-xs max-w-[200px] leading-relaxed">
        {description}
      </p>
    </div>
  );
};

export default ReservedDashboardPanel;
