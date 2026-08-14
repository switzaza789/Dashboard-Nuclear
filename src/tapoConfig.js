export const CONFIG = {
  // Spreadsheet ID
  spreadsheetId: "1dEbB0LVzPFMpFaiC2--kLx43RLiWZleh0nzCL4MGVtg",
  // Optional sheet tab name for dynamic device list configuration
  configSheetName: "Config_Devices",
  // List of rooms with their specific colors (Default / Fallback)
  rooms: [
    {
      id: "meddevice_room",
      sheetName: "MedDevice Room",
      name: "MedDevice Room",
      color: "#c084fc", // Purple
      icon: "💊",
      tempRange: [20, 30],
      humRange: [40, 70]
    },
    {
      id: "coldkit_room",
      sheetName: "ColdKit Room",
      name: "ColdKit Room",
      color: "#ef4444", // Red
      icon: "❄️",
      tempRange: [20, 30], // [Min, Max]
      humRange: [40, 70]
    },
    {
      id: "coldkit_fridge1",
      sheetName: "ColdKit Fridge 1",
      name: "ColdKit Fridge 1",
      color: "#38bdf8", // Blue
      icon: "🧊",
      tempRange: [2, 8],
      humRange: [40, 80]
    },
    {
      id: "coldkit_fridge2",
      sheetName: "ColdKit Fridge 2",
      name: "ColdKit Fridge 2",
      color: "#4ade80", // Green
      icon: "🧊",
      tempRange: [2, 8],
      humRange: [40, 80]
    },
    {
      id: "haier",
      sheetName: "haier",
      name: "Haier",
      color: "#f59e0b", // Amber/Orange
      icon: "🧊",
      tempRange: [2, 8],
      humRange: [40, 80]
    },
    {
      id: "cold_freezer",
      sheetName: "Cold Freezer",
      name: "Cold Freezer",
      color: "#06b6d4", // Cyan
      icon: "🥶",
      tempRange: [-25, -15],
      humRange: [30, 80]
    }
  ],
  refreshIntervalMs: 60000, // อัปเดตทุกๆ 1 นาที
};
