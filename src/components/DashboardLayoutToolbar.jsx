import { Settings, Save, X, RotateCcw, ArrowRightLeft } from 'lucide-react';

const DashboardLayoutToolbar = ({
  isEditingLayout,
  isDirty,
  isSaving,
  onStartEdit,
  onSave,
  onCancel,
  onReset,
  onApplySwapPreset,
  layoutKind,
}) => {
  if (!isEditingLayout) {
    const isSwapDisabled = layoutKind === 'custom';
    
    return (
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onApplySwapPreset}
          disabled={isSwapDisabled}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
            isSwapDisabled
              ? 'bg-gray-800 border-gray-700 text-gray-500 cursor-not-allowed'
              : 'bg-[#1f2937]/50 border-gray-700 text-cyan-400 hover:text-white hover:bg-gray-700'
          }`}
          title={isSwapDisabled ? 'Swap Preset is unavailable with custom layouts. Reset to default to enable.' : 'สลับฝั่งแผงควบคุม (Swap Preset)'}
          aria-label={isSwapDisabled ? 'Swap Preset unavailable' : 'Swap Preset'}
        >
          <ArrowRightLeft size={14} />
          <span>สลับฝั่ง Preset</span>
        </button>

        <button
          onClick={onStartEdit}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] border border-cyan-400/50 cursor-pointer"
          aria-label="Customize dashboard layout"
        >
          <Settings size={14} />
          <span>ปรับแต่งบอร์ด</span>
        </button>
      </div>
    );
  }

  return (
    <div className="w-full bg-[#1e293b]/90 border-b border-[#334155] px-6 py-2 flex items-center justify-between z-30 animate-in slide-in-from-top-4 duration-200 shrink-0">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
        <span className="text-xs font-bold text-white uppercase tracking-wider">
          โหมดปรับแต่งบอร์ด (Layout Customization)
        </span>
        {isDirty && (
          <span className="text-[10px] bg-cyan-900/40 text-cyan-400 px-2 py-0.5 rounded-full border border-cyan-500/20">
            ยังไม่ได้บันทึก
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onReset}
          className="flex items-center gap-1 px-3 py-1.5 bg-[#1f2937] hover:bg-slate-700 text-gray-300 rounded-xl transition-colors text-xs font-semibold border border-gray-700 cursor-pointer"
          aria-label="Reset layout to default"
        >
          <RotateCcw size={12} />
          <span>ค่าเริ่มต้น</span>
        </button>

        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-1 px-3 py-1.5 bg-[#1f2937] hover:bg-red-950/40 text-gray-300 hover:text-red-300 rounded-xl transition-colors text-xs font-semibold border border-gray-700 hover:border-red-900/60 cursor-pointer"
          aria-label="Cancel customization"
        >
          <X size={12} />
          <span>ยกเลิก</span>
        </button>

        <button
          type="button"
          onClick={onSave}
          disabled={!isDirty || isSaving}
          className={`flex items-center gap-1 px-4 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
            isDirty && !isSaving
              ? 'bg-cyan-600 hover:bg-cyan-500 text-white border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
              : 'bg-gray-800 border-gray-700 text-gray-500 cursor-not-allowed'
          }`}
          aria-label="Save layout changes"
        >
          <Save size={12} />
          <span>{isSaving ? 'กำลังบันทึก...' : 'บันทึกบอร์ด'}</span>
        </button>
      </div>
    </div>
  );
};

export default DashboardLayoutToolbar;
