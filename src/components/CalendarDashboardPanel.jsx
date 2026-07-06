import { useRef, useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Users, Settings, X, Check } from 'lucide-react';
import EmployeeCard from './EmployeeCard';

const CalendarDashboardPanel = ({
  data: { processedEmployees, teamOverview, loading, currentDate, currentTimeReal },
  actions: { setCurrentDate, goToday, prevDay, nextDay, setFullCalendarOpen, setCompareModalOpen, onOpenDayModal, onOpenEmployeeModal, onOpenEditProfileModal },
  isSplitView = true,
}) => {
  const dateInputRef = useRef(null);
  const [showSettingsPopover, setShowSettingsPopover] = useState(false);

  useEffect(() => {
    if (!showSettingsPopover) return;
    const handleClose = () => setShowSettingsPopover(false);
    window.addEventListener('click', handleClose);
    return () => window.removeEventListener('click', handleClose);
  }, [showSettingsPopover]);

  const getDisplayDate = () => {
    return currentDate.toLocaleDateString('th-TH', { 
      year: 'numeric', month: 'long', day: 'numeric' 
    });
  };

  const handleDateClick = () => {
    if (dateInputRef.current) {
      try {
        dateInputRef.current.showPicker();
      } catch {
        dateInputRef.current.focus();
      }
    }
  };

  return (
    <div className={`flex flex-col h-full min-h-0 min-w-0 bg-[#0f172a]/30 backdrop-blur-md rounded-2xl ${isSplitView ? 'p-4 border border-white/10' : 'p-6 md:p-8'} relative`}>
      
      {/* Non-scrolling Panel Header */}
      <div className={`mb-4 shrink-0 pb-3 border-b border-[#1f2937]/50`}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between w-full">
          <div className="flex items-center gap-3 flex-wrap min-w-0">
            <h1 className={`${isSplitView ? 'text-xl' : 'text-3xl'} font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500 whitespace-nowrap`}>
              Team Schedule
            </h1>
            
            {/* Team Overview Summary Badge */}
            <div className="flex flex-wrap items-center gap-2 bg-[#1f2937]/80 border border-[#374151] rounded-full px-3 py-1 text-[11px] font-semibold shadow-lg backdrop-blur-sm max-w-full">
              <span className="flex items-center gap-1 text-emerald-400 whitespace-nowrap" title="ว่าง / อยู่ที่ออฟฟิศ">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div> ว่าง: {teamOverview.available}
              </span>
              {teamOverview.busy > 0 && (
                <span className="flex items-center gap-1 text-pink-400 border-l border-[#374151] pl-2 whitespace-nowrap">
                  <div className="w-1.5 h-1.5 rounded-full bg-pink-400"></div> ติดงาน: {teamOverview.busy}
                </span>
              )}
              {teamOverview.wfh > 0 && (
                <span className="flex items-center gap-1 text-blue-400 border-l border-[#374151] pl-2 whitespace-nowrap">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div> WFH: {teamOverview.wfh}
                </span>
              )}
              {teamOverview.onLeave > 0 && (
                <span className="flex items-center gap-1 text-red-400 border-l border-[#374151] pl-2 whitespace-nowrap">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-400"></div> ลา: {teamOverview.onLeave}
                </span>
              )}
            </div>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowSettingsPopover(true);
            }}
            style={{
              padding: '6px',
              backgroundColor: '#1f2937',
              border: '1px solid #374151',
              borderRadius: '8px',
              color: '#06b6d4',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
            }}
            className="hover:text-white hover:bg-slate-700 self-start shrink-0"
            title="ตั้งค่าตัวกรองและปฏิทินพนักงาน"
          >
            <Settings size={15} />
          </button>
        </div>
      </div>

      {/* Settings Full-Card Overlay */}
      {showSettingsPopover && (
        <div 
          onClick={(e) => e.stopPropagation()} 
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(11, 15, 25, 0.97)',
            backdropFilter: 'blur(12px)',
            borderRadius: '16px',
            padding: '20px',
            zIndex: 95,
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            textAlign: 'left',
          }}
          className="animate-in fade-in duration-100"
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '10px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 'bold', color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Settings size={16} className="text-cyan-400" />
              ตั้งค่าตัวเลือกปฏิทิน
            </h3>
            <button 
              onClick={() => setShowSettingsPopover(false)}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: 'none',
                color: '#94a3b8',
                fontSize: '18px',
                cursor: 'pointer',
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              className="hover:bg-white/10"
            >
              <X size={16} />
            </button>
          </div>

          {/* Scrollable Form Body */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', paddingRight: '4px' }} className="custom-scrollbar">
            {/* Date Selector */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                เลือกวันที่ต้องการดู
              </label>
              <div 
                className="relative group cursor-pointer flex items-center justify-between bg-gray-800/80 hover:bg-gray-800 px-3 py-2 rounded-xl transition-all border border-gray-700/50 hover:border-cyan-500/50"
                onClick={handleDateClick}
              >
                <span className="text-gray-200 text-xs font-semibold flex items-center gap-1.5">
                  <CalendarIcon size={14} className="text-cyan-400" />
                  {getDisplayDate()}
                </span>
                <span className="text-[10px] text-cyan-400 font-bold uppercase">คลิกเพื่อเปลี่ยน</span>
                <input 
                  ref={dateInputRef}
                  type="date"
                  value={format(currentDate, 'yyyy-MM-dd')}
                  onChange={(e) => {
                    if (e.target.value) setCurrentDate(new Date(e.target.value));
                  }}
                  className="absolute bottom-0 left-0 w-0 h-0 opacity-0 pointer-events-none"
                />
              </div>
            </div>

            {/* Day Navigation */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                เปลี่ยนวันแสดงผล
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  onClick={goToday} 
                  style={{ flex: 1 }}
                  className="px-3 py-2 rounded-xl bg-[#1f2937] border border-[#374151] hover:bg-[#374151] hover:text-white transition-colors text-xs font-semibold flex items-center justify-center gap-1"
                >
                  Today (วันนี้)
                </button>
                <div style={{ display: 'flex', border: '1px solid #374151', borderRadius: '12px', overflow: 'hidden', backgroundColor: '#1f2937' }}>
                  <button 
                    onClick={prevDay} 
                    aria-label="Previous day"
                    className="px-3 py-2 hover:bg-[#374151] hover:text-white transition-colors border-r border-[#374151]"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button 
                    onClick={nextDay} 
                    aria-label="Next day"
                    className="px-3 py-2 hover:bg-[#374151] hover:text-white transition-colors"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>

            {/* Advanced Views */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                มุมมองพิเศษ
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button 
                  onClick={() => {
                    setFullCalendarOpen(true);
                    setShowSettingsPopover(false);
                  }}
                  className="flex items-center justify-center gap-2 w-full px-3 py-2.5 rounded-xl bg-purple-600/90 hover:bg-purple-600 text-white text-xs font-semibold transition-colors border border-purple-400/50 shadow-md"
                >
                  <CalendarIcon size={14} />
                  ดูปฏิทินเต็มรูปแบบ (Full Calendar)
                </button>

                <button 
                  onClick={() => {
                    setCompareModalOpen(true);
                    setShowSettingsPopover(false);
                  }}
                  className="flex items-center justify-center gap-2 w-full px-3 py-2.5 rounded-xl bg-cyan-600/90 hover:bg-cyan-600 text-white text-xs font-semibold transition-colors border border-cyan-400/50 shadow-md"
                >
                  <Users size={14} />
                  เปรียบเทียบตารางทีม (Compare Team)
                </button>
              </div>
            </div>
          </div>

          {/* Footer Done button */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '10px' }}>
            <button
              onClick={() => setShowSettingsPopover(false)}
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: '#06b6d4',
                color: '#0f172a',
                border: 'none',
                borderRadius: '10px',
                fontWeight: 'bold',
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
              className="hover:bg-cyan-400"
            >
              <Check size={14} strokeWidth={3} />
              <span>บันทึกและปิดการตั้งค่า</span>
            </button>
          </div>
        </div>
      )}

      {/* Employee Cards List - Internal Scroll Area */}
      <div className="flex-1 overflow-y-auto pr-1 min-h-0 custom-scrollbar">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-8 h-8 border-3 border-cyan-500 border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-gray-400 text-sm">Loading team schedule...</p>
          </div>
        ) : processedEmployees.length === 0 ? (
          <div className="text-center py-20 text-gray-500 text-sm">No employees found.</div>
        ) : (
          <div 
            className="grid gap-4"
            style={{
              gridTemplateColumns: isSplitView 
                ? 'repeat(auto-fit, minmax(280px, 1fr))' 
                : 'repeat(auto-fit, minmax(320px, 1fr))'
            }}
          >
            {processedEmployees.map(emp => (
              <EmployeeCard 
                key={emp.id} 
                employee={emp} 
                currentDate={currentDate} 
                onOpenDayModal={onOpenDayModal}
                onOpenEmployeeModal={onOpenEmployeeModal}
                onOpenEditProfileModal={onOpenEditProfileModal}
                gridCols={isSplitView ? 3 : 2} // Triggers compact mode inside grid slots
              />
            ))}
          </div>
        )}
      </div>

    </div>
  );
};

export default CalendarDashboardPanel;
