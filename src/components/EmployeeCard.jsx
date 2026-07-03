import { useState, useEffect, useRef } from 'react';
import { format, isSameDay, addDays, isToday, startOfWeek } from 'date-fns';
import { Clock } from 'lucide-react';
import { fetchEvents } from '../api/calendar';


const EmployeeCard = ({ employee, currentDate, onOpenDayModal, onOpenEmployeeModal, onOpenEditProfileModal, gridCols = 2 }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const avatarFileRef = useRef(null);

  // Handle avatar file upload
  const handleAvatarUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target.result;
      onOpenEditProfileModal({ ...employee, _avatarBase64: base64 });
    };
    reader.readAsDataURL(file);
  };
  
  const isCompact = gridCols >= 3;

  // Lock starting day to Monday of the selected date's week
  const monday = startOfWeek(currentDate, { weekStartsOn: 1 });
  const workDays = [...Array(5)].map((_, i) => addDays(monday, i));
  const weekendDays = [addDays(monday, 5), addDays(monday, 6)]; // Sat, Sun
  const currentDateStr = currentDate.toISOString();

  useEffect(() => {
    let isMounted = true;
    const loadEvents = async () => {
      setLoading(true);
      // Fetch events for Monday to Sunday
      const data = await fetchEvents(employee.email, monday, addDays(monday, 6));
      if (isMounted) {
        setEvents(data);
        setLoading(false);
      }
    };
    if (employee.email) {
      loadEvents();
    }
    return () => { isMounted = false; };
  }, [employee.email, currentDate, currentDateStr]);

  // Determine Live Status based on today's events (to match UI)
  const now = new Date();
  const todayEvents = events.filter(e => isSameDay(new Date(e.start), now));
  
  // Try to find an event that is active right now
  let currentEvent = todayEvents.find(e => {
    const start = new Date(e.start);
    const end = new Date(e.end);
    if (isNaN(end.getTime())) return true;
    return now >= start && now <= end;
  });

  // If no strictly active event, but there are events today, use the first one
  if (!currentEvent && todayEvents.length > 0) {
    currentEvent = todayEvents[0];
  }

  // Calculate status (prioritize customStatus override)
  let statusText = employee.customStatus || "Available";
  let statusColor = "text-emerald-400";
  let statusBorder = "border-emerald-400/50";

  if (employee.customStatus) {
    const cStatus = employee.customStatus.toLowerCase();
    if (cStatus.includes('ลา') || cStatus.includes('sick') || cStatus.includes('leave') || cStatus.includes('vacation')) {
      statusColor = "text-red-400";
      statusBorder = "border-red-400/50";
    } else if (cStatus.includes('wfh') || cStatus.includes('remote') || cStatus.includes('บ้าน')) {
      statusColor = "text-blue-400";
      statusBorder = "border-blue-400/50";
    } else if (cStatus.includes('meeting') || cStatus.includes('ประชุม')) {
      statusColor = "text-pink-400";
      statusBorder = "border-pink-400/50";
    } else {
      statusColor = "text-amber-400";
      statusBorder = "border-amber-400/50";
    }
  } else if (currentEvent) {
    const title = currentEvent.title.toLowerCase();
    if (title.includes('ลา') || title.includes('sick') || title.includes('leave') || title.includes('vacation')) {
      statusText = "On Leave";
      statusColor = "text-red-400";
      statusBorder = "border-red-400/50";
    } else if (title.includes('wfh') || title.includes('work from home') || title.includes('remote') || title.includes('บ้าน')) {
      statusText = "Working Remotely";
      statusColor = "text-blue-400";
      statusBorder = "border-blue-400/50";
    } else if (title.includes('meeting') || title.includes('ประชุม')) {
      statusText = "In a Meeting";
      statusColor = "text-pink-400";
      statusBorder = "border-pink-400/50";
    } else if (title.includes('ออฟฟิศ') || title.includes('office')) {
      statusText = "At Office";
      statusColor = "text-emerald-400";
      statusBorder = "border-emerald-400/50";
    } else {
      // Instead of generic "In a Meeting", use the actual event title (truncated)
      statusText = currentEvent.title.length > 18 ? currentEvent.title.substring(0, 18) + '...' : currentEvent.title;
      statusColor = "text-amber-400";
      statusBorder = "border-amber-400/50";
    }
  }

  // --- Avatar live-status border color ---
  // Map status color to actual CSS color values for the glow ring
  const isLiveNow = (() => {
    const now = new Date();
    return events.some(e => now >= new Date(e.start) && now <= new Date(e.end));
  })();

  let avatarBorderColor = '#06b6d4'; // default cyan
  let avatarGlowColor   = 'rgba(6,182,212,0.5)';
  if (isLiveNow || currentEvent) {
    if (statusColor.includes('red')) {
      avatarBorderColor = '#f87171'; avatarGlowColor = 'rgba(248,113,113,0.5)';
    } else if (statusColor.includes('blue')) {
      avatarBorderColor = '#60a5fa'; avatarGlowColor = 'rgba(96,165,250,0.5)';
    } else if (statusColor.includes('pink')) {
      avatarBorderColor = '#f472b6'; avatarGlowColor = 'rgba(244,114,182,0.5)';
    } else if (statusColor.includes('amber')) {
      avatarBorderColor = '#fbbf24'; avatarGlowColor = 'rgba(251,191,36,0.5)';
    } else if (statusColor.includes('emerald')) {
      avatarBorderColor = '#34d399'; avatarGlowColor = 'rgba(52,211,153,0.5)';
    }
  }


  return (
    <div className={`flex flex-col md:flex-row ${isCompact ? 'gap-4 p-4' : 'gap-6 p-6'} bg-[#111827] rounded-3xl border border-[#1f2937] shadow-xl hover:shadow-cyan-900/40 hover:border-cyan-500/50 hover:scale-[1.02] hover:z-10 relative transition-all duration-300`}>
      
      {/* Left Panel: Profile */}
      <div 
        className={`flex flex-col items-center justify-center shrink-0 relative group/profile ${isCompact ? 'min-w-[120px] md:w-1/4' : 'min-w-[200px] md:w-1/3'}`}
      >
        {/* Hidden file input for avatar upload */}
        <input
          ref={avatarFileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleAvatarUpload}
        />
        <div
          className={`relative transition-transform duration-300 hover:scale-110 ${isCompact ? 'w-16 h-16 mb-2' : 'w-28 h-28 mb-4'} cursor-pointer`}
          title="คลิกเพื่อเปลี่ยนรูปโปรไฟล์"
          onClick={(e) => {
            e.stopPropagation();
            avatarFileRef.current?.click();
          }}
        >
          {/* Outer pulsing glow ring — visible only when live */}
          {isLiveNow && (
            <span
              className="absolute inset-0 rounded-full animate-ping"
              style={{ border: `3px solid ${avatarBorderColor}`, opacity: 0.5 }}
            />
          )}
          <div
            className="absolute inset-0 rounded-full p-1 transition-all duration-500"
            style={{
              border: `3px solid ${avatarBorderColor}`,
              boxShadow: isLiveNow ? `0 0 14px 3px ${avatarGlowColor}` : 'none',
            }}
          >
            <img 
              src={employee.avatarUrl || `https://ui-avatars.com/api/?name=${employee.name}&background=1f2937&color=fff`} 
              alt={employee.name}
              className="w-full h-full rounded-full object-cover bg-[#1f2937]"
            />
          </div>
          {/* Upload overlay hint on hover */}
          <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
        </div>

        {/* Schedule button — below avatar */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenEmployeeModal(employee, events);
          }}
          className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-cyan-400 border border-gray-700 hover:border-cyan-500 rounded-full px-2 py-0.5 bg-gray-900 hover:bg-gray-800 transition-all mb-1"
          title="ดูตารางงานทั้งสัปดาห์"
        >
          <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Schedule
        </button>
        <h2 className={`${isCompact ? 'text-base' : 'text-xl'} font-bold text-white uppercase tracking-wider text-center group-hover/profile:text-cyan-400 transition-colors duration-300`}>{employee.name}</h2>
        

        


        {/* Today's Events — always visible, fills bottom of profile panel */}
        {(() => {
          const now = new Date();
          const todayEvts = events
            .filter(e => isSameDay(new Date(e.start), now))
            .sort((a, b) => new Date(a.start) - new Date(b.start));
          return (
            <div className="w-full mt-3 flex flex-col gap-1.5 flex-1 min-h-0">
              {/* Section label */}
              <div className="flex items-center gap-1 mb-0.5">
                <Clock className="w-3 h-3 text-cyan-500 shrink-0" />
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  งานวันนี้
                </span>
              </div>

              {todayEvts.length === 0 ? (
                <p className="text-[11px] text-gray-600 text-center py-2 border border-dashed border-gray-800 rounded-lg">
                  ไม่มีงานวันนี้
                </p>
              ) : (
                <div className="flex flex-col gap-1 overflow-y-auto max-h-36 pr-0.5">
                  {todayEvts.map(ev => {
                    const start = new Date(ev.start);
                    const end = new Date(ev.end);
                    const isActive = now >= start && now <= end;
                    return (
                      <div
                        key={ev.id}
                        className={`w-full text-left rounded-lg px-2 py-1.5 border transition-colors ${
                          isActive
                            ? 'bg-cyan-900/20 border-cyan-500/40'
                            : 'bg-white/[0.03] border-white/[0.06]'
                        }`}
                      >
                        <div className="flex items-center gap-1 flex-wrap">
                          {isActive && (
                            <span className="text-[8px] font-bold bg-cyan-500 text-black rounded px-1 py-0.5 leading-none shrink-0">
                              LIVE
                            </span>
                          )}
                          <span className={`text-[11px] font-semibold leading-snug break-words ${isActive ? 'text-cyan-300' : 'text-gray-300'}`}>
                            {ev.title}
                          </span>
                        </div>
                        <span className="text-[10px] text-gray-500 mt-0.5 block">
                          {format(start, 'HH:mm')} – {format(end, 'HH:mm')}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* Right Panel: 5-Day List */}
      <div className="flex-1 flex flex-col justify-center gap-2 min-w-0 relative">
        <div className={`flex flex-col gap-2 transition-opacity duration-200 ${loading ? 'opacity-40' : 'opacity-100'}`}>
          {workDays.map(day => {
            const dayEvents = events.filter(e => isSameDay(new Date(e.start), day));
            // Sort by start time
            dayEvents.sort((a, b) => new Date(a.start) - new Date(b.start));
            
            // Get summary text
            let summaryText = '-';
            if (dayEvents.length === 1) {
              summaryText = dayEvents[0].title;
            } else if (dayEvents.length > 1) {
              summaryText = `${dayEvents[0].title} (+${dayEvents.length - 1} more)`;
            }

            const isCurrentDay = isToday(day);

            return (
              <button 
                key={day.toISOString()}
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenDayModal(employee, day, dayEvents);
                }}
                className={`flex items-center text-left w-full ${isCompact ? 'p-2' : 'p-3'} rounded-xl transition-colors group relative overflow-hidden ${
                  isCurrentDay 
                    ? 'bg-cyan-900/30 border border-cyan-500/50 hover:bg-cyan-800/40' 
                    : 'bg-[#1f2937]/50 border border-[#1f2937] hover:bg-[#374151]/80 hover:border-cyan-500/50'
                }`}
                title={`คลิกเพื่อดูรายละเอียด: ${summaryText}`}
              >
                <div className={`${isCompact ? 'w-12 text-[10px]' : 'w-16 text-xs'} shrink-0 flex flex-col font-bold uppercase tracking-widest leading-tight ${isCurrentDay ? 'text-white' : 'text-cyan-400'}`}>
                  <span>{format(day, 'EEE')}</span>
                  <span className="text-[10px] text-gray-500">{format(day, 'd/M')}</span>
                </div>
                <div className={`flex-1 truncate transition-colors font-medium min-w-0 ${isCompact ? 'text-xs' : 'text-sm'} ${isCurrentDay ? 'text-cyan-300' : 'text-gray-300 group-hover:text-white'}`}>
                  {summaryText}
                </div>
                {isCurrentDay && (
                  <div className="absolute right-3 w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></div>
                )}
              </button>
            );
          })}

          {/* Saturday & Sunday side-by-side */}
          <div className="grid grid-cols-2 gap-2 mt-1">
            {weekendDays.map(day => {
              const dayEvents = events.filter(e => isSameDay(new Date(e.start), day));
              dayEvents.sort((a, b) => new Date(a.start) - new Date(b.start));
              
              let summaryText = '-';
              if (dayEvents.length === 1) {
                summaryText = dayEvents[0].title;
              } else if (dayEvents.length > 1) {
                summaryText = `${dayEvents[0].title} (+${dayEvents.length - 1} more)`;
              }

              const isCurrentDay = isToday(day);

              return (
                <button 
                  key={day.toISOString()}
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenDayModal(employee, day, dayEvents);
                  }}
                  className={`flex items-center text-left w-full p-1.5 rounded-lg transition-colors group relative overflow-hidden ${
                    isCurrentDay 
                      ? 'bg-cyan-900/30 border border-cyan-500/50 hover:bg-cyan-800/40' 
                      : 'bg-[#1f2937]/30 border border-[#1f2937] hover:bg-[#374151]/80 hover:border-cyan-500/50'
                  }`}
                  title={`คลิกเพื่อดูรายละเอียด: ${summaryText}`}
                >
                  <div className="shrink-0 flex flex-col font-bold uppercase tracking-widest leading-none mr-2 text-[9px]">
                    <span className={isCurrentDay ? 'text-white' : 'text-purple-400'}>{format(day, 'EEE')}</span>
                    <span className="text-[8px] text-gray-500">{format(day, 'd/M')}</span>
                  </div>
                  <div className="flex-1 truncate transition-colors font-medium min-w-0 text-[10px] text-gray-400 group-hover:text-white">
                    {summaryText}
                  </div>
                  {isCurrentDay && (
                    <div className="absolute right-1.5 w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
        
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/10 rounded-xl backdrop-blur-[1px]">
            <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>

    </div>
  );
};

export default EmployeeCard;
