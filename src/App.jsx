import React, { useState, useEffect, useRef } from 'react';
import { fetchEmployees } from './api/calendar';
import EmployeeCard from './components/EmployeeCard';
import DayEventsModal from './components/DayEventsModal';
import EmployeeEventsModal from './components/EmployeeEventsModal';
import TeamCompareModal from './components/TeamCompareModal';
import FullCalendarModal from './components/FullCalendarModal';
import EditProfileModal from './components/EditProfileModal';
import Toast from './components/Toast';
import { startOfWeek, addDays, subDays, format } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, LayoutGrid, List, LayoutTemplate, Users, LogOut, Sun, Moon, Calendar, Columns, ArrowRightLeft, Maximize2, ChevronUp, ChevronDown } from 'lucide-react';

import TapoDashboard from './components/TapoDashboard';

function App() {
  // --- Global App State ---
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem('app_view_mode') || 'split';
  });
  const [isSwapped, setIsSwapped] = useState(() => {
    return localStorage.getItem('app_is_swapped') === 'true';
  });
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);

  // Sync state to local storage
  useEffect(() => {
    localStorage.setItem('app_view_mode', viewMode);
    localStorage.setItem('app_is_swapped', isSwapped);
  }, [viewMode, isSwapped]);

  // --- Calendar State ---
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });

  const getDisplayDate = () => {
    return currentDate.toLocaleDateString('th-TH', { 
      year: 'numeric', month: 'long', day: 'numeric' 
    });
  };

  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState({ date: new Date(), events: [], employeeName: '' });

  const [empModalOpen, setEmpModalOpen] = useState(false);
  const [empModalData, setEmpModalData] = useState({ employee: null, events: [] });

  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [fullCalendarOpen, setFullCalendarOpen] = useState(false);
  const [editProfileModalOpen, setEditProfileModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);

  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
  };

  const [customProfiles, setCustomProfiles] = useState(() => {
    const saved = localStorage.getItem('custom_profiles');
    return saved ? JSON.parse(saved) : {};
  });

  const handleUpdateProfile = (email, department, customStatus, avatarUrl) => {
    const updated = {
      ...customProfiles,
      [email]: { department, customStatus, avatarUrl }
    };
    setCustomProfiles(updated);
    localStorage.setItem('custom_profiles', JSON.stringify(updated));
  };

  const handleUpdateColor = (email, color) => {
    const current = customProfiles[email] || {};
    const updated = {
      ...customProfiles,
      [email]: { ...current, calendarColor: color }
    };
    setCustomProfiles(updated);
    localStorage.setItem('custom_profiles', JSON.stringify(updated));
  };

  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  const [gridCols, setGridCols] = useState(3);
  const [currentTimeReal, setCurrentTimeReal] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTimeReal(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const dateInputRef = useRef(null);
  const handleDateClick = () => {
    if (dateInputRef.current) {
      try {
        dateInputRef.current.showPicker();
      } catch (e) {
        dateInputRef.current.focus();
      }
    }
  };

  // Fetch Data unconditionally (no auth)
  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      setLoading(true);
      const data = await fetchEmployees();
      if (isMounted) {
        setEmployees(data);
        setLoading(false);
      }
    };
    loadData();
    return () => { isMounted = false; };
  }, []);

  const refreshData = async () => {
    setLoading(true);
    const data = await fetchEmployees();
    setEmployees(data);
    setLoading(false);
  };

  const nextDay = () => setCurrentDate(addDays(currentDate, 1));
  const prevDay = () => setCurrentDate(subDays(currentDate, 1));
  const goToday = () => setCurrentDate(new Date());

  const DEFAULT_COLORS = ["#2563eb", "#dc2626", "#059669", "#7c3aed", "#d97706", "#db2777", "#0d9488"];

  const processedEmployees = React.useMemo(() => {
    return employees.map((emp, index) => {
      const custom = customProfiles[emp.email] || {};
      return {
        ...emp,
        department: custom.department || emp.department || 'General',
        customStatus: custom.customStatus || '',
        avatarUrl: custom.avatarUrl || emp.avatarUrl,
        calendarColor: custom.calendarColor || DEFAULT_COLORS[index % DEFAULT_COLORS.length]
      };
    });
  }, [employees, customProfiles]);

  const teamOverview = React.useMemo(() => {
    let available = 0;
    let onLeave = 0;
    let wfh = 0;
    let busy = 0;
    
    processedEmployees.forEach(emp => {
      const s = (emp.customStatus || '').toLowerCase();
      if (!s) available++;
      else if (s.includes('ลา') || s.includes('sick') || s.includes('leave') || s.includes('vacation')) onLeave++;
      else if (s.includes('wfh') || s.includes('บ้าน') || s.includes('remote')) wfh++;
      else busy++; 
    });
    
    return { available, onLeave, wfh, busy };
  }, [processedEmployees]);

  const handleOpenDayModal = (employee, date, dayEvents) => {
    setModalData({ date, events: dayEvents, employeeName: employee.name, employeeEmail: employee.email });
    setModalOpen(true);
  };

  const handleOpenEmployeeModal = (employee, allEvents) => {
    setEmpModalData({ employee, events: allEvents });
    setEmpModalOpen(true);
  };

  return (
    <div className="h-screen w-full bg-[#030712] text-gray-200 font-sans flex flex-col overflow-hidden relative">
      
      {/* Floating Toggle Header Button */}
      <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-50">
        <button 
          onClick={() => setIsHeaderVisible(!isHeaderVisible)}
          className="bg-gray-800/80 hover:bg-gray-700 text-cyan-400 p-1.5 rounded-full backdrop-blur-md border border-gray-700 shadow-lg transition-all"
          title={isHeaderVisible ? "ซ่อนแถบควบคุม" : "แสดงแถบควบคุม"}
        >
          {isHeaderVisible ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
      </div>

      {/* Global Collapsible Header */}
      <div className={`bg-gray-900/90 backdrop-blur-lg border-b border-gray-800 transition-all duration-300 ease-in-out z-40 ${isHeaderVisible ? 'h-16 opacity-100' : 'h-0 opacity-0 overflow-hidden'}`}>
        <div className="max-w-7xl mx-auto h-full px-6 flex items-center justify-between">
          <div className="font-bold text-xl text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 hidden md:block">
            Looker Studio Combined
          </div>
          
          <div className="flex items-center gap-4 bg-gray-800/50 p-1.5 rounded-xl border border-gray-700">
            <button 
              onClick={() => setViewMode('split')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${viewMode === 'split' ? 'bg-cyan-600 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}
            >
              <Columns size={16} /> Split View
            </button>
            <button 
              onClick={() => setViewMode('tapo')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${viewMode === 'tapo' ? 'bg-cyan-600 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}
            >
              <Maximize2 size={16} /> Tapo Only
            </button>
            <button 
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${viewMode === 'calendar' ? 'bg-cyan-600 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}
            >
              <CalendarIcon size={16} /> Calendar Only
            </button>
          </div>

          <button 
            onClick={() => setIsSwapped(!isSwapped)}
            disabled={viewMode !== 'split'}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-sm font-medium transition-all ${viewMode === 'split' ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)] cursor-pointer' : 'bg-gray-800 text-gray-500 cursor-not-allowed'}`}
          >
            <ArrowRightLeft size={16} /> สลับฝั่ง (Swap)
          </button>
        </div>
      </div>

      {/* Main Split Content Area */}
      <div className={`flex flex-1 overflow-hidden transition-all duration-500 ${isSwapped ? 'flex-row-reverse' : 'flex-row'}`}>
        
        {/* Tapo Dashboard Area */}
        {(viewMode === 'split' || viewMode === 'tapo') && (
          <div className={`flex-1 h-full overflow-y-auto custom-scrollbar transition-all duration-500 ${viewMode === 'split' ? 'border-r border-gray-800' : ''}`}>
            <TapoDashboard viewMode={viewMode} />
          </div>
        )}

        {/* Calendar Area */}
        {(viewMode === 'split' || viewMode === 'calendar') && (
          <div className="flex-1 h-full overflow-y-auto custom-scrollbar p-4 md:p-8">
            <div className="max-w-6xl mx-auto mb-10 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-4 flex-wrap">
                  <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-600 to-blue-600 dark:from-cyan-400 dark:to-blue-500">
                    Team Schedule
                  </h1>
                  
                  {/* Team Overview Summary Badge */}
                  <div className="flex flex-wrap items-center gap-3 bg-[#1f2937]/80 border border-[#374151] rounded-full px-4 py-1.5 text-xs font-semibold shadow-lg backdrop-blur-sm">
                    <span className="flex items-center gap-1.5 text-emerald-400" title="ว่าง / อยู่ที่ออฟฟิศ">
                      <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div> ว่าง: {teamOverview.available}
                    </span>
                    {teamOverview.busy > 0 && (
                      <span className="flex items-center gap-1.5 text-pink-400 border-l border-[#374151] pl-3">
                        <div className="w-2 h-2 rounded-full bg-pink-400"></div> ติดงาน: {teamOverview.busy}
                      </span>
                    )}
                    {teamOverview.wfh > 0 && (
                      <span className="flex items-center gap-1.5 text-blue-400 border-l border-[#374151] pl-3">
                        <div className="w-2 h-2 rounded-full bg-blue-400"></div> WFH: {teamOverview.wfh}
                      </span>
                    )}
                    {teamOverview.onLeave > 0 && (
                      <span className="flex items-center gap-1.5 text-red-400 border-l border-[#374151] pl-3">
                        <div className="w-2 h-2 rounded-full bg-red-400"></div> ลา: {teamOverview.onLeave}
                      </span>
                    )}
                  </div>
                </div>

                <div 
                  className="relative group cursor-pointer inline-block mt-2 bg-gray-800/50 hover:bg-gray-800 px-4 py-2 rounded-xl transition-all border border-gray-700/50 hover:border-cyan-500/50"
                  onClick={handleDateClick}
                >
                  <p className="text-cyan-400 font-medium flex items-center gap-2">
                    <CalendarIcon size={16} className="group-hover:animate-bounce" />
                    {getDisplayDate()}
                  </p>
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
              
              <div className="flex flex-wrap items-center gap-3">
                <button 
                  onClick={() => setFullCalendarOpen(true)}
                  className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium transition-colors shadow-[0_0_15px_rgba(147,51,234,0.3)] border border-purple-400"
                >
                  <CalendarIcon size={18} />
                  Full Calendar
                </button>

                <button 
                  onClick={() => setCompareModalOpen(true)}
                  className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-medium transition-colors shadow-[0_0_15px_rgba(6,182,212,0.3)] border border-cyan-400"
                >
                  <Users size={18} />
                  Compare Team
                </button>

                <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1f2937]/50 border border-cyan-500/30 text-cyan-300 font-mono text-lg font-semibold tracking-wider">
                  {format(currentTimeReal, 'HH:mm:ss')}
                </div>

                {viewMode !== 'split' ? (
                  <div className="flex rounded-xl bg-[#1f2937] border border-[#374151] overflow-hidden mr-2">
                    <button onClick={() => setGridCols(1)} className={`p-2 transition-colors ${gridCols === 1 ? 'bg-cyan-500/20 text-cyan-400' : 'hover:bg-[#374151] text-gray-400'}`}><List size={20} /></button>
                    <div className="w-[1px] bg-[#374151]"></div>
                    <button onClick={() => setGridCols(2)} className={`p-2 transition-colors ${gridCols === 2 ? 'bg-cyan-500/20 text-cyan-400' : 'hover:bg-[#374151] text-gray-400'}`}><LayoutGrid size={20} /></button>
                    <div className="w-[1px] bg-[#374151]"></div>
                    <button onClick={() => setGridCols(3)} className={`p-2 transition-colors ${gridCols === 3 ? 'bg-cyan-500/20 text-cyan-400' : 'hover:bg-[#374151] text-gray-400'}`}><LayoutTemplate size={20} /></button>
                  </div>
                ) : (
                  <div className="flex rounded-xl bg-[#1f2937] border border-[#374151] overflow-hidden mr-2">
                    <button className="p-2 transition-colors bg-cyan-500/20 text-cyan-400" title="Auto Grid (Split Mode)"><LayoutGrid size={20} /></button>
                  </div>
                )}

                <button onClick={goToday} className="px-4 py-2 rounded-xl bg-[#1f2937] border border-[#374151] hover:bg-[#374151] hover:text-white transition-colors text-sm font-medium flex items-center gap-2">
                  <CalendarIcon size={16} className="text-cyan-400" />
                  Today
                </button>
                <div className="flex rounded-xl bg-[#1f2937] border border-[#374151] overflow-hidden">
                  <button onClick={prevDay} className="p-2 hover:bg-[#374151] hover:text-white transition-colors"><ChevronLeft size={20} /></button>
                  <div className="w-[1px] bg-[#374151]"></div>
                  <button onClick={nextDay} className="p-2 hover:bg-[#374151] hover:text-white transition-colors"><ChevronRight size={20} /></button>
                </div>
              </div>
            </div>

            <div className="max-w-6xl mx-auto">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                  <p className="text-gray-400">Loading team members...</p>
                </div>
              ) : processedEmployees.length === 0 ? (
                <div className="text-center py-20 text-gray-500">No employees found.</div>
              ) : (
                <div 
                  className={`grid gap-4 md:gap-6 ${gridCols === 1 && viewMode !== 'split' ? 'grid-cols-1 max-w-3xl mx-auto' : ''}`}
                  style={(gridCols !== 1 || viewMode === 'split') ? { gridTemplateColumns: `repeat(auto-fit, minmax(${viewMode === 'split' ? '280px' : '320px'}, 1fr))` } : {}}
                >
                  {processedEmployees.map(emp => (
                    <EmployeeCard 
                      key={emp.id} 
                      employee={emp} 
                      currentDate={currentDate} 
                      onOpenDayModal={handleOpenDayModal}
                      onOpenEmployeeModal={handleOpenEmployeeModal}
                      onOpenEditProfileModal={(employee) => {
                        setEditingEmployee(employee);
                        setEditProfileModalOpen(true);
                      }}
                      gridCols={gridCols}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <DayEventsModal isOpen={modalOpen} onClose={() => setModalOpen(false)} date={modalData.date} events={modalData.events} employeeName={modalData.employeeName} employeeEmail={modalData.employeeEmail} onDataChanged={refreshData} showToast={showToast} />
      <EmployeeEventsModal isOpen={empModalOpen} onClose={() => setEmpModalOpen(false)} employee={empModalData.employee} events={empModalData.events} weekStart={weekStart} onDataChanged={refreshData} showToast={showToast} />
      <TeamCompareModal isOpen={compareModalOpen} onClose={() => setCompareModalOpen(false)} employees={processedEmployees} initialDate={currentDate} />
      <FullCalendarModal isOpen={fullCalendarOpen} onClose={() => setFullCalendarOpen(false)} currentDate={currentDate} employees={processedEmployees} onColorChange={handleUpdateColor} />
      <EditProfileModal isOpen={editProfileModalOpen} onClose={() => { setEditProfileModalOpen(false); setEditingEmployee(null); }} employee={editingEmployee} onSave={handleUpdateProfile} />
      <Toast show={toast.show} message={toast.message} type={toast.type} onClose={() => setToast(prev => ({ ...prev, show: false }))} />
    </div>
  );
}

export default App;
