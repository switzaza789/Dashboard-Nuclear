import { useEffect, useRef } from 'react';
import { AlertTriangle, X } from 'lucide-react';

const UnsavedLayoutConfirmModal = ({
  isOpen,
  onSave,
  onDiscard,
  onStay,
  isSaving = false,
}) => {
  const previousActiveElementRef = useRef(null);
  const modalRef = useRef(null);
  const saveBtnRef = useRef(null);
  const discardBtnRef = useRef(null);
  const stayBtnRef = useRef(null);

  // Focus management: Trap focus and restore focus on unmount
  useEffect(() => {
    if (isOpen) {
      // Store currently active element to restore later
      previousActiveElementRef.current = document.activeElement;
      
      // Focus the save or stay button by default
      if (saveBtnRef.current) {
        saveBtnRef.current.focus();
      }

      // Add escape key listener
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          onStay();
        } else if (e.key === 'Tab') {
          // Trap focus
          const focusableElements = [saveBtnRef.current, discardBtnRef.current, stayBtnRef.current].filter(Boolean);
          if (focusableElements.length === 0) return;

          const firstElement = focusableElements[0];
          const lastElement = focusableElements[focusableElements.length - 1];

          if (e.shiftKey) {
            // Shift + Tab
            if (document.activeElement === firstElement) {
              lastElement.focus();
              e.preventDefault();
            }
          } else {
            // Tab
            if (document.activeElement === lastElement) {
              firstElement.focus();
              e.preventDefault();
            }
          }
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        // Restore focus
        if (previousActiveElementRef.current && typeof previousActiveElementRef.current.focus === 'function') {
          previousActiveElementRef.current.focus();
        }
      };
    }
  }, [isOpen, onStay]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="unsaved-layout-modal-title"
      ref={modalRef}
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-md" 
        onClick={onStay}
      ></div>

      {/* Content */}
      <div className="relative w-full max-w-md bg-[#111827] border border-[#1f2937] shadow-2xl rounded-2xl p-6 text-center animate-in fade-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button 
          onClick={onStay} 
          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-white/10 text-gray-500 hover:text-white transition-colors"
          aria-label="Close unsaved layout modal"
          disabled={isSaving}
        >
          <X size={16} />
        </button>

        {/* Icon */}
        <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-slate-900/50 flex items-center justify-center border border-slate-700/50">
          <AlertTriangle size={32} className="text-amber-400 animate-pulse" />
        </div>

        {/* Text */}
        <h3 id="unsaved-layout-modal-title" className="text-lg font-bold text-white mb-2">
          มีตำแหน่งแดชบอร์ดที่ยังไม่ได้บันทึก
        </h3>
        <p className="text-gray-400 text-sm mb-6 leading-relaxed">
          คุณต้องการบันทึกการปรับเปลี่ยนตำแหน่งแดชบอร์ดนี้ก่อนเปลี่ยนมุมมองหรือไม่?
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            ref={saveBtnRef}
            onClick={onSave}
            disabled={isSaving}
            className="px-4 py-2 rounded-xl text-sm font-semibold border bg-cyan-600 hover:bg-cyan-500 text-white border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.2)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isSaving ? 'กำลังบันทึก...' : 'บันทึกและเปลี่ยนมุมมอง'}
          </button>
          
          <button
            type="button"
            ref={discardBtnRef}
            onClick={onDiscard}
            disabled={isSaving}
            className="px-4 py-2 bg-red-950/40 hover:bg-red-900/40 text-red-300 rounded-xl transition-colors text-sm font-semibold border border-red-900/60 disabled:opacity-50"
          >
            ละทิ้งการเปลี่ยนแปลง
          </button>
          
          <button
            type="button"
            ref={stayBtnRef}
            onClick={onStay}
            disabled={isSaving}
            className="px-4 py-2 bg-[#1f2937] hover:bg-[#374151] text-gray-300 rounded-xl transition-colors text-sm font-semibold border border-gray-700 disabled:opacity-50"
          >
            กลับไปแก้ไขต่อ
          </button>
        </div>
      </div>
    </div>
  );
};

export default UnsavedLayoutConfirmModal;
