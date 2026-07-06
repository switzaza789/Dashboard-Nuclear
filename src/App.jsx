import React, { useState, useEffect } from 'react';
import { fetchEmployees } from './api/calendar';
import DayEventsModal from './components/DayEventsModal';
import EmployeeEventsModal from './components/EmployeeEventsModal';
import TeamCompareModal from './components/TeamCompareModal';
import FullCalendarModal from './components/FullCalendarModal';
import EditProfileModal from './components/EditProfileModal';
import Toast from './components/Toast';
import { startOfWeek, addDays, subDays } from 'date-fns';
import { Calendar as CalendarIcon, Columns, Maximize2, ChevronUp, ChevronDown } from 'lucide-react';

import TapoDashboard from './components/TapoDashboard';
import { useDashboardLayout } from './hooks/useDashboardLayout';
import DashboardGrid from './components/DashboardGrid';
import CalendarDashboardPanel from './components/CalendarDashboardPanel';
import DashboardLayoutToolbar from './components/DashboardLayoutToolbar';
import UnsavedLayoutConfirmModal from './components/UnsavedLayoutConfirmModal';
import { getDashboardLayoutKind } from './utils/dashboardLayout';
import './App.css';

const DEFAULT_COLORS = ["#2563eb", "#dc2626", "#059669", "#7c3aed", "#d97706", "#db2777", "#0d9488"];

function App() {
  // --- Global App State ---
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem('app_view_mode') || 'split';
  });
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);

  // Sync state to local storage
  useEffect(() => {
    localStorage.setItem('app_view_mode', viewMode);
  }, [viewMode]);

  // --- Calendar State ---
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });



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

  const layout = useDashboardLayout(showToast);

  const handleViewModeChange = (newMode) => {
    if (layout.requestViewModeChange(newMode)) {
      setViewMode(newMode);
    }
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

  const [currentTimeReal, setCurrentTimeReal] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTimeReal(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);



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
    <div className="h-screen w-full bg-[#030712] text-gray-200 font-sans flex flex-col overflow-hidden relative app-viewport-container">
      
      {/* Visually Hidden Aria Live Announcements for Accessibility */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {layout.announcement}
      </div>

      {/* Global Collapsible Header */}
      <div className={`bg-gray-900/90 backdrop-blur-lg border-b border-gray-800 transition-all duration-300 ease-in-out z-40 ${isHeaderVisible ? 'h-10 opacity-100' : 'h-0 opacity-0 overflow-hidden'}`}>
        <div className="max-w-full h-full px-4 flex items-center justify-between gap-3">
          <div className="font-bold text-sm text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 hidden md:block whitespace-nowrap">
            Dashboard
          </div>
          
          <div className="flex items-center gap-2 bg-gray-800/50 p-1 rounded-lg border border-gray-700">
            <button 
              onClick={() => handleViewModeChange('split')}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${viewMode === 'split' ? 'bg-cyan-600 text-white shadow' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}
            >
              <Columns size={13} /> Split
            </button>
            <button 
              onClick={() => handleViewModeChange('tapo')}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${viewMode === 'tapo' ? 'bg-cyan-600 text-white shadow' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}
            >
              <Maximize2 size={13} /> Tapo
            </button>
            <button 
              onClick={() => handleViewModeChange('calendar')}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${viewMode === 'calendar' ? 'bg-cyan-600 text-white shadow' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}
            >
              <CalendarIcon size={13} /> Calendar
            </button>
          </div>

          <button 
            onClick={() => {
              if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(() => {});
              } else {
                document.exitFullscreen();
              }
            }}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-xs font-medium border border-gray-700 transition-colors cursor-pointer"
            title="ขยายเบราว์เซอร์เต็มจอ"
          >
            <Maximize2 size={13} /> Fullscreen
          </button>

          {/* Hide nav button — always last in bar */}
          <button
            onClick={() => setIsHeaderVisible(false)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-800 hover:bg-red-900/60 text-gray-500 hover:text-white text-xs border border-gray-700 transition-colors"
            title="ซ่อนแถบควบคุม"
          >
            <ChevronUp size={13} />
          </button>
        </div>
      </div>

      {/* Pull-tab when nav is hidden */}
      {!isHeaderVisible && (
        <button
          onClick={() => setIsHeaderVisible(true)}
          className="absolute top-0 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 px-3 py-0.5 bg-gray-800/90 hover:bg-gray-700 text-cyan-400 text-[11px] font-medium rounded-b-lg border border-t-0 border-gray-700 shadow-md backdrop-blur-md transition-all"
          title="แสดงแถบควบคุม"
        >
          <ChevronDown size={12} /> เมนู
        </button>
      )}

      {/* View Mode controls for custom layout or swaps */}
      {!layout.isEditingLayout && viewMode === 'split' && (
        <DashboardLayoutToolbar
          isEditingLayout={layout.isEditingLayout}
          isDirty={layout.isDirty}
          isSaving={layout.isSaving}
          onStartEdit={layout.startEditing}
          onSave={layout.saveLayout}
          onCancel={layout.cancelEditing}
          onReset={layout.resetToDefault}
          onApplySwapPreset={layout.applySwapPreset}
          layoutKind={getDashboardLayoutKind(layout.savedLayout)}
        />
      )}

      {/* Edit Mode Customization Toolbar */}
      {layout.isEditingLayout && viewMode === 'split' && isHeaderVisible && (
        <DashboardLayoutToolbar
          isEditingLayout={layout.isEditingLayout}
          isDirty={layout.isDirty}
          isSaving={layout.isSaving}
          onStartEdit={layout.startEditing}
          onSave={layout.saveLayout}
          onCancel={layout.cancelEditing}
          onReset={layout.resetToDefault}
          onApplySwapPreset={layout.applySwapPreset}
          layoutKind={getDashboardLayoutKind(layout.savedLayout)}
        />
      )}

      {/* Main Split Content Area */}
      <div className="flex flex-1 overflow-hidden main-content-area">
        
        {/* Render 6-slot Grid when in Split Mode */}
        {viewMode === 'split' && (
          <DashboardGrid
            savedLayout={layout.savedLayout}
            draftLayout={layout.draftLayout}
            isEditingLayout={layout.isEditingLayout}
            isSaving={layout.isSaving}
            activeDrag={layout.activeDrag}
            activeDropTarget={layout.activeDropTarget}
            setActiveDrag={layout.setActiveDrag}
            setActiveDropTarget={layout.setActiveDropTarget}
            setAnnouncement={layout.setAnnouncement}
            handleSwapOneSlot={layout.handleSwapOneSlot}
            handleMoveCalendar={layout.handleMoveCalendar}
            handleSetSpan={layout.handleSetSpan}
            cancelEditing={layout.cancelEditing}
            calendarPanel={
              <CalendarDashboardPanel
                data={{ processedEmployees, teamOverview, loading, currentDate, currentTimeReal }}
                actions={{
                  setCurrentDate,
                  goToday,
                  prevDay,
                  nextDay,
                  setFullCalendarOpen,
                  setCompareModalOpen,
                  onOpenDayModal: handleOpenDayModal,
                  onOpenEmployeeModal: handleOpenEmployeeModal,
                  onOpenEditProfileModal: (employee) => {
                    setEditingEmployee(employee);
                    setEditProfileModalOpen(true);
                  }
                }}
                isSplitView={true}
              />
            }
            tapoPanel={
              <TapoDashboard 
                viewMode={viewMode} 
                displayMode="compact" 
                onToggleFullscreen={() => handleViewModeChange(viewMode === 'tapo' ? 'split' : 'tapo')} 
              />
            }
          />
        )}

        {/* Tapo Only Fullscreen View */}
        {viewMode === 'tapo' && (
          <div className="flex-1 h-full overflow-y-auto custom-scrollbar">
            <TapoDashboard 
              viewMode={viewMode} 
              displayMode="full" 
              onToggleFullscreen={() => handleViewModeChange('split')} 
            />
          </div>
        )}

        {/* Calendar Only Fullscreen View */}
        {viewMode === 'calendar' && (
          <div className="flex-1 h-full overflow-y-auto custom-scrollbar">
            <CalendarDashboardPanel
              data={{ processedEmployees, teamOverview, loading, currentDate, currentTimeReal }}
              actions={{
                setCurrentDate,
                goToday,
                prevDay,
                nextDay,
                setFullCalendarOpen,
                setCompareModalOpen,
                onOpenDayModal: handleOpenDayModal,
                onOpenEmployeeModal: handleOpenEmployeeModal,
                onOpenEditProfileModal: (employee) => {
                  setEditingEmployee(employee);
                  setEditProfileModalOpen(true);
                }
              }}
              isSplitView={false}
            />
          </div>
        )}
      </div>

      <DayEventsModal isOpen={modalOpen} onClose={() => setModalOpen(false)} date={modalData.date} events={modalData.events} employeeName={modalData.employeeName} employeeEmail={modalData.employeeEmail} onDataChanged={refreshData} showToast={showToast} />
      <EmployeeEventsModal isOpen={empModalOpen} onClose={() => setEmpModalOpen(false)} employee={empModalData.employee} events={empModalData.events} weekStart={weekStart} onDataChanged={refreshData} showToast={showToast} />
      <TeamCompareModal isOpen={compareModalOpen} onClose={() => setCompareModalOpen(false)} employees={processedEmployees} initialDate={currentDate} />
      <FullCalendarModal isOpen={fullCalendarOpen} onClose={() => setFullCalendarOpen(false)} currentDate={currentDate} employees={processedEmployees} onColorChange={handleUpdateColor} />
      <EditProfileModal isOpen={editProfileModalOpen} onClose={() => { setEditProfileModalOpen(false); setEditingEmployee(null); }} employee={editingEmployee} onSave={handleUpdateProfile} />
      
      {/* Unsaved exit transition confirmation modal */}
      <UnsavedLayoutConfirmModal
        isOpen={layout.isExitConfirmationOpen}
        onSave={async () => {
          const res = await layout.confirmSaveAndContinue();
          if (res.proceed) setViewMode(res.viewMode);
        }}
        onDiscard={() => {
          const res = layout.confirmDiscardAndContinue();
          if (res.proceed) setViewMode(res.viewMode);
        }}
        onStay={() => {
          layout.stayInEditMode();
        }}
        isSaving={layout.isSaving}
      />
      
      <Toast show={toast.show} message={toast.message} type={toast.type} onClose={() => setToast(prev => ({ ...prev, show: false }))} />
    </div>
  );
}

export default App;
