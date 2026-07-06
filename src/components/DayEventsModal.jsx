import { format } from 'date-fns';
import { X, Clock, MapPin, Link } from 'lucide-react';

const DayEventsModal = ({ isOpen, onClose, date, events, employeeName }) => {
  if (!isOpen) return null;

  const formatTime = (isoString) => format(new Date(isoString), 'h:mm a');

  // Strip URLs from description text and extract them separately
  const parseDescription = (text) => {
    if (!text) return { cleanText: '', urls: [] };
    const urlRegex = /(https?:\/\/[^\s<>]+)/g;
    const urls = text.match(urlRegex) || [];
    const cleanText = text
      .replace(urlRegex, '')
      .replace(/_{2,}/g, '') // remove long underscores used as dividers
      .replace(/\s{2,}/g, ' ')
      .trim();
    return { cleanText, urls };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      ></div>
      
      {/* Modal Content */}
      <div className="relative w-full max-w-lg bg-[#111827] border border-[#1f2937] shadow-2xl rounded-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-6 border-b border-[#1f2937] flex items-center justify-between bg-[#1f2937]/30">
          <div>
            <h2 className="text-xl font-bold text-white mb-1">
              {format(date, 'EEEE, MMMM d, yyyy')}
            </h2>
            <p className="text-sm text-cyan-400 font-medium">
              Schedule for {employeeName}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          {events.length === 0 ? (
            <div className="text-center text-gray-500 py-10 border border-dashed border-[#374151] rounded-xl">
              No events scheduled for this day.
            </div>
          ) : (
            <div className="space-y-4">
              {events.map(event => {
                const { cleanText, urls } = parseDescription(event.description);
                return (
                      <div key={event.id} className="p-4 bg-[#1f2937] border border-[#374151] rounded-xl flex flex-col gap-2 min-w-0 overflow-hidden">
                    {/* Title */}
                    <h3 className="font-bold text-white text-base leading-snug break-words">{event.title}</h3>

                    {/* Time */}
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <Clock size={14} className="text-cyan-400 shrink-0" />
                      <span>{formatTime(event.start)} - {formatTime(event.end)}</span>
                    </div>

                    {/* Location */}
                    {event.location && (
                      <div className="flex items-start gap-2 text-sm text-gray-400">
                        <MapPin size={14} className="text-cyan-400 shrink-0 mt-0.5" />
                        <span className="break-words">{event.location}</span>
                      </div>
                    )}

                    {/* Clean description text (no URLs) */}
                    {cleanText && (
                      <p className="text-xs text-gray-500 leading-relaxed break-words whitespace-pre-wrap border-t border-[#374151]/50 pt-2 mt-1">
                        {cleanText}
                      </p>
                    )}

                    {/* Extracted links */}
                    {urls.length > 0 && (
                      <div className="flex flex-col gap-1 border-t border-[#374151]/50 pt-2 mt-1 min-w-0 overflow-hidden">
                        {urls.map((url, i) => (
                          <a
                            key={i}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-start gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 hover:underline break-all min-w-0"
                            title={url}
                          >
                            <Link size={11} className="shrink-0" />
                            <span className="break-all min-w-0">{url.length > 60 ? url.substring(0, 60) + '…' : url}</span>
                          </a>
                        ))}
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
