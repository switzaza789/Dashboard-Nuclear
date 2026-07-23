import { useState } from 'react';
import { format } from 'date-fns';
import { X, Clock, MapPin, ExternalLink, Video, Copy, Check, FileText } from 'lucide-react';

const DayEventsModal = ({ isOpen, onClose, date, events, employeeName }) => {
  const [copiedUrl, setCopiedUrl] = useState(null);

  if (!isOpen) return null;

  const formatTime = (isoString) => format(new Date(isoString), 'HH:mm');

  // Smart Description & Link Extractor
  const parseDescription = (text) => {
    if (!text) return { cleanText: '', teamsMeetingUrl: null, onlineMeetingUrl: null, otherUrls: [] };

    const urlRegex = /(https?:\/\/[^\s<>"]+)/g;
    const allUrls = text.match(urlRegex) || [];

    let teamsMeetingUrl = null;
    let onlineMeetingUrl = null;
    const otherUrls = [];

    allUrls.forEach(url => {
      if (url.includes('teams.microsoft.com')) {
        if (!teamsMeetingUrl) teamsMeetingUrl = url;
      } else if (url.includes('meet.google.com') || url.includes('zoom.us') || url.includes('webex.com')) {
        if (!onlineMeetingUrl) onlineMeetingUrl = url;
      } else {
        if (!otherUrls.includes(url)) otherUrls.push(url);
      }
    });

    // Remove messy separator lines and repetitive URL boilerplate from text
    let cleanText = text
      .replace(/_{2,}/g, '') // Remove long underscore lines ____________
      .replace(/-{3,}/g, '') // Remove long dash lines ------------
      .replace(/Need help\?.*$/gis, '') // Remove Teams help boilerplate
      .replace(/For organizers:.*$/gis, '') // Remove Teams organizer boilerplate
      .replace(/Meeting options.*$/gis, '')
      .replace(/\s{2,}/g, ' ')
      .trim();

    return { cleanText, teamsMeetingUrl, onlineMeetingUrl, otherUrls };
  };

  // Clean Location String (Remove long underscores or URL blobs)
  const formatLocation = (loc) => {
    if (!loc) return '';
    let cleanLoc = loc.replace(/_{2,}/g, '').trim();
    if (cleanLoc.includes('teams.microsoft.com')) {
      return 'Microsoft Teams Meeting';
    }
    if (cleanLoc.includes('meet.google.com')) {
      return 'Google Meet';
    }
    return cleanLoc || loc;
  };

  const handleCopy = (url) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/75 backdrop-blur-md transition-opacity"
        onClick={onClose}
      ></div>
      
      {/* Modal Content - Spacious max-w-2xl */}
      <div className="relative w-full max-w-2xl bg-[#0f172a] border border-slate-700/80 shadow-2xl rounded-2xl overflow-hidden flex flex-col max-h-[85vh] z-10">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-white mb-0.5">
              {format(date, 'EEEE, d MMMM yyyy')}
            </h2>
            <p className="text-xs sm:text-sm text-cyan-400 font-semibold flex items-center gap-1.5">
              <span>ตารางงานของ</span>
              <span className="text-white font-bold bg-cyan-950/80 border border-cyan-800/80 px-2 py-0.5 rounded-md">
                {employeeName}
              </span>
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-800 text-gray-400 hover:text-white transition-colors cursor-pointer"
            title="ปิดหน้าต่าง"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto flex-1 custom-scrollbar space-y-4">
          {events.length === 0 ? (
            <div className="text-center text-gray-400 py-12 border border-dashed border-slate-800 rounded-xl bg-slate-900/40">
              <p className="text-sm font-medium">ไม่มีรายการงานที่นัดหมายไว้ในวันนี้</p>
            </div>
          ) : (
            <div className="space-y-4">
              {events.map(event => {
                const { cleanText, teamsMeetingUrl, onlineMeetingUrl, otherUrls } = parseDescription(event.description);
                const displayLocation = formatLocation(event.location);
                
                return (
                  <div 
                    key={event.id} 
                    className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl flex flex-col gap-3 shadow-lg hover:border-slate-700 transition-all min-w-0"
                  >
                    {/* Event Title & Header */}
                    <div className="flex items-start justify-between gap-3 border-b border-slate-800/80 pb-2.5">
                      <h3 className="font-extrabold text-white text-base leading-snug break-words flex-1">
                        {event.title}
                      </h3>
                      <span className="text-xs font-mono font-bold text-cyan-300 bg-cyan-950/90 border border-cyan-800/80 px-2.5 py-1 rounded-lg shrink-0 shadow-sm">
                        {formatTime(event.start)} – {formatTime(event.end)} น.
                      </span>
                    </div>

                    {/* Event Location */}
                    {displayLocation && (
                      <div className="flex items-center gap-2 text-xs font-semibold text-amber-300 bg-amber-950/40 border border-amber-800/40 px-3 py-1.5 rounded-xl">
                        <MapPin size={14} className="shrink-0 text-amber-400" />
                        <span className="break-words truncate">{displayLocation}</span>
                      </div>
                    )}

                    {/* 📹 MS TEAMS / ONLINE MEETING BUTTON */}
                    {(teamsMeetingUrl || onlineMeetingUrl || (event.location && event.location.includes('teams.microsoft.com'))) && (
                      <div className="flex flex-col gap-2 bg-gradient-to-r from-purple-950/60 to-indigo-950/60 border border-purple-800/50 p-3 rounded-xl">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                            <Video size={15} className="text-purple-400" />
                            {(teamsMeetingUrl || event.location?.includes('teams.microsoft.com')) ? 'การประชุมผ่าน Microsoft Teams' : 'ลิงก์การประชุมออนไลน์'}
                          </span>
                          {(teamsMeetingUrl || onlineMeetingUrl) && (
                            <button
                              onClick={() => handleCopy(teamsMeetingUrl || onlineMeetingUrl)}
                              className="flex items-center gap-1 text-[11px] text-purple-300 hover:text-white bg-purple-900/80 hover:bg-purple-800 px-2 py-1 rounded-md border border-purple-700/60 transition-colors cursor-pointer shrink-0"
                              title="คัดลอกลิงก์การประชุม"
                            >
                              {copiedUrl === (teamsMeetingUrl || onlineMeetingUrl) ? (
                                <>
                                  <Check size={12} className="text-emerald-400" />
                                  <span className="text-emerald-300">คัดลอกแล้ว</span>
                                </>
                              ) : (
                                <>
                                  <Copy size={12} />
                                  <span>คัดลอกลิงก์</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                        {(teamsMeetingUrl || onlineMeetingUrl) && (
                          <a
                            href={teamsMeetingUrl || onlineMeetingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 w-full text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 py-2 px-3 rounded-xl transition-all shadow-md cursor-pointer"
                          >
                            <ExternalLink size={14} />
                            <span>เข้าร่วมการประชุม (Join Meeting)</span>
                          </a>
                        )}
                      </div>
                    )}

                    {/* 📄 FULL EVENT DESCRIPTION (แสดงรายละเอียดข้อมูลเสมอ) */}
                    {(cleanText || event.description) && (
                      <div className="flex flex-col gap-1.5 border-t border-slate-800 pt-2.5">
                        <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                          <FileText size={13} /> รายละเอียดข้อมูล:
                        </span>
                        <div className="text-xs text-gray-200 leading-relaxed break-words whitespace-pre-wrap bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 font-normal max-h-60 overflow-y-auto custom-scrollbar">
                          {cleanText || event.description}
                        </div>
                      </div>
                    )}

                    {/* Other Extracted Links */}
                    {otherUrls.length > 0 && (
                      <div className="flex flex-col gap-1.5 border-t border-slate-800 pt-2.5">
                        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">ลิงก์แนบเพิ่มเติม:</span>
                        <div className="flex flex-col gap-1.5">
                          {otherUrls.map((url, i) => (
                            <a
                              key={i}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-cyan-400 hover:text-cyan-300 hover:border-cyan-700/60 transition-all group"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <ExternalLink size={13} className="shrink-0 text-cyan-400" />
                                <span className="truncate font-mono">{url}</span>
                              </div>
                              <span className="text-[10px] text-cyan-500 group-hover:text-cyan-300 font-bold shrink-0">
                                เปิดลิงก์ ↗
                              </span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default DayEventsModal;
