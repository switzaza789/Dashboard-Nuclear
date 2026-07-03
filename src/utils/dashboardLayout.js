export const getDefaultDashboardLayout = () => ({
  version: 1,
  placements: {
    calendar: { column: 1, row: 1, columnSpan: 1, rowSpan: 1 },
    'reserved-5': { column: 1, row: 2, columnSpan: 1, rowSpan: 1 },
    'reserved-3': { column: 2, row: 1, columnSpan: 1, rowSpan: 1 },
    'reserved-4': { column: 2, row: 2, columnSpan: 1, rowSpan: 1 },
    tapo: { column: 3, row: 1, columnSpan: 1, rowSpan: 1 },
    'reserved-6': { column: 3, row: 2, columnSpan: 1, rowSpan: 1 },
  },
});

export const getSwappedDashboardLayout = () => ({
  version: 1,
  placements: {
    tapo: { column: 1, row: 1, columnSpan: 1, rowSpan: 1 },
    'reserved-6': { column: 1, row: 2, columnSpan: 1, rowSpan: 1 },
    'reserved-3': { column: 2, row: 1, columnSpan: 1, rowSpan: 1 },
    'reserved-4': { column: 2, row: 2, columnSpan: 1, rowSpan: 1 },
    calendar: { column: 3, row: 1, columnSpan: 1, rowSpan: 1 },
    'reserved-5': { column: 3, row: 2, columnSpan: 1, rowSpan: 1 },
  },
});

export const validateDashboardLayout = (layout) => {
  if (!layout || typeof layout !== 'object') {
    return { valid: false, reason: 'INVALID_OBJECT' };
  }
  if (layout.version !== 1) {
    return { valid: false, reason: 'UNSUPPORTED_VERSION' };
  }
  if (!layout.placements || typeof layout.placements !== 'object') {
    return { valid: false, reason: 'MISSING_PLACEMENTS' };
  }

  const requiredModules = ['calendar', 'tapo', 'reserved-3', 'reserved-4', 'reserved-5', 'reserved-6'];
  const placements = layout.placements;

  // Check required modules exist
  for (const modId of requiredModules) {
    if (!placements[modId]) {
      return { valid: false, reason: `MISSING_MODULE_${modId.toUpperCase().replace('-', '_')}` };
    }
  }

  // Check for overlaps and grid boundary based on start cells
  // 3 columns x 2 rows grid
  const cells = [
    [null, null], // col 1: [row 1, row 2]
    [null, null], // col 2: [row 1, row 2]
    [null, null], // col 3: [row 1, row 2]
  ];

  for (const [modId, pos] of Object.entries(placements)) {
    const { column, row, columnSpan, rowSpan } = pos;

    if (!Number.isInteger(column) || !Number.isInteger(row) || 
        !Number.isInteger(columnSpan) || !Number.isInteger(rowSpan)) {
      return { valid: false, reason: `NON_INTEGER_COORDINATES_${modId.toUpperCase().replace('-', '_')}` };
    }

    if (column < 1 || column > 3 || row < 1 || row > 2) {
      return { valid: false, reason: `OUT_OF_BOUNDS_${modId.toUpperCase().replace('-', '_')}` };
    }

    // Allow columnSpan to be 1 or 2, rowSpan to be 1 or 2.
    if (columnSpan < 1 || columnSpan > 2 || rowSpan < 1 || rowSpan > 2) {
      return { valid: false, reason: `INVALID_SPAN_${modId.toUpperCase().replace('-', '_')}` };
    }

    // Set cells occupation for start position (to ensure swap/drag-drop validation is correct)
    if (cells[column - 1][row - 1] !== null) {
      return { valid: false, reason: `OVERLAPPING_CELLS_AT_${column}_${row}` };
    }
    cells[column - 1][row - 1] = modId;
  }

  // Ensure all 6 cells have a start cell
  for (let c = 0; c < 3; c++) {
    for (let r = 0; r < 2; r++) {
      if (cells[c][r] === null) {
        return { valid: false, reason: `UNOCCUPIED_CELL_AT_${c + 1}_${r + 1}` };
      }
    }
  }

  return { valid: true };
};

export const areDashboardLayoutsEqual = (layoutA, layoutB) => {
  if (!layoutA || !layoutB) return false;
  if (layoutA.version !== layoutB.version) return false;
  
  const placementsA = layoutA.placements;
  const placementsB = layoutB.placements;
  
  const keysA = Object.keys(placementsA);
  const keysB = Object.keys(placementsB);
  
  if (keysA.length !== keysB.length) return false;
  
  for (const key of keysA) {
    const posA = placementsA[key];
    const posB = placementsB[key];
    if (!posB) return false;
    if (posA.column !== posB.column ||
        posA.row !== posB.row ||
        posA.columnSpan !== posB.columnSpan ||
        posA.rowSpan !== posB.rowSpan) {
      return false;
    }
  }
  
  return true;
};

export const getDashboardLayoutKind = (layout) => {
  if (areDashboardLayoutsEqual(layout, getDefaultDashboardLayout())) {
    return 'default';
  }
  if (areDashboardLayoutsEqual(layout, getSwappedDashboardLayout())) {
    return 'swapped';
  }
  return 'custom';
};

export const swapOneSlotModules = (layout, sourceId, targetId) => {
  const placements = { ...layout.placements };
  const sourcePos = placements[sourceId];
  const targetPos = placements[targetId];
  
  if (!sourcePos || !targetPos) return layout;
  
  // Create new positions
  placements[sourceId] = { ...targetPos };
  placements[targetId] = { ...sourcePos };
  
  return {
    ...layout,
    placements,
  };
};

export const moveCalendarToColumn = (layout, targetColumn) => {
  if (targetColumn < 1 || targetColumn > 3) return layout;
  
  const placements = { ...layout.placements };
  const currentCalendarCol = placements.calendar.column;
  
  if (currentCalendarCol === targetColumn) return layout;
  
  // Find the two modules currently in targetColumn (they must be one-slot modules since Calendar is in currentCalendarCol)
  const displacedModules = [];
  for (const [modId, pos] of Object.entries(placements)) {
    if (modId !== 'calendar' && pos.column === targetColumn) {
      displacedModules.push({ id: modId, pos: { ...pos } });
    }
  }
  
  if (displacedModules.length !== 2) return layout;
  
  // Set Calendar to targetColumn
  placements.calendar = {
    column: targetColumn,
    row: 1,
    columnSpan: 1,
    rowSpan: 2,
  };
  
  // Move displaced modules to currentCalendarCol, preserving their rows
  displacedModules.forEach(mod => {
    placements[mod.id] = {
      column: currentCalendarCol,
      row: mod.pos.row,
      columnSpan: 1,
      rowSpan: 1,
    };
  });
  
  return {
    ...layout,
    placements,
  };
};
