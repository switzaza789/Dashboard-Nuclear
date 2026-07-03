import { useState, useEffect } from 'react';
import { GripVertical, Layout } from 'lucide-react';

const DashboardModule = ({
  id,
  title,
  placement,
  isEditingLayout,
  isDragging,
  isDropTarget,
  isKeyboardActive,
  onToggleKeyboardActive,
  onKeyboardMove,
  onCancelKeyboard,
  onPointerDownDrag,
  onPointerMoveDrag,
  onPointerUpDrag,
  onPointerCancelDrag,
  onLostPointerCaptureDrag,
  onSetSpan,
  children,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    if (!isMenuOpen) return;
    const handleClose = () => setIsMenuOpen(false);
    window.addEventListener('click', handleClose);
    return () => window.removeEventListener('click', handleClose);
  }, [isMenuOpen]);

  // Grid styles mapped directly from placements
  const gridStyle = {
    gridColumnStart: placement.column,
    gridColumnEnd: placement.column + placement.columnSpan,
    gridRowStart: placement.row,
    gridRowEnd: placement.row + placement.rowSpan,
  };

  // Keyboard navigation event handler
  const handleKeyDown = (e) => {
    if (!isEditingLayout) return;

    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      onToggleKeyboardActive();
    } else if (isKeyboardActive) {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        onKeyboardMove('left');
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        onKeyboardMove('right');
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        onKeyboardMove('up');
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        onKeyboardMove('down');
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onCancelKeyboard();
      }
    }
  };

  return (
    <div
      style={gridStyle}
      className={`group relative min-w-0 min-h-0 h-full w-full rounded-2xl transition-all duration-200 flex flex-col ${
        isDragging ? 'opacity-35 scale-[0.98] border-2 border-dashed border-cyan-500/50 shadow-inner' : ''
      } ${
        isDropTarget ? 'ring-2 ring-dashed ring-cyan-400 ring-offset-2 ring-offset-[#030712]' : ''
      } ${
        isKeyboardActive ? 'ring-2 ring-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.4)] z-10' : ''
      }`}
    >
      {/* Dynamic Sizing Dropdown Button */}
      <div className={`absolute top-2 z-[70] ${isEditingLayout ? 'right-12' : 'right-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-200'}`}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsMenuOpen(!isMenuOpen);
          }}
          className="p-1.5 bg-[#1e293b]/95 hover:bg-slate-700 text-gray-400 hover:text-cyan-400 rounded-lg border border-gray-700 hover:border-gray-600 transition-all shadow-md cursor-pointer flex items-center justify-center"
          title="ปรับขนาดแผงควบคุม"
        >
          <Layout size={13} />
        </button>
        
        {isMenuOpen && (
          <div className="absolute right-0 mt-1 bg-[#1e293b] border border-gray-700 rounded-xl py-1 shadow-xl min-w-[140px] z-[80]">
            <div className="px-3 py-1 text-[10px] font-bold text-gray-500 uppercase border-b border-gray-800 mb-1">
              เลือกขนาดแผง
            </div>
            {[
              { label: '1 x 1 ช่องปกติ', col: 1, row: 1, allowed: true },
              { label: '2 x 1 แนวนอน', col: 2, row: 1, allowed: placement.column <= 2 },
              { label: '1 x 2 แนวตั้ง', col: 1, row: 2, allowed: placement.row <= 1 },
              { label: '2 x 2 ใหญ่ (4 ช่อง)', col: 2, row: 2, allowed: placement.column <= 2 && placement.row <= 1 },
            ].map(opt => {
              const isActive = placement.columnSpan === opt.col && placement.rowSpan === opt.row;
              return (
                <button
                  key={`${opt.col}-${opt.row}`}
                  disabled={!opt.allowed}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!opt.allowed) return;
                    onSetSpan && onSetSpan(opt.col, opt.row);
                    setIsMenuOpen(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-xs transition-colors flex items-center justify-between ${
                    !opt.allowed
                      ? 'text-gray-600 cursor-not-allowed bg-slate-900/10'
                      : isActive 
                        ? 'bg-cyan-950/40 text-cyan-400 font-semibold cursor-pointer' 
                        : 'text-gray-300 hover:bg-slate-800 hover:text-white cursor-pointer'
                  }`}
                >
                  <span className={!opt.allowed ? 'opacity-30 line-through' : ''}>{opt.label}</span>
                  {isActive && <div className="w-1.5 h-1.5 rounded-full bg-cyan-400"></div>}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {isEditingLayout && (
        <div className="absolute top-2 right-2 z-[60] flex items-center bg-[#1e293b]/95 border border-[#334155] rounded-xl px-1.5 py-1 shadow-lg select-none">
          {isKeyboardActive && (
            <span className="text-[9px] text-cyan-400 font-bold uppercase tracking-wider animate-pulse mr-1">
              กดลูกศรเพื่อย้าย
            </span>
          )}
          <button
            tabIndex={0}
            aria-label={`ย้ายตำแหน่งแผง ${title}. กด Space หรือ Enter เพื่อเริ่มขยับบอร์ด`}
            aria-describedby={`keyboard-instruction-${id}`}
            onKeyDown={handleKeyDown}
            onPointerDown={(e) => onPointerDownDrag && onPointerDownDrag(e, id)}
            onPointerMove={(e) => onPointerMoveDrag && onPointerMoveDrag(e, id)}
            onPointerUp={(e) => onPointerUpDrag && onPointerUpDrag(e, id)}
            onPointerCancel={(e) => onPointerCancelDrag && onPointerCancelDrag(e, id)}
            onLostPointerCapture={(e) => onLostPointerCaptureDrag && onLostPointerCaptureDrag(e, id)}
            style={{ touchAction: 'none' }} // Prevents touch scrolling on drag handle
            className={`drag-handle cursor-move p-1.5 rounded-lg text-gray-400 hover:text-cyan-400 transition-colors focus:outline-none focus:ring-1 focus:ring-cyan-500 ${
              isKeyboardActive ? 'text-cyan-400 bg-cyan-950/20' : 'hover:bg-slate-700/50'
            }`}
          >
            <GripVertical size={16} />
          </button>
          
          <span id={`keyboard-instruction-${id}`} className="sr-only">
            Focused on drag handle. Press Enter or Space to initiate keyboard sorting. Use Arrow keys to move the panel, Enter or Space to commit, and Escape to cancel.
          </span>
        </div>
      )}

      {/* Module Content */}
      <div className="flex-1 min-w-0 min-h-0 h-full w-full relative">
        {children}
      </div>
    </div>
  );
};

export default DashboardModule;
