import React, { useState, useEffect, useRef, useCallback, useMemo, isValidElement, cloneElement } from 'react';
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

  // Find target column for calendar drag
  const findColumnUnderPointer = (clientX) => {
    const container = gridContainerRef.current;
    if (!container) return 1;
    const rect = container.getBoundingClientRect();
    const relX = clientX - rect.left;
    const colWidth = rect.width / 3;
    const col = Math.floor(relX / colWidth) + 1;
    return Math.max(1, Math.min(2, col)); // Calendar is 2 cols, so max start is col 2
  };

  const handlePointerDownDrag = (e, moduleId) => {
    if (!isEditingLayout) return;
    e.preventDefault();
    e.stopPropagation();

    const handleEl = e.currentTarget;
    const pointerId = e.pointerId;
    
    try {
      handleEl.setPointerCapture(pointerId);
    } catch {
      /* ignore capture errors */
    }

    pointerStateRef.current = {
      pointerId,
      handleElement: handleEl,
      startX: e.clientX,
      startY: e.clientY,
      isDraggingStarted: false,
      moduleId,
    };
  };

  const handlePointerMoveDrag = (e, moduleId) => {
    if (!pointerStateRef.current || pointerStateRef.current.moduleId !== moduleId) return;
    
    const { startX, startY, isDraggingStarted } = pointerStateRef.current;
    const dist = Math.hypot(e.clientX - startX, e.clientY - startY);

    // 5px slop threshold to prevent accidental clicks
    if (!isDraggingStarted) {
      if (dist > 5) {
        pointerStateRef.current.isDraggingStarted = true;
        setActiveDrag(moduleId);
        document.body.classList.add('is-dragging-dashboard');
        setAnnouncement(`เริ่มเคลื่อนย้ายแผง ${moduleId}`);
      } else {
        return;
      }
    }

    setDragPosition({ x: e.clientX, y: e.clientY });

    if (moduleId === 'calendar') {
      const targetCol = findColumnUnderPointer(e.clientX);
      setActiveDropTarget(targetCol);
    } else {
      const targetModule = findModuleUnderPointer(e.clientX, e.clientY);
      if (targetModule && targetModule !== moduleId) {
        setActiveDropTarget(targetModule);
      } else {
        setActiveDropTarget(null);
      }
    }
  };

  const handlePointerUpDrag = (e, moduleId) => {
    if (!pointerStateRef.current || pointerStateRef.current.moduleId !== moduleId) return;

    const { handleElement, pointerId, isDraggingStarted } = pointerStateRef.current;

    if (handleElement) {
      try {
        handleElement.releasePointerCapture(pointerId);
      } catch {
        /* ignore */
      }
    }

    if (isDraggingStarted) {
      if (moduleId === 'calendar') {
        const targetCol = findColumnUnderPointer(e.clientX);
        if (targetCol) {
          handleMoveCalendar(targetCol);
          setAnnouncement(`ย้าย Team Schedule ไปที่คอลัมน์ ${targetCol}`);
        }
      } else {
        const targetModule = findModuleUnderPointer(e.clientX, e.clientY);
        if (targetModule && targetModule !== moduleId) {
          handleSwapOneSlot(moduleId, targetModule);
          setAnnouncement(`สลับตำแหน่งแผง ${moduleId} กับ ${targetModule}`);
        }
      }
    }

    cleanupDrag();
  };

  const handlePointerCancelDrag = (e, moduleId) => {
    if (!pointerStateRef.current || pointerStateRef.current.moduleId !== moduleId) return;
    cleanupDrag();
    setAnnouncement('การลากถูกยกเลิก');
  };

  const handleLostPointerCaptureDrag = (e, moduleId) => {
    if (pointerStateRef.current && pointerStateRef.current.moduleId === moduleId) {
      cleanupDrag();
    }
  };

  // Keyboard Navigation Handling
  const handleToggleKeyboardActive = (moduleId) => {
    if (!isEditingLayout) return;
    if (keyboardActiveModuleId === moduleId) {
      setKeyboardActiveModuleId(null);
      setAnnouncement(`ยกเลิกการเลือกแผง ${moduleId}`);
    } else {
      setKeyboardActiveModuleId(moduleId);
      setAnnouncement(`เลือกแผง ${moduleId} แล้ว ใช้ปุ่มลูกศรเพื่อย้ายตำแหน่ง`);
    }
  };

  const handleKeyboardMove = (moduleId, direction) => {
    if (!keyboardActiveModuleId) return;

    if (moduleId === 'calendar') {
      const currentPlacement = activeLayout.placements.calendar;
      if (direction === 'left' && currentPlacement.column > 1) {
        handleMoveCalendar(1);
        setAnnouncement('ย้าย Team Schedule ไปคอลัมน์ 1');
      } else if (direction === 'right' && currentPlacement.column < 2) {
        handleMoveCalendar(2);
        setAnnouncement('ย้าย Team Schedule ไปคอลัมน์ 2');
      }
      return;
    }

    const currentPlacement = activeLayout.placements[moduleId];
    let targetCol = currentPlacement.column;
    let targetRow = currentPlacement.row;

    if (direction === 'left') targetCol -= 1;
    if (direction === 'right') targetCol += 1;
    if (direction === 'up') targetRow -= 1;
    if (direction === 'down') targetRow += 1;

    if (targetCol >= 1 && targetCol <= 3 && targetRow >= 1 && targetRow <= 2) {
      let targetId = null;
      for (const [id, pos] of Object.entries(activeLayout.placements)) {
        if (id === moduleId) continue;
        if (pos.column === targetCol && pos.row === targetRow) {
          targetId = id;
          break;
        }
      }

      if (targetId) {
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
    { id: 'reserved-6', title: 'Vehicle Fleet Dashboard', panel: <VehicleDashboardPanel slotNumber={3} placement={activeLayout?.placements?.['reserved-6']} /> },
    { id: 'reserved-4', title: 'Reserved Slot 4', panel: <ReservedDashboardPanel slotNumber={4} /> },
    { id: 'reserved-5', title: 'Reserved Slot 5', panel: <ReservedDashboardPanel slotNumber={5} /> },
    { id: 'reserved-3', title: 'Reserved Slot 6', panel: <ReservedDashboardPanel slotNumber={6} /> },
  ];

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
              {React.isValidElement(reg.panel) ? React.cloneElement(reg.panel, { placement }) : reg.panel}
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
