import { useState, useEffect, useRef } from 'react';
import { format, isSameDay, addDays, isToday, startOfWeek } from 'date-fns';
import { Clock, Calendar as CalendarIcon } from 'lucide-react';
import { fetchEvents } from '../api/calendar';
import { determineEmployeeStatus } from '../utils/employeeStatus';

const EmployeeCard = ({ employee, currentDate, onOpenDayModal, onOpenEmployeeModal, onOpenEditProfileModal }) => {
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

  const status = determineEmployeeStatus(employee, events, new Date());
  const statusText = status.text;

  const statusColor = {
    red: 'text-red-300 bg-red-950/90 border-red-500/80 shadow-red-950/50',
    blue: 'text-blue-300 bg-blue-950/90 border-blue-500/80 shadow-blue-950/50',
    pink: 'text-pink-300 bg-pink-950/90 border-pink-500/80 shadow-pink-950/50',
    amber: 'text-amber-300 bg-amber-950/90 border-amber-500/80 shadow-amber-950/50',
    emerald: 'text-emerald-300 bg-emerald-950/90 border-emerald-500/80 shadow-emerald-950/50',
  }[status.color] || 'text-emerald-300 bg-emerald-950/90 border-emerald-500/80 shadow-emerald-950/50';

  const isLiveNow = status.isLiveNow;

  let avatarBorderColor = '#06b6d4';
  if (isLiveNow || status.source !== 'default') {
    if (statusColor.includes('red')) avatarBorderColor = '#f87171';
    else if (statusColor.includes('blue')) avatarBorderColor = '#60a5fa';
    else if (statusColor.includes('pink')) avatarBorderColor = '#f472b6';
    else if (statusColor.includes('amber')) avatarBorderColor = '#fbbf24';
    else if (statusColor.includes('emerald')) avatarBorderColor = '#34d399';
  }

  return (
    <div className="flex flex-col sm:flex-row bg-[#0f172a]/95 rounded-2xl border border-slate-800 p-3 shadow-xl hover:border-cyan-500/50 transition-all duration-200 relative overflow-hidden backdrop-blur-sm gap-3 min-w-0 h-full min-h-0 justify-between items-stretch">
      
      {/* 👈 LEFT SIDEBAR: AVATAR PHOTO (80px) + FLOATING STATUS + TODAY'S EVENTS */}
      <div className="flex flex-col items-center justify-between sm:w-44 shrink-0 pb-2 sm:pb-0 sm:pr-3 border-b sm:border-b-0 sm:border-r border-slate-800/80 gap-2 text-center">
        
        {/* Hidden file input for avatar upload */}
        <input
          ref={avatarFileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleAvatarUpload}
        />

        {/* 1. Avatar Photo with FLOATING STATUS BADGE ON IMAGE */}
        <div className="flex flex-col items-center gap-1 w-full shrink-0">
          <div 
            className="relative w-18 h-18 sm:w-20 sm:h-20 shrink-0 cursor-pointer group/avatar my-0.5"
            title="คลิกเพื่อเปลี่ยนรูปโปรไฟล์"
            onClick={(e) => {
              e.stopPropagation();
              avatarFileRef.current?.click();
            }}
          >
            <div 
              className="w-full h-full rounded-full p-1 transition-all overflow-hidden border-2 shadow-lg bg-slate-900"
              style={{ borderColor: avatarBorderColor }}
            >
              <img 
                src={employee.avatarUrl || `https://ui-avatars.com/api/?name=${employee.name}&background=1f2937&color=fff`} 
                alt={employee.name}
                className="w-full h-full rounded-full object-cover bg-slate-800 group-hover/avatar:scale-105 transition-transform duration-300"
              />
            </div>

            {/* FLOATING STATUS BADGE ON IMAGE */}
            <div className={`absolute -bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full border text-[9px] font-bold ${statusColor} backdrop-blur-md shadow-lg whitespace-nowrap max-w-[95%] truncate flex items-center gap-1 z-10`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse shrink-0" />
              <span className="truncate">{statusText}</span>
            </div>

            {isLiveNow && (
              <span className="absolute top-0.5 right-0.5 w-3 h-3 rounded-full bg-cyan-400 border-2 border-slate-900 animate-ping shadow-[0_0_8px_#06b6d4]" />
            )}
          </div>

          {/* Employee Name */}
          <h2 className="text-sm font-extrabold text-white uppercase tracking-wider truncate w-full mt-0.5">
            {employee.name}
          </h2>
        </div>

        {/* 🕒 งานวันนี้ อยู่ใต้ชื่อการ์ดพนักงาน */}
        <div className="w-full bg-slate-900/90 p-2 rounded-xl border border-slate-800 flex flex-col gap-1 text-left min-w-0 flex-1 justify-between min-h-0 my-0.5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-0.5 shrink-0">
            <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1">
              <Clock size={11} /> งานวันนี้
            </span>
            <span className="text-[9px] bg-slate-800 text-cyan-300 font-mono px-1 py-0.2 rounded font-bold border border-slate-700">
              {status.todayEvents.length}
            </span>
          </div>

          {status.todayEvents.length === 0 ? (
            <div className="py-2 text-center text-[10px] text-gray-500 font-medium italic my-auto">
              ไม่มีงานวันนี้
            </div>
          ) : (
            <div className="flex flex-col gap-1 overflow-y-auto custom-scrollbar pr-0.5 flex-1 min-h-0">
              {status.todayEvents.map(ev => {
                const now = new Date();
                const start = new Date(ev.start);
                const end = new Date(ev.end);
                const isActive = now >= start && now <= end;
                return (
                  <div
                    key={ev.id}
                    className={`p-1 rounded-lg border text-left flex flex-col gap-0.5 ${
                      isActive
                        ? 'bg-cyan-950/90 border-cyan-500/80 text-cyan-100 shadow-sm font-bold'
                        : 'bg-slate-800/70 border-slate-700/60 text-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] font-bold truncate">{ev.title}</span>
                      {isActive && (
                        <span className="text-[7.5px] font-extrabold bg-cyan-400 text-black px-1 py-0.2 rounded leading-none shrink-0">
                          LIVE
                        </span>
                      )}
                    </div>
                    <span className="text-[8.5px] text-gray-400 font-mono">
                      {format(start, 'HH:mm')} – {format(end, 'HH:mm')} น.
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Schedule Action Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenEmployeeModal(employee, events);
          }}
          className="w-full flex items-center justify-center gap-1 text-[11px] text-cyan-300 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-700/60 rounded-xl py-1 font-bold transition-all shrink-0 cursor-pointer shadow-sm"
          title="ดูตารางงานทั้งสัปดาห์"
        >
          <CalendarIcon size={12} />
          <span>ดูตารางสัปดาห์</span>
        </button>
      </div>

      {/* 👉 RIGHT AREA: 📅 DEDICATED 7-DAY FULLY READABLE CALENDAR SCHEDULE TABLE (ALL 7 DAYS VISIBLE AT A GLANCE) */}
      <div className="flex-1 flex flex-col gap-1.5 min-w-0 justify-between h-full min-h-0">
        <div className="flex items-center justify-between px-0.5 pb-0.5 border-b border-slate-800 shrink-0">
          <span className="text-xs font-bold text-gray-200 uppercase tracking-wider flex items-center gap-1.5">
            <CalendarIcon size={13} className="text-cyan-400" /> ตารางปฏิทินสัปดาห์นี้
          </span>
        </div>

        {/* 5 Work Days Rows (MON to FRI) */}
        <div className="flex flex-col gap-1 flex-1 justify-between min-h-0">
          {workDays.map(day => {
            const dayEvents = events.filter(e => isSameDay(new Date(e.start), day));
            dayEvents.sort((a, b) => new Date(a.start) - new Date(b.start));
            
            let summaryText = '-';
            if (dayEvents.length === 1) {
              summaryText = dayEvents[0].title;
            } else if (dayEvents.length > 1) {
              summaryText = `${dayEvents[0].title} (+${dayEvents.length - 1} งานอื่น)`;
            }

            const isCurrentDay = isToday(day);

            return (
              <button 
                key={day.toISOString()}
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenDayModal(employee, day, dayEvents);
                }}
                className={`flex items-center justify-between text-left px-3 py-1.5 rounded-xl border transition-all cursor-pointer group flex-1 ${
                  isCurrentDay 
                    ? 'bg-cyan-950/90 border-cyan-500/90 text-cyan-100 font-bold shadow-md' 
                    : 'bg-slate-900/90 border-slate-800 hover:bg-slate-800 hover:border-slate-700 text-gray-200'
                }`}
                title={`คลิกเพื่อดูรายละเอียด: ${summaryText}`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <span className={`text-xs font-mono font-bold uppercase w-13 shrink-0 ${isCurrentDay ? 'text-cyan-300' : 'text-cyan-400'}`}>
                    {format(day, 'EEE d/M')}
                  </span>
                  <span className={`text-xs sm:text-[12.5px] truncate font-semibold ${isCurrentDay ? 'text-white font-extrabold' : 'text-gray-100 group-hover:text-cyan-300'}`}>
                    {summaryText}
                  </span>
                </div>

                {isCurrentDay && (
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shrink-0 ml-1 shadow-[0_0_8px_#06b6d4]" />
                )}
              </button>
            );
          })}

          {/* Saturday & Sunday Side-by-Side Row (ALWAYS VISIBLE AT BOTTOM) */}
          <div className="grid grid-cols-2 gap-1.5 shrink-0 pt-0.5">
            {weekendDays.map(day => {
              const dayEvents = events.filter(e => isSameDay(new Date(e.start), day));
              dayEvents.sort((a, b) => new Date(a.start) - new Date(b.start));
              
              let summaryText = '-';
              if (dayEvents.length === 1) {
                summaryText = dayEvents[0].title;
              } else if (dayEvents.length > 1) {
                summaryText = `${dayEvents[0].title} (+${dayEvents.length - 1})`;
              }

              const isCurrentDay = isToday(day);

              return (
                <button 
                  key={day.toISOString()}
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenDayModal(employee, day, dayEvents);
                  }}
                  className={`flex items-center justify-between text-left px-2.5 py-1 rounded-lg border text-[11px] transition-all cursor-pointer ${
                    isCurrentDay 
                      ? 'bg-cyan-950/90 border-cyan-500/80 text-cyan-200 font-bold shadow-sm' 
                      : 'bg-slate-900/80 border-slate-800/80 text-gray-300 hover:text-white'
                  }`}
                >
                  <span className="font-mono font-bold text-gray-400 mr-1 shrink-0">{format(day, 'EEE d/M')}</span>
                  <span className="truncate flex-1 font-medium">{summaryText}</span>
                </button>
              );
            })}
          </div>
        </div>

      </div>

    </div>
  );
};

export default EmployeeCard;
