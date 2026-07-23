import { useRef, useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Users, Settings, X } from 'lucide-react';
import EmployeeCard from './EmployeeCard';

const CalendarDashboardPanel = ({
  data: { processedEmployees, visibleEmployees = [], hiddenEmployeeEmails = [], teamOverview, loading, currentDate, currentTimeReal },
  actions: { setCurrentDate, goToday, prevDay, nextDay, setFullCalendarOpen, setCompareModalOpen, onOpenDayModal, onOpenEmployeeModal, onOpenEditProfileModal, toggleEmployeeVisibility, showAllEmployees, hideAllEmployees },
  isSplitView = true,
  placement = { columnSpan: 1, rowSpan: 1 }
}) => {
  const dateInputRef = useRef(null);
  const [showSettingsPopover, setShowSettingsPopover] = useState(false);

  const colSpan = placement?.columnSpan || 1;
  const rowSpan = placement?.rowSpan || 1;

  // 📐 DYNAMIC PROPORTIONATE GRID CONFIG FOR ALL 4 SLOT SIZES
  // - 1x1: 1 Column (แสดงการ์ด 1 คน ไล่ลงไปข้างล่าง)
  // - 2x1: 2 Columns (แสดงการ์ดเรียงกัน 2 คน ซ้ายไปขวา กว้างขวางสมดุล อ่านง่าย ไม่บีบแคบ)
  // - 1x2: 1 Column (แสดงการ์ดเรียงกันลงมาข้างล่าง 4 คน บนลงล่าง)
  // - 2x2: 3 Columns (แสดงการ์ด 3 คอลัมน์กว้างขวางพรีเมียม)
  const gridClass = useMemo(() => {
    if (colSpan >= 2 && rowSpan >= 2) {
      return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3';
    }
    if (colSpan >= 2) {
      return 'grid-cols-1 sm:grid-cols-2 gap-3';
    }
    if (rowSpan >= 2) {
      return 'grid-cols-1 gap-3';
    }
    return 'grid-cols-1 gap-3';
  }, [colSpan, rowSpan]);

  useEffect(() => {
    if (!showSettingsPopover) return;
    const handleClose = () => setShowSettingsPopover(false);
    window.addEventListener('click', handleClose);
    return () => window.removeEventListener('click', handleClose);
  }, [showSettingsPopover]);

  const getDisplayDate = () => {
    return currentDate.toLocaleDateString('th-TH', { 
      year: 'numeric', month: 'short', day: 'numeric' 
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
    <div className={`flex flex-col h-full min-h-0 min-w-0 bg-[#0f172a]/30 backdrop-blur-md rounded-2xl ${isSplitView ? 'p-3.5 border border-white/10' : 'p-6 md:p-8'} relative overflow-hidden`}>
      
      {/* 🚀 STRICT SINGLE LINE TOP HEADER BAR WITH NO OVERLAP */}
      <div className="mb-2.5 shrink-0 pb-2 border-b border-[#1f2937]/80">
        <div className="flex items-center justify-between gap-1.5 w-full flex-nowrap overflow-x-auto custom-scrollbar-none pr-8">
          
          {/* 👈 LEFT: TITLE + STATUS SUMMARY + SETTINGS BUTTON ⚙️ */}
          <div className="flex items-center gap-1.5 shrink-0">
            <h1 className="text-sm font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500 whitespace-nowrap">
              Schedule
            </h1>
            
            {/* Status Summary Badge */}
            <div className="flex items-center gap-1 bg-[#1f2937]/90 border border-[#374151] rounded-full px-2 py-0.5 text-[9.5px] font-semibold shadow-sm backdrop-blur-sm">
              <span className="flex items-center gap-1 text-emerald-400 whitespace-nowrap" title="ว่าง / อยู่ที่ออฟฟิศ">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div> ว่าง: {teamOverview.available}
              </span>
              {teamOverview.busy > 0 && (
                <span className="flex items-center gap-1 text-pink-400 border-l border-[#374151] pl-1 whitespace-nowrap">
                  <div className="w-1.5 h-1.5 rounded-full bg-pink-400"></div> ติดงาน: {teamOverview.busy}
                </span>
              )}
              {teamOverview.wfh > 0 && (
                <span className="flex items-center gap-1 text-blue-400 border-l border-[#374151] pl-1 whitespace-nowrap">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div> WFH: {teamOverview.wfh}
                </span>
              )}
              {teamOverview.onLeave > 0 && (
                <span className="flex items-center gap-1 text-red-400 border-l border-[#374151] pl-1 whitespace-nowrap">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-400"></div> ลา: {teamOverview.onLeave}
                </span>
              )}
            </div>

            {/* ⚙️ Settings Button moved to Left side away from top-right corner */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowSettingsPopover(true);
              }}
              className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-cyan-400 border border-gray-700 transition-colors cursor-pointer shrink-0"
              title="ซ่อน/แสดง การ์ดพนักงาน"
            >
              <Settings size={13} />
            </button>
          </div>

          {/* 🎯 RIGHT: ALL CONTROLS IN 1 SINGLE ROW */}
          <div className="flex items-center gap-1 shrink-0">
            {/* 1. ปุ่มสลับวัน (‹ วันนี้ ›) */}
            <div className="flex items-center bg-[#1f2937]/90 border border-gray-700 rounded-lg p-0.5 shadow-sm">
              <button 
                onClick={prevDay}
                className="p-0.5 hover:bg-gray-700 rounded text-gray-300 hover:text-white transition-colors"
                title="วันก่อนหน้า"
              >
                <ChevronLeft size={12} />
              </button>
              <button 
                onClick={goToday}
                className="px-1.5 py-0.5 text-[9.5px] font-bold text-cyan-400 hover:bg-gray-700 rounded transition-colors whitespace-nowrap"
                title="ไปยังวันนี้"
              >
                วันนี้
              </button>
              <button 
                onClick={nextDay}
                className="p-0.5 hover:bg-gray-700 rounded text-gray-300 hover:text-white transition-colors"
                title="วันถัดไป"
              >
                <ChevronRight size={12} />
              </button>
            </div>

            {/* 2. ตัวเลือกวันที่ต้องการดู */}
            <div 
              className="relative cursor-pointer flex items-center gap-1 px-2 py-0.5 bg-gray-800/90 hover:bg-gray-700 rounded-lg border border-gray-700 transition-all text-[10.5px] font-semibold text-gray-200 shadow-sm"
              onClick={handleDateClick}
              title="คลิกเพื่อเลือกวันที่ต้องการดู"
            >
              <CalendarIcon size={11} className="text-cyan-400 shrink-0" />
              <span className="font-mono whitespace-nowrap">{getDisplayDate()}</span>
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

            {/* 3. ปุ่ม ปฏิทินแบบเต็ม & เปรียบเทียบทีม */}
            <button
              onClick={() => setFullCalendarOpen(true)}
              className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border border-cyan-700/60 text-[10px] font-semibold transition-all shadow-sm cursor-pointer whitespace-nowrap"
              title="เปิดดูปฏิทินเต็มเดือน (Full Calendar)"
            >
              <CalendarIcon size={11} />
              <span>ปฏิทินแบบเต็ม</span>
            </button>

            <button
              onClick={() => setCompareModalOpen(true)}
              className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-purple-950/80 hover:bg-purple-900 text-purple-300 border border-purple-700/60 text-[10px] font-semibold transition-all shadow-sm cursor-pointer whitespace-nowrap"
              title="เปรียบเทียบตารางงานพนักงานทุกคน"
            >
              <Users size={11} />
              <span>เปรียบเทียบทีม</span>
            </button>
          </div>

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
              ตั้งค่าซ่อน/แสดง การ์ดพนักงาน
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

          {/* Employee Card Visibility Settings */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '4px' }} className="custom-scrollbar">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                เลือกการ์ดพนักงานที่ต้องการแสดง
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={showAllEmployees}
                  className="text-[10px] text-cyan-400 hover:text-cyan-300 font-semibold bg-cyan-950/40 hover:bg-cyan-900/60 px-2.5 py-1 rounded border border-cyan-800/50 transition-colors cursor-pointer"
                >
                  แสดงทั้งหมด
                </button>
                <button
                  type="button"
                  onClick={hideAllEmployees}
                  className="text-[10px] text-gray-400 hover:text-gray-300 font-semibold bg-gray-800 hover:bg-gray-700 px-2.5 py-1 rounded border border-gray-700 transition-colors cursor-pointer"
                >
                  ซ่อนทั้งหมด
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5 max-h-80 overflow-y-auto custom-scrollbar bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
              {processedEmployees.map(emp => {
                const isVisible = !hiddenEmployeeEmails.includes(emp.email);
                return (
                  <label
                    key={emp.email}
                    className={`flex items-center justify-between p-2 rounded-lg border transition-all cursor-pointer ${
                      isVisible 
                        ? 'bg-slate-800/80 border-slate-700 text-gray-200' 
                        : 'bg-slate-900/40 border-slate-800/80 text-gray-500 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] text-white"
                        style={{ backgroundColor: emp.color }}
                      >
                        {emp.shortName}
                      </div>
                      <span className="text-xs font-semibold">{emp.name}</span>
                    </div>

                    <input
                      type="checkbox"
                      checked={isVisible}
                      onChange={() => toggleEmployeeVisibility(emp.email)}
                      className="w-4 h-4 rounded border-gray-700 bg-gray-900 text-cyan-500 focus:ring-cyan-500/20 cursor-pointer"
                    />
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Scrollable Main Employee Schedule Grid */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 custom-scrollbar pr-1">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full py-12">
            <div className="w-8 h-8 border-3 border-cyan-500 border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-xs text-gray-400">กำลังซิงก์ข้อมูลปฏิทิน Google Calendar...</p>
          </div>
        ) : visibleEmployees.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-12 text-center">
            <Users size={32} className="text-gray-600 mb-2" />
            <p className="text-xs text-gray-400 font-medium">ไม่มีการ์ดพนักงานที่เปิดแสดงในขณะนี้</p>
            <button
              onClick={showAllEmployees}
              className="mt-2 text-xs text-cyan-400 hover:text-cyan-300 font-semibold underline"
            >
              เปิดแสดงการ์ดพนักงานทั้งหมด
            </button>
          </div>
        ) : (
          <div className={`grid ${gridClass}`}>
            {visibleEmployees.map((employee) => (
              <EmployeeCard
                key={employee.email}
                employee={employee}
                currentDate={currentDate}
                currentTimeReal={currentTimeReal}
                onOpenDayModal={onOpenDayModal}
                onOpenEmployeeModal={onOpenEmployeeModal}
                onOpenEditProfileModal={onOpenEditProfileModal}
              />
            ))}
          </div>
        )}
      </div>

    </div>
  );
};

export default CalendarDashboardPanel;
