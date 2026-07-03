import { useState, useMemo } from 'react';
import {
  getDefaultDashboardLayout,
  getSwappedDashboardLayout,
  validateDashboardLayout,
  areDashboardLayoutsEqual,
  getDashboardLayoutKind,
  swapOneSlotModules,
  moveCalendarToColumn,
} from '../utils/dashboardLayout';
import { loadStoredDashboardLayout, saveDashboardLayout } from '../utils/dashboardLayoutStorage';

export const useDashboardLayout = (onShowToast) => {
  // Saved layout loaded from storage on mount
  const [savedLayout, setSavedLayout] = useState(() => {
    const res = loadStoredDashboardLayout();
    if (res.warning && onShowToast) {
      // In V1, we log/show fallback notifications when useful
      console.warn(`Dashboard layout load warning: ${res.warning}`);
    }
    return res.layout;
  });

  // Draft layout for Edit Mode
  const [draftLayout, setDraftLayout] = useState(null);
  const [isEditingLayout, setIsEditingLayout] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Transition coordination states
  const [pendingViewMode, setPendingViewMode] = useState(null);
  const [isExitConfirmationOpen, setIsExitConfirmationOpen] = useState(false);

  // Temporary Drag & Drop pointer / keyboard state
  const [activeDrag, setActiveDrag] = useState(null);
  const [activeDropTarget, setActiveDropTarget] = useState(null);
  
  // Announcement state for accessibility screen-readers
  const [announcement, setAnnouncement] = useState('');

  // Derived isDirty: compares coordinates of draft and saved layout (ignoring UI states)
  const isDirty = useMemo(() => {
    if (!isEditingLayout || !draftLayout) return false;
    return !areDashboardLayoutsEqual(draftLayout, savedLayout);
  }, [isEditingLayout, draftLayout, savedLayout]);

  const startEditing = () => {
    setDraftLayout(JSON.parse(JSON.stringify(savedLayout)));
    setIsEditingLayout(true);
    setAnnouncement('Entered layout customization mode. Use drag handles or keyboard to move panels.');
  };

  const cancelEditing = () => {
    setDraftLayout(null);
    setIsEditingLayout(false);
    setActiveDrag(null);
    setActiveDropTarget(null);
    setAnnouncement('Layout customization cancelled. Unsaved changes discarded.');
  };

  const resetToDefault = () => {
    setDraftLayout(getDefaultDashboardLayout());
    setAnnouncement('Draft layout reset to default. Save Layout to apply.');
  };

  const saveLayout = async () => {
    if (!draftLayout) return { success: false, error: 'NO_DRAFT' };
    
    const valResult = validateDashboardLayout(draftLayout);
    if (!valResult.valid) {
      const errMessage = `Invalid layout configuration: ${valResult.reason}`;
      if (onShowToast) onShowToast(errMessage, 'error');
      setAnnouncement(`Failed to save: ${valResult.reason}`);
      return { success: false, error: valResult.reason };
    }

    setIsSaving(true);
    const saveResult = saveDashboardLayout(draftLayout);
    
    if (saveResult.success) {
      setSavedLayout(draftLayout);
      setIsEditingLayout(false);
      setDraftLayout(null);
      setIsSaving(false);
      if (onShowToast) onShowToast('Dashboard layout saved successfully!', 'success');
      setAnnouncement('Layout saved and applied.');
      return { success: true };
    } else {
      setIsSaving(false);
      const errMsg = `Save failed: ${saveResult.error}`;
      if (onShowToast) onShowToast(errMsg, 'error');
      setAnnouncement(`Layout save failed: ${saveResult.error}`);
      return { success: false, error: saveResult.error };
    }
  };

  // Preset swap triggers immediate update and persistence when not in Edit Mode
  const applySwapPreset = async () => {
    if (isEditingLayout) return; // Disabled in Edit Mode
    
    const currentKind = getDashboardLayoutKind(savedLayout);
    if (currentKind === 'custom') {
      // Custom layouts cannot use simple Swap Preset
      return;
    }

    const nextLayout = currentKind === 'default'
      ? getSwappedDashboardLayout()
      : getDefaultDashboardLayout();

    const saveResult = saveDashboardLayout(nextLayout);
    if (saveResult.success) {
      setSavedLayout(nextLayout);
      if (onShowToast) onShowToast('Layout swapped successfully!', 'success');
    } else {
      const errMsg = `Swap preset save failed: ${saveResult.error}`;
      if (onShowToast) onShowToast(errMsg, 'error');
    }
  };

  // Immutable move methods for draftLayout updates
  const handleSwapOneSlot = (sourceId, targetId) => {
    if (!isEditingLayout || !draftLayout) return;
    if (sourceId === targetId) return; // No-op
    
    const nextLayout = swapOneSlotModules(draftLayout, sourceId, targetId);
    setDraftLayout(nextLayout);
  };

  const handleMoveCalendar = (targetColumn) => {
    if (!isEditingLayout || !draftLayout) return;
    if (draftLayout.placements.calendar.column === targetColumn) return; // No-op
    
    const nextLayout = moveCalendarToColumn(draftLayout, targetColumn);
    setDraftLayout(nextLayout);
  };

  // View-mode change transition gates
  const requestViewModeChange = (newViewMode) => {
    if (isEditingLayout && isDirty) {
      setPendingViewMode(newViewMode);
      setIsExitConfirmationOpen(true);
      return false; // Block view transition
    }
    return true; // Proceed with view transition
  };

  const confirmSaveAndContinue = async () => {
    const saveResult = await saveLayout();
    if (saveResult.success) {
      const nextMode = pendingViewMode;
      setPendingViewMode(null);
      setIsExitConfirmationOpen(false);
      return { proceed: true, viewMode: nextMode };
    }
    return { proceed: false };
  };

  const confirmDiscardAndContinue = () => {
    const nextMode = pendingViewMode;
    cancelEditing();
    setPendingViewMode(null);
    setIsExitConfirmationOpen(false);
    return { proceed: true, viewMode: nextMode };
  };

  const stayInEditMode = () => {
    setPendingViewMode(null);
    setIsExitConfirmationOpen(false);
    return { proceed: false };
  };

  const handleSetSpan = (moduleId, columnSpan, rowSpan) => {
    if (isEditingLayout && draftLayout) {
      const nextLayout = JSON.parse(JSON.stringify(draftLayout));
      if (nextLayout.placements[moduleId]) {
        nextLayout.placements[moduleId].columnSpan = columnSpan;
        nextLayout.placements[moduleId].rowSpan = rowSpan;
        setDraftLayout(nextLayout);
      }
    } else {
      const nextLayout = JSON.parse(JSON.stringify(savedLayout));
      if (nextLayout.placements[moduleId]) {
        nextLayout.placements[moduleId].columnSpan = columnSpan;
        nextLayout.placements[moduleId].rowSpan = rowSpan;
        
        const saveResult = saveDashboardLayout(nextLayout);
        if (saveResult.success) {
          setSavedLayout(nextLayout);
        }
      }
    }
  };

  return {
    savedLayout,
    draftLayout,
    isEditingLayout,
    isDirty,
    isSaving,
    activeDrag,
    activeDropTarget,
    announcement,
    pendingViewMode,
    isExitConfirmationOpen,
    
    // Actions
    startEditing,
    cancelEditing,
    resetToDefault,
    saveLayout,
    applySwapPreset,
    handleSwapOneSlot,
    handleMoveCalendar,
    handleSetSpan,
    setActiveDrag,
    setActiveDropTarget,
    setAnnouncement,
    
    // Transition modals
    requestViewModeChange,
    confirmSaveAndContinue,
    confirmDiscardAndContinue,
    stayInEditMode,
  };
};
