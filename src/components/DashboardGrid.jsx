import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import DashboardModule from './DashboardModule';
import ReservedDashboardPanel from './ReservedDashboardPanel';
import VehicleDashboardPanel from './VehicleDashboardPanel';

const DashboardGrid = ({
  savedLayout,
  draftLayout,
  isEditingLayout,
  activeDrag,
  activeDropTarget,
  setActiveDrag,
  setActiveDropTarget,
  setAnnouncement,
  handleSwapOneSlot,
  handleMoveCalendar,
  handleSetSpan,
  calendarPanel,
  tapoPanel,
}) => {
  const [isStacked, setIsStacked] = useState(false);
  const [dragPosition, setDragPosition] = useState(null);
  const [keyboardActiveModuleId, setKeyboardActiveModuleId] = useState(null);
  
  const gridContainerRef = useRef(null);
  const pointerStateRef = useRef(null);

  const cleanupDrag = useCallback(() => {
    setActiveDrag(null);
    setDragPosition(null);
    setActiveDropTarget(null);
    document.body.classList.remove('is-dragging-dashboard');
    pointerStateRef.current = null;
  }, [setActiveDrag, setActiveDropTarget]);

  // Screen-width observer for responsive stacking breakpoint (1280px)
  useEffect(() => {
    const handleResize = () => {
      const stacked = window.innerWidth < 1280;
      setIsStacked(stacked);
      
      // If we go below breakpoint while editing, cancel active movements
      if (stacked && isEditingLayout) {
        setKeyboardActiveModuleId(null);
        if (pointerStateRef.current && pointerStateRef.current.handleElement) {
          try {
            pointerStateRef.current.handleElement.releasePointerCapture(pointerStateRef.current.pointerId);
          } catch {
            /* ignore capture release errors */
          }
        }
        setActiveDrag(null);
        setDragPosition(null);
        setActiveDropTarget(null);
        document.body.classList.remove('is-dragging-dashboard');
        pointerStateRef.current = null;
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isEditingLayout, setActiveDrag, setActiveDropTarget]);

  // Escape key cancels dragging and keyboard selections
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (activeDrag) {
          e.preventDefault();
          if (pointerStateRef.current && pointerStateRef.current.handleElement) {
            try {
              pointerStateRef.current.handleElement.releasePointerCapture(pointerStateRef.current.pointerId);
            } catch {
              /* ignore capture release errors */
            }
          }
          cleanupDrag();
          setAnnouncement('ย้ายตำแหน่งยกเลิกแล้ว (Movement cancelled).');
        } else if (keyboardActiveModuleId) {
          e.preventDefault();
          setKeyboardActiveModuleId(null);
          setAnnouncement('ย้ายตำแหน่งแป้นพิมพ์ยกเลิกแล้ว (Movement cancelled).');
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeDrag, keyboardActiveModuleId, setAnnouncement, cleanupDrag]);

  const activeLayout = isEditingLayout ? draftLayout : savedLayout;

  // Find module under the pointer coordinates
  const findModuleUnderPointer = (clientX, clientY) => {
    const container = gridContainerRef.current;
    if (!container) return null;
    const modules = container.querySelectorAll('[data-module-id]');
    for (const el of modules) {
      const rect = el.getBoundingClientRect();
      if (
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom
      ) {
        return el.getAttribute('data-module-id');
      }
    }
    return null;
  };

  // Pointer Event handlers
  const handlePointerDownDrag = (e, moduleId) => {
    if (isStacked) return;
    e.preventDefault();
    const handleEl = e.currentTarget;
    try {
      handleEl.setPointerCapture(e.pointerId);
    } catch {
      /* ignore pointer capture failure */
    }
    
    pointerStateRef.current = {
      pointerId: e.pointerId,
      handleElement: handleEl,
      moduleId,
    };
    
    setActiveDrag(moduleId);
    setDragPosition({ x: e.clientX, y: e.clientY });
    document.body.classList.add('is-dragging-dashboard');
    setAnnouncement(`เริ่มการเคลื่อนย้ายแผง ${moduleId}`);
  };

  const handlePointerMoveDrag = (e, moduleId) => {
    if (!activeDrag || activeDrag !== moduleId) return;
    setDragPosition({ x: e.clientX, y: e.clientY });
    
    const hoveredId = findModuleUnderPointer(e.clientX, e.clientY);
    if (!hoveredId || hoveredId === moduleId) {
      setActiveDropTarget(null);
      return;
    }
    setActiveDropTarget(hoveredId);
  };

  const handlePointerUpDrag = (e, moduleId) => {
    if (!activeDrag || activeDrag !== moduleId) return;
    
    const target = activeDropTarget;
    
    // Release pointer capture
    if (pointerStateRef.current && pointerStateRef.current.handleElement) {
      try {
        pointerStateRef.current.handleElement.releasePointerCapture(pointerStateRef.current.pointerId);
      } catch {
        /* ignore capture release errors */
      }
    }

    if (target !== null && target !== moduleId) {
      handleSwapOneSlot(moduleId, target);
      setAnnouncement(`สลับตำแหน่งแผง ${moduleId} กับ ${target} สำเร็จ`);
    }
    
    cleanupDrag();
  };

  const handlePointerCancelDrag = (e, moduleId) => {
    if (activeDrag === moduleId) {
      cleanupDrag();
      setAnnouncement('ย้ายตำแหน่งล้มเหลว (Drag cancelled).');
    }
  };

  const handleLostPointerCaptureDrag = (e, moduleId) => {
    if (activeDrag === moduleId) {
      cleanupDrag();
    }
  };

  // Keyboard Movement handlers
  const handleToggleKeyboardActive = (moduleId) => {
    if (keyboardActiveModuleId === moduleId) {
      setKeyboardActiveModuleId(null);
      setAnnouncement(`บันทึกตำแหน่งคีย์บอร์ดของแผง ${moduleId} ชั่วคราว. บันทึกบอร์ดเพื่อยืนยัน.`);
    } else {
      setKeyboardActiveModuleId(moduleId);
      const isCal = moduleId === 'calendar';
      const helpText = isCal 
        ? `เลือกย้ายปฏิทิน. ใช้ลูกศรซ้าย/ขวาเพื่อเปลี่ยนคอลัมน์. กด Enter หรือ Space เพื่อวาง, Escape เพื่อยกเลิก.`
        : `เลือกย้ายแผง ${moduleId}. ใช้ลูกศรเพื่อสลับกับแผงข้างเคียง. กด Enter หรือ Space เพื่อวาง, Escape เพื่อยกเลิก.`;
      setAnnouncement(helpText);
    }
  };

  const handleKeyboardMove = (moduleId, direction) => {
    const placements = activeLayout.placements;
    const pos = placements[moduleId];
    if (!pos) return;
    
    let targetCol = pos.column;
    let targetRow = pos.row;
    
    if (direction === 'left') targetCol -= 1;
    if (direction === 'right') targetCol += 1;
    if (direction === 'up') targetRow -= 1;
    if (direction === 'down') targetRow += 1;
    
    if (targetCol >= 1 && targetCol <= 3 && targetRow >= 1 && targetRow <= 2) {
      // Find module occupying target coordinate
      const targetId = Object.keys(placements).find(key => {
        const p = placements[key];
        return p.column === targetCol && p.row === targetRow;
      });
      
      if (targetId && targetId !== moduleId) {
        handleSwapOneSlot(moduleId, targetId);
        setAnnouncement(`สลับตำแหน่งแผง ${moduleId} กับ ${targetId} ที่คอลัมน์ ${targetCol} แถว ${targetRow}`);
      } else {
        setAnnouncement('ตำแหน่งเป้าหมายไม่ถูกต้อง');
      }
    } else {
      setAnnouncement('ไม่สามารถเคลื่อนย้ายออกนอกขอบเขตบอร์ดได้');
    }
  };

  const handleCancelKeyboard = () => {
    setKeyboardActiveModuleId(null);
    setAnnouncement('ยกเลิกการปรับตำแหน่งด้วยคีย์บอร์ด');
  };

  // Fixed React registry order rendering to prevent remounting
  const modulesRegistry = [
    { id: 'calendar', title: 'Team Schedule', panel: calendarPanel },
    { id: 'tapo', title: 'Tapo Dashboard', panel: tapoPanel },
    { id: 'reserved-3', title: 'Reserved Slot 3', panel: <ReservedDashboardPanel slotNumber={3} /> },
    { id: 'reserved-4', title: 'Reserved Slot 4', panel: <ReservedDashboardPanel slotNumber={4} /> },
    { id: 'reserved-5', title: 'Reserved Slot 5', panel: <ReservedDashboardPanel slotNumber={5} /> },
    { id: 'reserved-6', title: 'Vehicle Fleet Dashboard', panel: <VehicleDashboardPanel slotNumber={6} placement={activeLayout?.placements?.['reserved-6']} /> },
  ];

  if (isStacked) {
    // Deterministic vertical stacking order for mobile viewports (< 1280px)
    const stackedOrder = ['calendar', 'tapo', 'reserved-3', 'reserved-4', 'reserved-5', 'reserved-6'];
    
    return (
      <div className="flex flex-col gap-6 w-full px-4 py-6 overflow-y-auto">
        {isEditingLayout && (
          <div className="bg-slate-800 border border-slate-700 text-slate-300 p-3 rounded-xl text-center text-xs font-semibold">
            การจัดวางหน้าต่างสามารถทำได้ในมุมมองแบบ PC / TV เท่านั้น
          </div>
        )}
        {stackedOrder.map(id => {
          const reg = modulesRegistry.find(m => m.id === id);
          return (
            <div key={id} className="w-full min-h-[400px]">
              {reg.panel}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div ref={gridContainerRef} className="dashboard-grid relative">
      {modulesRegistry.map(reg => {
        const placement = activeLayout.placements[reg.id];
        if (!placement) return null;
        
        // Check if this module is covered by another expanded module
        let isCovered = false;
        for (const [otherId, otherPos] of Object.entries(activeLayout.placements)) {
          if (otherId === reg.id) continue;
          
          const isOtherCoveringThis = 
            placement.column >= otherPos.column &&
            placement.column < otherPos.column + otherPos.columnSpan &&
            placement.row >= otherPos.row &&
            placement.row < otherPos.row + otherPos.rowSpan;
          
          if (isOtherCoveringThis) {
            // Tie-breaker: if they start at the exact same position, let the one with larger span win
            if (otherPos.column === placement.column && otherPos.row === placement.row) {
              if (otherPos.columnSpan > placement.columnSpan) {
                isCovered = true;
                break;
              }
              if (otherPos.columnSpan === placement.columnSpan && otherId < reg.id) {
                isCovered = true;
                break;
              }
            } else {
              isCovered = true;
              break;
            }
          }
        }
        
        // Drag outline calculations
        const isDragging = activeDrag === reg.id;
        
        const isDropTarget = activeDrag === 'calendar'
          ? activeDropTarget === placement.column
          : activeDropTarget === reg.id;

        const isKeyboardActive = keyboardActiveModuleId === reg.id;

        return (
          <div 
            key={`wrapper-${reg.id}`} 
            data-module-id={reg.id}
            style={{
              gridColumnStart: placement.column,
              gridColumnEnd: placement.column + placement.columnSpan,
              gridRowStart: placement.row,
              gridRowEnd: placement.row + placement.rowSpan,
            }}
            className={`w-full h-full min-h-0 min-w-0 ${isCovered ? 'hidden' : ''}`}
          >
            <DashboardModule
              id={reg.id}
              title={reg.title}
              placement={placement}
              isEditingLayout={isEditingLayout}
              isDragging={isDragging}
              isDropTarget={isDropTarget}
              isKeyboardActive={isKeyboardActive}
              onToggleKeyboardActive={() => handleToggleKeyboardActive(reg.id)}
              onKeyboardMove={(dir) => handleKeyboardMove(reg.id, dir)}
              onCancelKeyboard={() => handleCancelKeyboard(reg.id)}
              onPointerDownDrag={handlePointerDownDrag}
              onPointerMoveDrag={handlePointerMoveDrag}
              onPointerUpDrag={handlePointerUpDrag}
              onPointerCancelDrag={handlePointerCancelDrag}
              onLostPointerCaptureDrag={handleLostPointerCaptureDrag}
              onSetSpan={(columnSpan, rowSpan) => handleSetSpan && handleSetSpan(reg.id, columnSpan, rowSpan)}
            >
              {reg.panel}
            </DashboardModule>
          </div>
        );
      })}

      {/* Lightweight drag preview ghost */}
      {activeDrag && dragPosition && (
        <div 
          className="fixed bg-[#1e293b] border border-cyan-400 text-cyan-400 text-xs px-3 py-2 rounded-xl font-bold shadow-2xl pointer-events-none z-[200] opacity-95 transform -translate-x-1/2 -translate-y-1/2"
          style={{ left: dragPosition.x, top: dragPosition.y }}
        >
          กำลังย้าย: {activeDrag === 'calendar' ? 'Team Schedule' : activeDrag === 'tapo' ? 'Tapo Dashboard' : `Reserved Slot ${activeDrag.split('-')[1]}`}
        </div>
      )}
    </div>
  );
};

export default DashboardGrid;
