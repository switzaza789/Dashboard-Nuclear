import { useState, useEffect, useMemo } from 'react';
import Papa from 'papaparse';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { Thermometer, Droplets, Clock, Expand, Minimize2, X, Settings, Check, Maximize2 } from 'lucide-react';
import { CONFIG } from '../tapoConfig';
import './tapoDashboard.css';

// 100% Custom React Legend (Rendered outside Recharts completely to avoid SVG disappearing bugs)
const CustomLegend = ({ payload, onHover, type, isTwoColumns = false }) => {
  if (!payload || payload.length === 0) return null;
  
  return (
    <div className={`custom-legend w-full mb-1 ${isTwoColumns ? 'grid grid-cols-2 gap-1 sm:gap-1.5' : 'flex flex-col gap-1'}`}>
      {payload.map((entry, index) => {
        const valText = type === 'temp' ? entry.latestTemp : entry.latestHum;
        const displayName = entry.name.toLowerCase() === 'haier' ? 'Haier' : entry.name;
        return (
          <div 
            key={`item-${index}`} 
            className="custom-legend-item px-2.5 py-1 rounded-xl border flex items-center justify-between gap-1.5 text-[11px] font-bold cursor-pointer transition-all w-full shrink-0"
            onMouseEnter={() => onHover && onHover(entry.id)}
            onMouseLeave={() => onHover && onHover(null)}
            style={{ 
              boxShadow: entry.isHovered ? `0 0 12px ${entry.color}` : 'none',
              borderColor: entry.isHovered ? entry.color : 'rgba(255, 255, 255, 0.12)',
              backgroundColor: entry.isHovered ? 'rgba(255, 255, 255, 0.12)' : 'rgba(15, 23, 42, 0.75)',
              transform: entry.isHovered ? 'scale(1.01)' : 'none'
            }}
          >
            <span style={{ color: entry.color }} className="font-bold flex items-center gap-1.5 truncate text-[11px]">
              <span className="shrink-0 text-xs">{entry.icon}</span> 
              <span className="truncate">{displayName}:</span>
            </span>
            <span className="legend-axis text-white font-extrabold text-[12px] tracking-wide shrink-0 ml-auto font-mono">
              {valText} {type === 'temp' ? '°C' : '%'}
            </span>
          </div>
        );
      })}
    </div>
  );
};

// Helper to parse Config_Devices CSV from Google Sheet
function parseConfigDevicesCSV(csvText) {
  try {
    const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
    if (!parsed.data || parsed.data.length === 0) return null;

    const defaultColors = ['#c084fc', '#ef4444', '#38bdf8', '#4ade80', '#f59e0b', '#06b6d4', '#ec4899', '#8b5cf6', '#14b8a6', '#f97316'];
    const defaultIcons = ['💊', '❄️', '🧊', '🧊', '🧊', '🥶', '🌡️', '🏠', '📦', '🔬'];

    const devices = [];
    parsed.data.forEach((row, idx) => {
      const keys = Object.keys(row);
      const findKey = (...aliases) => {
        const found = keys.find(k => aliases.some(a => k.trim().toLowerCase() === a.toLowerCase() || k.trim().toLowerCase().includes(a.toLowerCase())));
        return found ? row[found] : undefined;
      };

      const rawSheetName = findKey('sheetname', 'sheet_name', 'sheet', 'ชื่อแท็บ', 'แท็บ', 'tab');
      const rawName = findKey('name', 'devicename', 'device_name', 'ชื่ออุปกรณ์', 'ชื่อ');
      const sheetName = (rawSheetName || rawName || '').trim();
      if (!sheetName) return;

      const rawId = findKey('id', 'device_id', 'deviceid', 'รหัส');
      const id = (rawId || sheetName.toLowerCase().replace(/[^a-z0-9_]/g, '_')).trim();

      const name = (rawName || sheetName).trim();
      const color = (findKey('color', 'สี', 'hex') || defaultColors[idx % defaultColors.length]).trim();
      const icon = (findKey('icon', 'ไอคอน', 'สัญลักษณ์') || defaultIcons[idx % defaultIcons.length]).trim();

      const minTempRaw = findKey('mintemp', 'min_temp', 'tempmin', 'temp_min', 'อุณหภูมิต่ำสุด', 'min temp');
      const maxTempRaw = findKey('maxtemp', 'max_temp', 'tempmax', 'temp_max', 'อุณหภูมิสูงสุด', 'max temp');
      const minHumRaw = findKey('minhum', 'min_hum', 'hummin', 'hum_min', 'ความชื้นต่ำสุด', 'min hum');
      const maxHumRaw = findKey('maxhum', 'max_hum', 'hummax', 'hum_max', 'ความชื้นสูงสุด', 'max hum');

      const minTemp = minTempRaw !== undefined && minTempRaw !== '' && !isNaN(Number(minTempRaw)) ? Number(minTempRaw) : 2;
      const maxTemp = maxTempRaw !== undefined && maxTempRaw !== '' && !isNaN(Number(maxTempRaw)) ? Number(maxTempRaw) : 8;
      const minHum = minHumRaw !== undefined && minHumRaw !== '' && !isNaN(Number(minHumRaw)) ? Number(minHumRaw) : 40;
      const maxHum = maxHumRaw !== undefined && maxHumRaw !== '' && !isNaN(Number(maxHumRaw)) ? Number(maxHumRaw) : 80;

      devices.push({
        id,
        sheetName,
        name,
        color,
        icon,
        tempRange: [minTemp, maxTemp],
        humRange: [minHum, maxHum]
      });
    });

    return devices.length > 0 ? devices : null;
  } catch (e) {
    console.warn('Could not parse Config_Devices CSV:', e);
    return null;
  }
}

// Helper to parse date string into timestamp & formatted time
function parseTapoDate(rawTime) {
  if (!rawTime) return { timestamp: null, rawDate: '', time: '' };
  const cleanTime = String(rawTime).trim().replace(/\s+/g, ' ');
  let parsedDate = new Date(cleanTime);

  if (isNaN(parsedDate.getTime())) {
    // Format: MM/DD/YYYY HH:mm or DD/MM/YYYY HH:mm
    const m = cleanTime.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{4})\s+(\d{1,2}):(\d{1,2}):?(\d{1,2})?/);
    if (m) {
      let d = new Date(Number(m[3]), Number(m[1]) - 1, Number(m[2]), Number(m[4]), Number(m[5]), Number(m[6] || 0));
      if (!isNaN(d.getTime())) {
        parsedDate = d;
      }
    }
  }

  const valid = !isNaN(parsedDate.getTime());
  return {
    timestamp: valid ? parsedDate.getTime() : null,
    rawDate: cleanTime,
    time: valid ? parsedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : cleanTime
  };
}

export default function TapoDashboard({ 
  viewMode, 
  displayMode = 'full', 
  isTvMode = false, 
  onToggleFullscreen,
  placement = { columnSpan: 1, rowSpan: 1 } 
}) {
  const [rooms, setRooms] = useState(CONFIG.rooms);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Controls state
  const [timeFilter, setTimeFilter] = useState('1h');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [hoveredRoom, setHoveredRoom] = useState(null);
  const [expandedChart, setExpandedChart] = useState(null); // 'temp' | 'hum' | null
  
  const [visibleRooms, setVisibleRooms] = useState(
    CONFIG.rooms.reduce((acc, room) => ({...acc, [room.id]: true}), {})
  );
  const [showSettingsPopover, setShowSettingsPopover] = useState(false);

  // Determine active spans based on displayMode and placement
  const colSpan = displayMode === 'full' ? 2 : (placement?.columnSpan || 1);
  const rowSpan = displayMode === 'full' ? 2 : (placement?.rowSpan || 1);

  // Layout size modes (1x1, 2x1, 1x2, 2x2)
  const is2x2 = (colSpan >= 2 && rowSpan >= 2) || displayMode === 'full';
  const is2x1 = colSpan >= 2 && rowSpan === 1 && displayMode !== 'full';
  const is1x2 = colSpan === 1 && rowSpan >= 2 && displayMode !== 'full';
  const is1x1 = colSpan === 1 && rowSpan === 1 && displayMode !== 'full';

  // Chart visibility rules: 2x2 and 1x2 show charts; 1x1 and 2x1 hide charts (unless expanded)
  const showCharts = is2x2 || is1x2;
  const isTwoColumnsLegend = is2x2;

  useEffect(() => {
    if (!showSettingsPopover) return;
    const handleClose = () => setShowSettingsPopover(false);
    window.addEventListener('click', handleClose);
    return () => window.removeEventListener('click', handleClose);
  }, [showSettingsPopover]);

  const toggleRoom = (roomId) => {
    setVisibleRooms(prev => ({...prev, [roomId]: !prev[roomId]}));
  };

  useEffect(() => {
    let intervalId;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // 1. Try to fetch dynamic room list from Config_Devices tab
        let currentRooms = CONFIG.rooms;
        const configTabName = CONFIG.configSheetName || 'Config_Devices';
        const configUrl = `https://docs.google.com/spreadsheets/d/${CONFIG.spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(configTabName)}`;

        try {
          const configRes = await new Promise((resolve) => {
            Papa.parse(configUrl, {
              download: true,
              header: true,
              skipEmptyLines: true,
              complete: (results) => resolve(results),
              error: () => resolve(null)
            });
          });

          if (configRes && configRes.data && configRes.data.length > 0) {
            const parsedDevices = parseConfigDevicesCSV(Papa.unparse(configRes.data));
            if (parsedDevices && parsedDevices.length > 0) {
              currentRooms = parsedDevices;
            }
          }
        } catch {
          currentRooms = CONFIG.rooms;
        }

        setRooms(currentRooms);
        setVisibleRooms(prev => {
          const updated = { ...prev };
          currentRooms.forEach(r => {
            if (updated[r.id] === undefined) {
              updated[r.id] = true;
            }
          });
          return updated;
        });

        const samplingMs = (CONFIG.samplingIntervalSeconds || 60) * 1000;

        // 2. Fetch all rooms data in parallel
        const fetchPromises = currentRooms.map(room => {
          const url = `https://docs.google.com/spreadsheets/d/${CONFIG.spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(room.sheetName)}`;
          
          return new Promise((resolve) => {
            Papa.parse(url, {
              download: true,
              header: true,
              skipEmptyLines: true,
              complete: (results) => {
                const rawRows = results.data || [];
                // Slice recent rows for performance
                const recentRows = rawRows.length > 600 ? rawRows.slice(-600) : rawRows;

                const roomData = recentRows.map(row => {
                  const keys = Object.keys(row);
                  const values = Object.values(row);
                  const findVal = (...aliases) => {
                    const k = keys.find(key => aliases.some(a => key.toLowerCase().includes(a.toLowerCase())));
                    return k ? row[k] : undefined;
                  };

                  const rawTime = (findVal('วัน', 'time', 'date', 'เวลา') || values[0] || '').trim();
                  const rawTemp = (findVal('อุณหภูมิ', 'temp', 'temperature') || values[1] || '').trim();
                  const rawHum = (findVal('ความชื้น', 'hum', 'humidity') || values[2] || '').trim();

                  const { timestamp, rawDate, time } = parseTapoDate(rawTime);
                  if (!timestamp) return null;

                  const numTemp = parseFloat(String(rawTemp).replace(/[^\d.-]/g, ''));
                  const numHum = parseFloat(String(rawHum).replace(/[^\d.-]/g, ''));

                  return {
                    timestamp,
                    rawDate,
                    time,
                    temp: !isNaN(numTemp) ? numTemp : null,
                    hum: !isNaN(numHum) ? numHum : null,
                  };
                }).filter(item => item !== null && item.timestamp !== null);

                resolve({ roomId: room.id, data: roomData });
              },
              error: () => resolve({ roomId: room.id, data: [] })
            });
          });
        });

        const allRoomsData = await Promise.all(fetchPromises);
        
        // Merge room data by timestamp bucket
        const timeMap = new Map();
        
        allRoomsData.forEach(({ roomId, data: rData }) => {
          rData.forEach(item => {
            const roundedTime = Math.floor(item.timestamp / samplingMs) * samplingMs;
            
            if (!timeMap.has(roundedTime)) {
              timeMap.set(roundedTime, {
                timestamp: roundedTime,
                time: item.time,
                rawDate: item.rawDate,
              });
            }
            const record = timeMap.get(roundedTime);
            if (item.temp !== null) record[`${roomId}_temp`] = item.temp;
            if (item.hum !== null) record[`${roomId}_hum`] = item.hum;
          });
        });

        const mergedData = Array.from(timeMap.values()).sort((a, b) => a.timestamp - b.timestamp);
        setData(mergedData);
      } catch (err) {
        console.error('Fetch Tapo Error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const intervalMs = (CONFIG.refreshIntervalSeconds || 60) * 1000;
    intervalId = setInterval(fetchData, intervalMs);

    return () => clearInterval(intervalId);
  }, []);

  // Filter Data according to timeFilter
  const filteredData = useMemo(() => {
    if (data.length === 0) return data;
    
    if (timeFilter === 'custom') {
      let filtered = data;
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        filtered = filtered.filter(item => item.timestamp >= start.getTime());
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filtered = filtered.filter(item => item.timestamp <= end.getTime());
      }
      return filtered;
    }
    
    if (timeFilter === 'all') return data;
    
    const latestTimestamp = data[data.length - 1].timestamp;
    let cutoff = 0;
    if (timeFilter === '1h') cutoff = 60 * 60 * 1000;
    else if (timeFilter === '3h') cutoff = 3 * 60 * 60 * 1000;
    else if (timeFilter === '6h') cutoff = 6 * 60 * 60 * 1000;
    else if (timeFilter === '24h') cutoff = 24 * 60 * 60 * 1000;
    
    const minTimestamp = latestTimestamp - cutoff;
    const result = data.filter(item => item.timestamp >= minTimestamp);
    return result.length > 0 ? result : data; // Fallback to all data if filter yields 0
  }, [data, timeFilter, startDate, endDate]);

  const latestValues = useMemo(() => {
    const latest = {};
    const dataSource = filteredData.length > 0 ? filteredData : data;

    rooms.forEach(room => {
      latest[room.id] = { 
        temp: '--', hum: '--', tempTrend: 0, humTrend: 0, isAlert: false, tempAlert: false, humAlert: false,
        tempMax: '--', tempMin: '--', tempAvg: '--',
        humMax: '--', humMin: '--', humAvg: '--'
      };
      
      let lastTemp = null, prevTemp = null;
      let lastHum = null, prevHum = null;
      
      let tMax = -Infinity, tMin = Infinity, tSum = 0, tCount = 0;
      let hMax = -Infinity, hMin = Infinity, hSum = 0, hCount = 0;
      
      for (let i = dataSource.length - 1; i >= 0; i--) {
        const row = dataSource[i];
        const temp = row[`${room.id}_temp`];
        const hum = row[`${room.id}_hum`];
        
        if (temp != null && !isNaN(temp)) {
          if (lastTemp === null) lastTemp = temp;
          else if (prevTemp === null) prevTemp = temp;
          
          if (temp > tMax) tMax = temp;
          if (temp < tMin) tMin = temp;
          tSum += temp;
          tCount++;
        }
        
        if (hum != null && !isNaN(hum)) {
          if (lastHum === null) lastHum = hum;
          else if (prevHum === null) prevHum = hum;
          
          if (hum > hMax) hMax = hum;
          if (hum < hMin) hMin = hum;
          hSum += hum;
          hCount++;
        }
      }
      
      if (lastTemp !== null) {
        latest[room.id].temp = lastTemp.toFixed(1);
        if (prevTemp !== null) {
          latest[room.id].tempTrend = lastTemp > prevTemp ? 1 : (lastTemp < prevTemp ? -1 : 0);
        }
        if (room.tempRange) {
          if (lastTemp < room.tempRange[0] || lastTemp > room.tempRange[1]) {
            latest[room.id].isAlert = true;
            latest[room.id].tempAlert = true;
          }
        }
      }
      if (tCount > 0) {
        latest[room.id].tempMax = tMax.toFixed(1);
        latest[room.id].tempMin = tMin.toFixed(1);
        latest[room.id].tempAvg = (tSum / tCount).toFixed(1);
      }

      if (lastHum !== null) {
        latest[room.id].hum = lastHum.toFixed(1);
        if (prevHum !== null) {
          latest[room.id].humTrend = lastHum > prevHum ? 1 : (lastHum < prevHum ? -1 : 0);
        }
        if (room.humRange) {
          if (lastHum < room.humRange[0] || lastHum > room.humRange[1]) {
            latest[room.id].isAlert = true;
            latest[room.id].humAlert = true;
          }
        }
      }
      if (hCount > 0) {
        latest[room.id].humMax = hMax.toFixed(1);
        latest[room.id].humMin = hMin.toFixed(1);
        latest[room.id].humAvg = (hSum / hCount).toFixed(1);
      }
    });
    return latest;
  }, [filteredData, data, rooms]);

  // Payload for Custom Legend
  const legendPayload = useMemo(() => {
    return rooms
      .filter(room => visibleRooms[room.id])
      .map(room => ({
        id: room.id,
        name: room.name || room.sheetName,
        color: room.color,
        icon: room.icon,
        latestTemp: latestValues[room.id]?.temp ?? '--',
        latestHum: latestValues[room.id]?.hum ?? '--',
        isHovered: hoveredRoom === room.id
      }));
  }, [rooms, visibleRooms, latestValues, hoveredRoom]);

  const { tempTicks, humTicks } = useMemo(() => {
    let globalTempMin = Infinity;
    let globalTempMax = -Infinity;
    let globalHumMin = Infinity;
    let globalHumMax = -Infinity;

    Object.entries(latestValues).forEach(([roomId, stats]) => {
      if (visibleRooms[roomId]) {
        if (stats.tempMin !== 'N/A' && stats.tempMin !== '--') {
          globalTempMin = Math.min(globalTempMin, parseFloat(stats.tempMin));
        }
        if (stats.tempMax !== 'N/A' && stats.tempMax !== '--') {
          globalTempMax = Math.max(globalTempMax, parseFloat(stats.tempMax));
        }
        if (stats.humMin !== 'N/A' && stats.humMin !== '--') {
          globalHumMin = Math.min(globalHumMin, parseFloat(stats.humMin));
        }
        if (stats.humMax !== 'N/A' && stats.humMax !== '--') {
          globalHumMax = Math.max(globalHumMax, parseFloat(stats.humMax));
        }
      }
    });

    const tTicks = [];
    if (globalTempMin !== Infinity && globalTempMax !== -Infinity) {
      const span = globalTempMax - globalTempMin;
      const step = span > 40 ? 5 : (span > 20 ? 4 : 2);
      const start = Math.floor(globalTempMin / step) * step;
      const end = Math.ceil(globalTempMax / step) * step;
      for (let i = start; i <= end; i += step) {
        tTicks.push(i);
      }
    }

    const hTicks = [];
    if (globalHumMin !== Infinity && globalHumMax !== -Infinity) {
      const start = Math.floor(globalHumMin / 10) * 10;
      const end = Math.ceil(globalHumMax / 10) * 10;
      for (let i = start; i <= end; i += 10) {
        hTicks.push(i);
      }
    }

    return { tempTicks: tTicks, humTicks: hTicks };
  }, [latestValues, visibleRooms]);

  const latestTimeStr = useMemo(() => {
    const dataSource = filteredData.length > 0 ? filteredData : data;
    if (dataSource.length === 0) return 'N/A';
    const last = dataSource[dataSource.length - 1];
    return last.rawDate || last.time || 'N/A';
  }, [filteredData, data]);

  if (loading && data.length === 0) {
    return (
      <div className="tapo-dashboard-container flex items-center justify-center p-6 text-cyan-400 font-mono text-xs">
        <Clock size={16} className="animate-spin mr-2" /> กำลังโหลดข้อมูล Tapo Dashboard จาก Google Sheets...
      </div>
    );
  }

  if (error && data.length === 0) {
    return (
      <div className="tapo-dashboard-container flex items-center justify-center p-6 text-rose-400 font-mono text-xs">
        ข้อผิดพลาด: {error}
      </div>
    );
  }

  let leftAxisColor = "var(--text-muted)";
  let leftAxisFilter = "none";
  let leftAxisWeight = "normal";

  if (hoveredRoom) {
    const hoveredRoomConfig = rooms.find(r => r.id === hoveredRoom);
    if (hoveredRoomConfig) {
      if (!hoveredRoom.includes('fridge') && !hoveredRoom.includes('freezer')) {
        leftAxisColor = hoveredRoomConfig.color;
        leftAxisFilter = `drop-shadow(0px 0px 8px ${hoveredRoomConfig.color})`;
        leftAxisWeight = "bold";
      }
    }
  }

  // Dynamic grid container class: side-by-side (2 columns) across all layout sizes
  const getGridClass = () => {
    if (expandedChart) return 'flex flex-col flex-1 min-h-0 overflow-hidden';
    return 'grid grid-cols-2 gap-2.5 flex-1 min-h-0 overflow-y-auto custom-scrollbar';
  };

  return (
    <div className={`tapo-dashboard-container w-full h-full flex flex-col min-w-0 min-h-0 overflow-hidden ${viewMode === 'split' ? 'is-split-view' : ''} ${displayMode === 'compact' ? 'is-compact-mode' : ''} ${is1x1 ? 'is-layout-1x1' : ''} ${is2x1 ? 'is-layout-2x1' : ''} ${is1x2 ? 'is-layout-1x2' : ''} ${is2x2 ? 'is-layout-2x2' : ''}`}>
      <div className="dashboard-content flex flex-col flex-1 min-h-0 w-full">
        {/* Top Header */}
        <div className="dashboard-header flex items-center justify-between px-2 py-1 border-b border-gray-800/40 mb-1.5 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="text-xs sm:text-sm font-bold text-gray-200 truncate m-0">Tapo Central Dashboard</h2>
            {latestTimeStr !== 'N/A' && (
              <span className="px-1.5 py-0.5 rounded-md bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 text-[9.5px] font-bold font-mono shadow-sm flex items-center gap-1 shrink-0">
                <Clock size={10} className="text-cyan-400" />
                <span className="truncate">อัปเดต: {latestTimeStr}</span>
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowSettingsPopover(true);
              }}
              className="p-1 bg-slate-800/80 hover:bg-slate-700 border border-slate-700/80 hover:border-cyan-500/50 rounded-lg text-cyan-400 hover:text-white transition-all shadow-sm flex items-center justify-center cursor-pointer"
              title="ตั้งค่าช่วงเวลาและการกรองห้อง"
            >
              <Settings size={13} />
            </button>
            {onToggleFullscreen && (
              <button 
                onClick={onToggleFullscreen}
                className="p-1 bg-slate-800/80 hover:bg-slate-700 border border-slate-700/80 hover:border-cyan-500/50 rounded-lg text-cyan-400 hover:text-white transition-all shadow-sm flex items-center justify-center cursor-pointer"
                title={viewMode === 'tapo' ? "ย่อหน้าต่างกลับเป็นแบบแยกจอ" : "ขยาย Tapo Dashboard เต็มจอ"}
              >
                {viewMode === 'tapo' ? <Minimize2 size={13} /> : <Expand size={13} />}
              </button>
            )}
          </div>
        </div>

        {/* Settings Full-Card Overlay */}
        {showSettingsPopover && (
          <div 
            onClick={(e) => e.stopPropagation()} 
            className="absolute inset-0 bg-slate-950/95 backdrop-blur-md rounded-2xl p-4 z-[95] flex flex-col gap-3 text-left animate-in fade-in duration-100"
          >
            {/* Header */}
            <div className="flex justify-between items-center border-b border-white/10 pb-2">
              <h3 className="m-0 text-sm font-bold text-slate-200 flex items-center gap-2">
                <Settings size={15} className="text-cyan-400" />
                ตั้งค่าแสดงผล Tapo
              </h3>
              <button 
                onClick={() => setShowSettingsPopover(false)}
                className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-3 pr-1">
              {/* Time Filter */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Clock size={11} className="text-cyan-400" /> ช่วงเวลาที่ต้องการดู
                </label>
                <select 
                  value={timeFilter} 
                  onChange={(e) => setTimeFilter(e.target.value)} 
                  className="modern-select w-full text-xs"
                >
                  <option value="1h">1 ชั่วโมงล่าสุด</option>
                  <option value="3h">3 ชั่วโมงล่าสุด</option>
                  <option value="6h">6 ชั่วโมงล่าสุด</option>
                  <option value="24h">24 ชั่วโมงล่าสุด</option>
                  <option value="all">ทั้งหมด (All Time)</option>
                  <option value="custom">📅 เลือกวันที่เอง...</option>
                </select>

                {timeFilter === 'custom' && (
                  <div className="flex flex-col gap-2 mt-1 p-2 bg-white/[0.02] rounded-lg border border-white/5">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-slate-400">เริ่มต้น:</span>
                      <input 
                        type="date" 
                        className="modern-input w-full text-xs" 
                        value={startDate} 
                        onChange={(e) => setStartDate(e.target.value)} 
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-slate-400">สิ้นสุด:</span>
                      <input 
                        type="date" 
                        className="modern-input w-full text-xs" 
                        value={endDate} 
                        onChange={(e) => setEndDate(e.target.value)} 
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Room Toggles */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  เลือกเปิด/ปิดกราฟแต่ละห้อง
                </label>
                <div className="flex flex-col gap-1.5">
                  {rooms.map(room => (
                    <div 
                      key={room.id} 
                      className={`flex items-center gap-2.5 p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                        visibleRooms[room.id] 
                          ? 'border-cyan-500/30 bg-cyan-500/10 text-white font-medium' 
                          : 'border-white/5 bg-transparent text-slate-400'
                      }`}
                      onClick={() => toggleRoom(room.id)}
                    >
                      <span className="flex-1 flex items-center gap-2">
                        <span className="text-sm">{room.icon}</span>
                        <span>{room.name || room.sheetName}</span>
                      </span>
                      <div className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${
                        visibleRooms[room.id] 
                          ? 'bg-cyan-500 border-cyan-500 text-slate-950' 
                          : 'border-slate-600 bg-transparent'
                      }`}>
                        {visibleRooms[room.id] && <Check size={10} strokeWidth={3} />}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer Done button */}
            <div className="border-t border-white/10 pt-2">
              <button
                onClick={() => setShowSettingsPopover(false)}
                className="w-full py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-md"
              >
                <Check size={13} strokeWidth={3} />
                <span>บันทึกและปิดการตั้งค่า</span>
              </button>
            </div>
          </div>
        )}

        {/* Charts & Sensor Cards Section */}
        <div className={getGridClass()}>
          
          {/* Temperature Section */}
          {(!expandedChart || expandedChart === 'temp') && (
            <div className={`glass-panel chart-container flex flex-col rounded-xl border border-white/10 bg-slate-900/60 backdrop-blur-md p-2.5 sm:p-3 transition-all min-h-0 ${expandedChart === 'temp' ? 'expanded-fullscreen flex-1' : (showCharts ? 'flex-1' : 'justify-start')}`}>
              <div className="flex justify-between items-center mb-1.5 shrink-0">
                <h3 className="m-0 text-xs font-bold text-gray-300 flex items-center gap-1.5 whitespace-nowrap">
                  <Thermometer size={14} className="text-rose-500 shrink-0" /> 
                  <span>อุณหภูมิ (°C)</span>
                </h3>
                <button 
                  onClick={() => setExpandedChart(expandedChart === 'temp' ? null : 'temp')} 
                  className="p-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md text-slate-400 hover:text-white transition-colors cursor-pointer"
                  title={expandedChart === 'temp' ? "ย่อหน้าต่าง" : "ขยายเต็มจอ"}
                >
                  {expandedChart === 'temp' ? <X size={13} /> : <Maximize2 size={13} />}
                </button>
              </div>
              
              {/* Sensor Pills / Custom Legend */}
              <div className="shrink-0 w-full">
                <CustomLegend 
                  payload={legendPayload} 
                  onHover={setHoveredRoom} 
                  type="temp" 
                  isTwoColumns={isTwoColumnsLegend} 
                />
              </div>
              
              {/* Line Chart: Visible in 2x2, 1x2, or when Expanded */}
              {(showCharts || expandedChart === 'temp') && (
                <div className="flex-1 min-h-[140px] sm:min-h-[160px] w-full mt-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={filteredData} margin={{ top: 8, right: 8, left: -24, bottom: 0 }} onMouseLeave={() => setHoveredRoom(null)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
                      <XAxis 
                        dataKey="rawDate" 
                        stroke="var(--text-muted)" 
                        tick={{fill: 'var(--text-muted)', fontSize: 9}} 
                        minTickGap={15}
                        tickFormatter={(val) => {
                          if (val && val.includes(' ')) return val.split(' ')[1];
                          return val;
                        }}
                      />
                      <YAxis 
                        stroke={leftAxisColor} 
                        tick={{fill: leftAxisColor, fontWeight: leftAxisWeight, fontSize: 9}} 
                        ticks={tempTicks.length > 0 ? tempTicks : undefined}
                        domain={tempTicks.length > 0 ? [tempTicks[0], tempTicks[tempTicks.length - 1]] : ['auto', 'auto']}
                        style={{ filter: leftAxisFilter, transition: 'all 0.3s ease' }} 
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'rgba(15, 23, 42, 0.85)', 
                          backdropFilter: 'blur(8px)',
                          WebkitBackdropFilter: 'blur(8px)',
                          borderColor: 'rgba(255, 255, 255, 0.15)', 
                          borderRadius: '8px',
                          padding: '6px 10px',
                          fontSize: '10px',
                          boxShadow: '0 4px 20px rgba(0,0,0,0.4)'
                        }}
                        itemStyle={{ color: 'var(--text-main)', padding: '1px 0' }}
                        labelStyle={{ fontWeight: 'bold', marginBottom: '2px', color: 'var(--text-muted)', fontSize: '10px' }}
                        labelFormatter={(label) => `เวลา: ${label}`}
                      />
                      {rooms.map(room => {
                        if (!visibleRooms[room.id]) return null;
                        const isHovered = hoveredRoom === room.id;
                        const isOthersHovered = hoveredRoom !== null && hoveredRoom !== room.id;
                        
                        return (
                          <Line 
                            key={`${room.id}_temp`}
                            type="monotone" 
                            dataKey={`${room.id}_temp`} 
                            name={`${room.icon} ${room.name || room.sheetName}`} 
                            stroke={room.color} 
                            strokeWidth={isTvMode ? (isHovered ? 4 : 3) : (isHovered ? 2.5 : 1.5)} 
                            strokeOpacity={isOthersHovered ? 0.15 : 1}
                            style={{
                              filter: isHovered ? `drop-shadow(0px 0px 4px ${room.color})` : 'none',
                              transition: 'all 0.3s ease'
                            }}
                            dot={false}
                            activeDot={{ r: isHovered ? 5 : 3.5 }}
                            connectNulls
                            onMouseEnter={() => setHoveredRoom(room.id)}
                            onMouseLeave={() => setHoveredRoom(null)}
                          />
                        );
                      })}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {/* Humidity Section */}
          {(!expandedChart || expandedChart === 'hum') && (
            <div className={`glass-panel chart-container flex flex-col rounded-xl border border-white/10 bg-slate-900/60 backdrop-blur-md p-2.5 sm:p-3 transition-all min-h-0 ${expandedChart === 'hum' ? 'expanded-fullscreen flex-1' : (showCharts ? 'flex-1' : 'justify-start')}`}>
              <div className="flex justify-between items-center mb-1.5 shrink-0">
                <h3 className="m-0 text-xs font-bold text-gray-300 flex items-center gap-1.5 whitespace-nowrap">
                  <Droplets size={14} className="text-sky-400 shrink-0" /> 
                  <span>ความชื้น (%)</span>
                </h3>
                <button 
                  onClick={() => setExpandedChart(expandedChart === 'hum' ? null : 'hum')} 
                  className="p-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md text-slate-400 hover:text-white transition-colors cursor-pointer"
                  title={expandedChart === 'hum' ? "ย่อหน้าต่าง" : "ขยายเต็มจอ"}
                >
                  {expandedChart === 'hum' ? <X size={13} /> : <Maximize2 size={13} />}
                </button>
              </div>
              
              {/* Sensor Pills / Custom Legend */}
              <div className="shrink-0 w-full">
                <CustomLegend 
                  payload={legendPayload} 
                  onHover={setHoveredRoom} 
                  type="hum" 
                  isTwoColumns={isTwoColumnsLegend} 
                />
              </div>
              
              {/* Line Chart: Visible in 2x2, 1x2, or when Expanded */}
              {(showCharts || expandedChart === 'hum') && (
                <div className="flex-1 min-h-[140px] sm:min-h-[160px] w-full mt-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={filteredData} margin={{ top: 8, right: 8, left: -24, bottom: 0 }} onMouseLeave={() => setHoveredRoom(null)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
                      <XAxis 
                        dataKey="rawDate" 
                        stroke="var(--text-muted)" 
                        tick={{fill: 'var(--text-muted)', fontSize: 9}} 
                        minTickGap={15}
                        tickFormatter={(val) => {
                          if (val && val.includes(' ')) return val.split(' ')[1];
                          return val;
                        }}
                      />
                      <YAxis 
                        stroke={leftAxisColor} 
                        tick={{fill: leftAxisColor, fontWeight: leftAxisWeight, fontSize: 9}} 
                        ticks={humTicks.length > 0 ? humTicks : undefined}
                        domain={humTicks.length > 0 ? [humTicks[0], humTicks[humTicks.length - 1]] : ['auto', 'auto']}
                        style={{ filter: leftAxisFilter, transition: 'all 0.3s ease' }} 
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'rgba(15, 23, 42, 0.85)', 
                          backdropFilter: 'blur(8px)',
                          WebkitBackdropFilter: 'blur(8px)',
                          borderColor: 'rgba(255, 255, 255, 0.15)', 
                          borderRadius: '8px',
                          padding: '6px 10px',
                          fontSize: '10px',
                          boxShadow: '0 4px 20px rgba(0,0,0,0.4)'
                        }}
                        itemStyle={{ color: 'var(--text-main)', padding: '1px 0' }}
                        labelStyle={{ fontWeight: 'bold', marginBottom: '2px', color: 'var(--text-muted)', fontSize: '10px' }}
                        labelFormatter={(label) => `เวลา: ${label}`}
                      />
                      {rooms.map(room => {
                        if (!visibleRooms[room.id]) return null;
                        const isHovered = hoveredRoom === room.id;
                        const isOthersHovered = hoveredRoom !== null && hoveredRoom !== room.id;
                        
                        return (
                          <Line 
                            key={`${room.id}_hum`}
                            type="monotone" 
                            dataKey={`${room.id}_hum`} 
                            name={`${room.icon} ${room.name || room.sheetName}`} 
                            stroke={room.color} 
                            strokeWidth={isTvMode ? (isHovered ? 4 : 3) : (isHovered ? 2.5 : 1.5)} 
                            strokeOpacity={isOthersHovered ? 0.15 : 1}
                            style={{
                              filter: isHovered ? `drop-shadow(0px 0px 4px ${room.color})` : 'none',
                              transition: 'all 0.3s ease'
                            }}
                            dot={false}
                            activeDot={{ r: isHovered ? 5 : 3.5 }}
                            connectNulls
                            onMouseEnter={() => setHoveredRoom(room.id)}
                            onMouseLeave={() => setHoveredRoom(null)}
                          />
                        );
                      })}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}
          
        </div>
      </div>
    </div>
  );
}
