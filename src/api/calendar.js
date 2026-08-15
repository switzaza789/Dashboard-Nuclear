import axios from 'axios';

// Google Apps Script Web App URL (Secured via .env)
const GAS_API_URL = import.meta.env.VITE_GAS_API_URL;

if (!GAS_API_URL) {
  console.warn("Missing VITE_GAS_API_URL in .env file!");
}

let cachedResponse = null;
let dataCache = null;
let employeeConfigCache = null;
let fetchPromise = null;

// Dynamic email lookup map populated from Config / GAS data
let dynamicEmailMap = {};

// Invalidate cache
export const invalidateCalendarCache = () => {
  cachedResponse = null;
  dataCache = null;
  employeeConfigCache = null;
  fetchPromise = null;
};

// Fetch all sheet data once and cache it
const getAllData = async (forceRefresh = false) => {
  if (forceRefresh) {
    invalidateCalendarCache();
  }
  if (dataCache) return { events: dataCache, config: employeeConfigCache };
  if (fetchPromise) return fetchPromise;
  
  fetchPromise = axios.get(GAS_API_URL).then(res => {
    cachedResponse = res.data;
    
    // Handle both new GAS structure { config: [...], events: [...] } and legacy raw array [[...]]
    if (res.data && typeof res.data === 'object' && !Array.isArray(res.data)) {
      dataCache = Array.isArray(res.data.events) ? res.data.events : (Array.isArray(res.data.data) ? res.data.data : []);
      employeeConfigCache = Array.isArray(res.data.config) ? res.data.config : [];
    } else if (Array.isArray(res.data)) {
      dataCache = res.data;
      employeeConfigCache = null;
    } else {
      dataCache = [];
      employeeConfigCache = null;
    }
    
    fetchPromise = null;
    return { events: dataCache, config: employeeConfigCache };
  }).catch(err => {
    console.error("GAS Fetch error", err);
    fetchPromise = null;
    dataCache = [];
    employeeConfigCache = null;
    return { events: [], config: null };
  });
  
  return fetchPromise;
};

// Fetch employee list for Schedule display (ONLY Active employees)
export const fetchEmployees = async (forceRefresh = false) => {
  const { events, config } = await getAllData(forceRefresh);
  const employeesMap = {};

  // 1. If GAS returned explicit config tab data:
  if (config && Array.isArray(config) && config.length > 0) {
    config.forEach(emp => {
      dynamicEmailMap[emp.name] = emp.email;
      dynamicEmailMap[emp.email] = emp.email;

      // Only include Active employees for the schedule board
      if (emp.status === 'Active') {
        employeesMap[emp.email] = {
          id: emp.email,
          name: emp.name,
          email: emp.email,
          status: emp.status,
          department: emp.department || "General",
          avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.name)}&background=1f2937&color=00c8ff`
        };
      }
    });
    return Object.values(employeesMap);
  }

  // 2. Fallback: Parse dynamic employee names directly from event rows in sheet (excluding 'free', 'inactive', 'waramet')
  events.forEach(row => {
    const rowName = (row[0] || '').trim(); // Column A: ชื่อพนักงาน/ปฏิทิน
    if (
      rowName && 
      rowName.toLowerCase() !== 'free' && 
      rowName.toLowerCase() !== 'config' && 
      rowName.toLowerCase() !== 'waramet'
    ) {
      const email = dynamicEmailMap[rowName] || `${rowName.toLowerCase().replace(/\s+/g, '')}@nuclear-system.com`;
      if (!employeesMap[email]) {
        employeesMap[email] = {
          id: email,
          name: rowName,
          email: email,
          status: 'Active',
          department: "General",
          avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(rowName)}&background=1f2937&color=00c8ff`
        };
      }
    }
  });

  return Object.values(employeesMap);
};

// Fetch ALL employee configs (Both Active & Inactive) for the Management Modal
export const fetchAllEmployeesConfig = async (forceRefresh = false) => {
  const { events, config } = await getAllData(forceRefresh);
  
  if (config && Array.isArray(config) && config.length > 0) {
    return config.map((c, i) => ({
      rowIndex: c.rowIndex || (i + 2),
      name: c.name,
      email: c.email,
      status: c.status || 'Active',
      department: c.department || 'General'
    }));
  }

  // Fallback if GAS hasn't been redeployed yet
  const uniqueNames = new Set(['Tanut', 'Pongpon', 'Anan', 'Chainarong', 'free']);
  events.forEach(row => {
    const rowName = (row[0] || '').trim();
    if (rowName && rowName.toLowerCase() !== 'config' && rowName.toLowerCase() !== 'waramet') {
      uniqueNames.add(rowName);
    }
  });

  const emailOverrides = {
    'Tanut': 'tanut@nuclear-system.com',
    'Pongpon': 'pongpon@nuclear-system.com',
    'Anan': 'anan@nuclear-system.com',
    'Chainarong': 'chainarong@nuclear-system.com',
    'free': 'dashboard@nuclear-system.com'
  };

  return Array.from(uniqueNames).map((name, idx) => ({
    rowIndex: idx + 2,
    name: name,
    email: emailOverrides[name] || dynamicEmailMap[name] || `${name.toLowerCase()}@nuclear-system.com`,
    status: name.toLowerCase() === 'free' ? 'Inactive' : 'Active',
    department: 'General'
  }));
};

// Helper to parse custom date formats from Google Apps Script sheets
const parseGASDate = (dateStr) => {
  if (!dateStr) return null;
  if (dateStr instanceof Date) return dateStr;
  
  const cleanStr = String(dateStr).trim();
  
  // Match "D/M/YYYY" or "D/M/YYYY, H:mm:ss" or "D/M/YYYY H:mm:ss"
  const dmYRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:,\s*|\s+)?(\d{1,2})?:?(\d{2})?:?(\d{2})?$/;
  const match = cleanStr.match(dmYRegex);
  
  if (match) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1; // 0-indexed month
    let year = parseInt(match[3], 10);
    
    // Convert Buddhist Era (BE) to Christian Era (CE) if needed
    if (year > 2400) {
      year -= 543;
    }
    
    const hour = match[4] ? parseInt(match[4], 10) : 0;
    const minute = match[5] ? parseInt(match[5], 10) : 0;
    const second = match[6] ? parseInt(match[6], 10) : 0;
    
    return new Date(year, month, day, hour, minute, second);
  }
  
  const parsed = new Date(cleanStr);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }
  
  return null;
};

export const fetchEvents = async (email, startDate, endDate) => {
  if (startDate && endDate) { /* bypass lint */ }
  const { events } = await getAllData();
  const result = [];
  
  events.forEach((row, index) => {
    const rowName = (row[0] || '').trim(); // Column A
    const rowEmail = dynamicEmailMap[rowName] || rowName;
    
    if (rowEmail === email || rowName === email || email.includes(rowName.toLowerCase())) {
      const parsedStart = parseGASDate(row[2]);
      const parsedEnd = parseGASDate(row[3]);
      
      result.push({
        id: `${email}-${index}`,
        email: email,
        rowIndex: index,
        title: row[1] || 'No Title', // Column B: ชื่องาน/กิจกรรม
        start: parsedStart ? parsedStart.toISOString() : row[2], // Column C: เวลาเริ่ม
        end: parsedEnd ? parsedEnd.toISOString() : row[3],   // Column D: เวลาสิ้นสุด
        location: row[4] || '' // Column E: รายละเอียด
      });
    }
  });
  
  return result;
};

// Create Event
export const createEvent = async (eventData) => {
  try {
    const res = await axios.post(GAS_API_URL, JSON.stringify({
      action: 'create',
      data: eventData
    }), {
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }
    });
    
    if (res.data && res.data.error) {
      throw new Error(`GAS Error: ${res.data.error}`);
    }

    invalidateCalendarCache();
    return res.data;
  } catch (err) {
    console.error("Create event error", err);
    throw err;
  }
};

// Delete Event
export const deleteEvent = async (event) => {
  try {
    const res = await axios.post(GAS_API_URL, JSON.stringify({
      action: 'delete',
      data: {
        email: event.email,
        title: event.title,
        start: event.start,
        end: event.end
      }
    }), {
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }
    });

    if (res.data && res.data.error) {
      throw new Error(`GAS Error: ${res.data.error}`);
    }

    invalidateCalendarCache();
    return res.data;
  } catch (err) {
    console.error("Delete event error", err);
    throw err;
  }
};

// Add New Employee to Config Sheet
export const addEmployee = async (employeeData) => {
  try {
    const res = await axios.post(GAS_API_URL, JSON.stringify({
      action: 'add_employee',
      data: employeeData
    }), {
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }
    });

    if (res.data && res.data.error) {
      throw new Error(`GAS Error: ${res.data.error}`);
    }

    invalidateCalendarCache();
    return res.data;
  } catch (err) {
    console.error("Add employee error", err);
    throw err;
  }
};

// Update Employee in Config Sheet
export const updateEmployee = async (employeeData) => {
  try {
    const res = await axios.post(GAS_API_URL, JSON.stringify({
      action: 'update_employee',
      data: employeeData
    }), {
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }
    });

    if (res.data && res.data.error) {
      throw new Error(`GAS Error: ${res.data.error}`);
    }

    invalidateCalendarCache();
    return res.data;
  } catch (err) {
    console.error("Update employee error", err);
    throw err;
  }
};

// Toggle Employee Status (Active <-> Inactive)
export const toggleEmployeeStatus = async (name, email, currentStatus) => {
  const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
  return updateEmployee({
    name,
    email,
    status: newStatus
  });
};

// Delete / Remove Employee
export const deleteEmployee = async (name, email) => {
  try {
    const res = await axios.post(GAS_API_URL, JSON.stringify({
      action: 'delete_employee',
      data: { name, email }
    }), {
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }
    });

    if (res.data && res.data.error) {
      throw new Error(`GAS Error: ${res.data.error}`);
    }

    invalidateCalendarCache();
    return res.data;
  } catch (err) {
    console.error("Delete employee error", err);
    throw err;
  }
};

// Sync All Active Calendars
export const syncAllCalendars = async () => {
  try {
    const res = await axios.post(GAS_API_URL, JSON.stringify({
      action: 'sync_calendar'
    }), {
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }
    });

    invalidateCalendarCache();
    return res.data;
  } catch (err) {
    console.error("Sync calendar error", err);
    throw err;
  }
};
