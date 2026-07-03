import { useState, useEffect, useMemo } from 'react';
import Papa from 'papaparse';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { Thermometer, Droplets, Clock, CheckSquare, Square, Expand, Minimize2, X, Settings, Check, Maximize2 } from 'lucide-react';
import { CONFIG } from '../tapoConfig';
import './tapoDashboard.css'; // Import the scoped CSS

// 100% Custom React Legend (Rendered outside Recharts completely to avoid SVG disappearing bugs)
const CustomLegend = ({ payload, onHover, type }) => {
  if (!payload || payload.length === 0) return null;
  
  return (
    <div className="custom-legend">
      {payload.map((entry, index) => {
        const valText = type === 'temp' ? entry.latestTemp : entry.latestHum;
        return (
          <div 
            key={`item-${index}`} 
            className="custom-legend-item"
            onMouseEnter={() => onHover && onHover(entry.id)}
            onMouseLeave={() => onHover && onHover(null)}
            style={{ 
              boxShadow: entry.isHovered ? `0 0 12px ${entry.color}` : '0 4px 12px rgba(0, 0, 0, 0.15)',
              borderColor: entry.isHovered ? entry.color : 'rgba(255, 255, 255, 0.1)',
              cursor: 'pointer',
              transform: entry.isHovered ? 'translateY(-2px)' : 'none'
            }}
          >
            <div className="legend-text-container">
              <span className="legend-name">{entry.icon} {entry.name}</span>
              <span className="legend-axis">{valText}</span>
            </div>
            <svg width="26" height="12" viewBox="0 0 32 14" style={{ flexShrink: 0 }}>
              <path strokeWidth={entry.isHovered ? "4" : "3"} fill="none" stroke={entry.color} d="M0,7 h12 m8,0 h12" />
              <circle cx="16" cy="7" r={entry.isHovered ? "5" : "4"} fill="var(--bg-dark)" stroke={entry.color} strokeWidth="3" />
            </svg>
          </div>
        );
      })}
    </div>
  );
};

export default function TapoDashboard({ viewMode, displayMode = 'full', onToggleFullscreen }) {
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
        const fetchPromises = CONFIG.rooms.map(room => {
          const url = `https://docs.google.com/spreadsheets/d/${CONFIG.spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(room.sheetName)}`;
          
          return new Promise((resolve, reject) => {
            Papa.parse(url, {
              download: true,
              header: true,
              skipEmptyLines: true,
              complete: (results) => {
                const roomData = results.data.map(row => {
                  const values = Object.values(row);
                  let rawTime = values[0] || '';
                  
                  let timestamp = new Date(rawTime).getTime();
                  if (isNaN(timestamp)) timestamp = 0;

                  let timeStr = rawTime;
                  if(timeStr.includes(' ')) {
                    timeStr = timeStr.split(' ')[1];
                  }
                  
                  return {
                    timestamp,
                    time: timeStr,
                    rawDate: rawTime,
                    [`${room.id}_temp`]: parseFloat(values[1]) || null,
                    [`${room.id}_hum`]: parseFloat(values[2]) || null
                  };
                });
                resolve(roomData);
              },
              error: (err) => {
                reject(new Error(`Failed to fetch ${room.sheetName}: ${err.message}`));
              }
            });
          });
        });

        const allRoomsData = await Promise.all(fetchPromises);
        
        const mergedDataMap = {};
        
        allRoomsData.forEach(roomDataArray => {
          roomDataArray.forEach(item => {
            if (!item.time) return;
            if (!mergedDataMap[item.timestamp]) {
              mergedDataMap[item.timestamp] = { time: item.time, rawDate: item.rawDate, timestamp: item.timestamp };
            }
            Object.assign(mergedDataMap[item.timestamp], item);
          });
        });

        const finalData = Object.values(mergedDataMap).sort((a, b) => a.timestamp - b.timestamp);
        
        setData(finalData);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchData();
    intervalId = setInterval(fetchData, CONFIG.refreshIntervalMs);

    return () => clearInterval(intervalId);
  }, []);

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
    return data.filter(item => item.timestamp >= minTimestamp);
  }, [data, timeFilter, startDate, endDate]);

  const latestValues = useMemo(() => {
    const latest = {};
    CONFIG.rooms.forEach(room => {
      latest[room.id] = { 
        temp: '--', hum: '--', tempTrend: 0, humTrend: 0, isAlert: false, tempAlert: false, humAlert: false,
        tempMax: '--', tempMin: '--', tempAvg: '--',
        humMax: '--', humMin: '--', humAvg: '--'
      };
      
      let lastTemp = null, prevTemp = null;
      let lastHum = null, prevHum = null;
      
      let tMax = -Infinity, tMin = Infinity, tSum = 0, tCount = 0;
      let hMax = -Infinity, hMin = Infinity, hSum = 0, hCount = 0;
      
      for (let i = filteredData.length - 1; i >= 0; i--) {
        const row = filteredData[i];
        const temp = row[`${room.id}_temp`];
        const hum = row[`${room.id}_hum`];
        
        if (temp != null) {
          if (lastTemp === null) lastTemp = temp;
          else if (prevTemp === null) prevTemp = temp;
          
          if (temp > tMax) tMax = temp;
          if (temp < tMin) tMin = temp;
          tSum += temp;
          tCount++;
        }
        
        if (hum != null) {
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
  }, [filteredData]);

  // Payload for Custom Legend
  const legendPayload = useMemo(() => {
    return CONFIG.rooms
      .filter(room => visibleRooms[room.id])
      .map(room => {
        const stats = latestValues[room.id];
        return {
          id: room.id,
          icon: room.icon,
          name: room.sheetName,
          latestTemp: stats ? `${stats.temp}°C` : 'N/A',
          latestHum: stats ? `${stats.hum}%` : 'N/A',
          color: room.color,
          isHovered: hoveredRoom === room.id
        };
      });
  }, [visibleRooms, hoveredRoom, latestValues]);

  const { tempTicks, humTicks } = useMemo(() => {
    let globalTempMin = Infinity;
    let globalTempMax = -Infinity;
    let globalHumMin = Infinity;
    let globalHumMax = -Infinity;

    Object.entries(latestValues).forEach(([roomId, stats]) => {
      if (visibleRooms[roomId]) {
        if (stats.tempMin !== 'N/A') {
          globalTempMin = Math.min(globalTempMin, parseFloat(stats.tempMin));
        }
        if (stats.tempMax !== 'N/A') {
          globalTempMax = Math.max(globalTempMax, parseFloat(stats.tempMax));
        }
        if (stats.humMin !== 'N/A') {
          globalHumMin = Math.min(globalHumMin, parseFloat(stats.humMin));
        }
        if (stats.humMax !== 'N/A') {
          globalHumMax = Math.max(globalHumMax, parseFloat(stats.humMax));
        }
      }
    });

    const tTicks = [];
    if (globalTempMin !== Infinity && globalTempMax !== -Infinity) {
      const start = Math.floor(globalTempMin / 2) * 2;
      const end = Math.ceil(globalTempMax / 2) * 2;
      for (let i = start; i <= end; i += 2) {
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

  if (loading && data.length === 0) {
    return <div className="loading">Loading dashboard data from Google Sheets...</div>;
  }

  if (error) {
    return <div className="loading" style={{color: '#ef4444'}}>Error: {error}</div>;
  }
  let leftAxisColor = "var(--text-muted)";
  let leftAxisFilter = "none";
  let leftAxisWeight = "normal";

  if (hoveredRoom) {
    const hoveredRoomConfig = CONFIG.rooms.find(r => r.id === hoveredRoom);
    if (hoveredRoomConfig) {
      if (!hoveredRoom.includes('fridge')) {
        leftAxisColor = hoveredRoomConfig.color;
        leftAxisFilter = `drop-shadow(0px 0px 8px ${hoveredRoomConfig.color})`;
        leftAxisWeight = "bold";
      }
    }
  }

  return (
    <div className={`tapo-dashboard-container w-full h-full ${viewMode === 'split' ? 'is-split-view' : ''} ${displayMode === 'compact' ? 'is-compact-mode' : ''}`}>
      <div className="dashboard-content">
        <div className="dashboard-header flex items-center justify-between px-4 py-2 border-b border-gray-800/40" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ textAlign: 'left' }}>
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>Tapo Central Dashboard</h2>
            <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>Real-time Environment Monitoring & Analytics</p>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginRight: '28px' }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowSettingsPopover(true);
              }}
              style={{
                padding: '6px',
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#06b6d4',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s',
              }}
              className="hover:text-white hover:bg-slate-700"
              title="ตั้งค่าช่วงเวลาและการกรองห้อง"
            >
              <Settings size={15} />
            </button>
            {onToggleFullscreen && (
              <button 
                onClick={onToggleFullscreen}
                style={{
                  padding: '6px',
                  backgroundColor: '#1f2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#06b6d4',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s',
                }}
                className="hover:text-white hover:bg-slate-700"
                title={viewMode === 'tapo' ? "ย่อหน้าต่างกลับเป็นแบบแยกจอ" : "ขยาย Tapo Dashboard เต็มจอ"}
              >
                {viewMode === 'tapo' ? <Minimize2 size={15} /> : <Expand size={15} />}
              </button>
            )}
          </div>
        </div>

        {/* Settings Full-Card Overlay */}
        {showSettingsPopover && (
          <div 
            onClick={(e) => e.stopPropagation()} 
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(11, 15, 25, 0.97)',
              backdropFilter: 'blur(12px)',
              borderRadius: '16px',
              padding: '20px',
              zIndex: 95,
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              textAlign: 'left',
            }}
            className="animate-in fade-in duration-100"
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 'bold', color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Settings size={16} className="text-cyan-400" />
                ตั้งค่าแสดงผล Tapo
              </h3>
              <button 
                onClick={() => setShowSettingsPopover(false)}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: '18px',
                  cursor: 'pointer',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                className="hover:bg-white/10"
              >
                <X size={16} />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', paddingRight: '4px' }} className="custom-scrollbar">
              {/* Time Filter */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Clock size={12} className="text-cyan-400" /> ช่วงเวลาที่ต้องการดู
                </label>
                <select 
                  value={timeFilter} 
                  onChange={(e) => setTimeFilter(e.target.value)} 
                  className="modern-select"
                  style={{ width: '100%' }}
                >
                  <option value="1h">1 ชั่วโมงล่าสุด</option>
                  <option value="3h">3 ชั่วโมงล่าสุด</option>
                  <option value="6h">6 ชั่วโมงล่าสุด</option>
                  <option value="24h">24 ชั่วโมงล่าสุด</option>
                  <option value="all">ทั้งหมด (All Time)</option>
                  <option value="custom">📅 เลือกวันที่เอง...</option>
                </select>

                {timeFilter === 'custom' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px', padding: '10px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '10px', color: '#64748b' }}>เริ่มต้น:</span>
                      <input 
                        type="date" 
                        className="modern-input" 
                        style={{ width: '100%', fontSize: '12px' }}
                        value={startDate} 
                        onChange={(e) => setStartDate(e.target.value)} 
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '10px', color: '#64748b' }}>สิ้นสุด:</span>
                      <input 
                        type="date" 
                        className="modern-input" 
                        style={{ width: '100%', fontSize: '12px' }}
                        value={endDate} 
                        onChange={(e) => setEndDate(e.target.value)} 
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Room Toggles */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  เลือกเปิด/ปิดกราฟแต่ละห้อง
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {CONFIG.rooms.map(room => (
                    <div 
                      key={room.id} 
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '8px 12px',
                        borderRadius: '10px',
                        border: '1px solid',
                        borderColor: visibleRooms[room.id] ? 'rgba(6, 182, 212, 0.3)' : 'rgba(255,255,255,0.04)',
                        backgroundColor: visibleRooms[room.id] ? 'rgba(6, 182, 212, 0.08)' : 'transparent',
                        color: visibleRooms[room.id] ? '#ffffff' : '#64748b',
                        fontSize: '12px',
                        cursor: 'pointer',
                        userSelect: 'none',
                        transition: 'all 0.2s',
                      }}
                      onClick={() => toggleRoom(room.id)}
                    >
                      <span style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '14px' }}>{room.icon}</span>
                        <span>{room.sheetName}</span>
                      </span>
                      <div style={{
                        width: '15px',
                        height: '15px',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px solid',
                        borderColor: visibleRooms[room.id] ? '#06b6d4' : '#475569',
                        backgroundColor: visibleRooms[room.id] ? '#06b6d4' : 'transparent',
                        color: '#0f172a',
                        transition: 'all 0.2s',
                      }}>
                        {visibleRooms[room.id] && <Check size={10} strokeWidth={3} />}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer Done button */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '10px' }}>
              <button
                onClick={() => setShowSettingsPopover(false)}
                style={{
                  width: '100%',
                  padding: '10px',
                  backgroundColor: '#06b6d4',
                  color: '#0f172a',
                  border: 'none',
                  borderRadius: '10px',
                  fontWeight: 'bold',
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
                className="hover:bg-cyan-400"
              >
                <Check size={14} strokeWidth={3} />
                <span>บันทึกและปิดการตั้งค่า</span>
              </button>
            </div>
          </div>
        )}

        {/* Charts Section - Side by Side */}
        <div className="charts-grid-side-by-side">
          
          {/* Temperature Chart */}
          <div className={`glass-panel chart-container ${expandedChart === 'temp' ? 'expanded-fullscreen' : ''}`}>
            <div className="flex justify-between items-center mb-6">
              <h3 style={{margin: 0, display: 'flex', alignItems: 'center'}}><Thermometer size={24} color="#ef4444" style={{marginRight: 8}} /> กราฟอุณหภูมิ (°C)</h3>
              <button onClick={() => setExpandedChart(expandedChart === 'temp' ? null : 'temp')} className="p-2 bg-[#1f2937] hover:bg-[#374151] border border-[#374151] rounded-lg text-gray-400 hover:text-white transition-colors" title={expandedChart === 'temp' ? "ย่อหน้าต่าง" : "ขยายเต็มจอ"}>
                {expandedChart === 'temp' ? <X size={20} /> : <Maximize2 size={20} />}
              </button>
            </div>
            
            <CustomLegend payload={legendPayload} onHover={setHoveredRoom} type="temp" />
            
            <div style={{ flex: 1, minHeight: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={filteredData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} onMouseLeave={() => setHoveredRoom(null)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                  <XAxis 
                    dataKey="rawDate" 
                    stroke="var(--text-muted)" 
                    tick={{fill: 'var(--text-muted)', fontSize: 10}} 
                    minTickGap={15}
                    tickFormatter={(val) => {
                      if (val && val.includes(' ')) return val.split(' ')[1];
                      return val;
                    }}
                  />
                  <YAxis 
                    stroke={leftAxisColor} 
                    tick={{fill: leftAxisColor, fontWeight: leftAxisWeight}} 
                    ticks={tempTicks.length > 0 ? tempTicks : undefined}
                    domain={tempTicks.length > 0 ? [tempTicks[0], tempTicks[tempTicks.length - 1]] : ['auto', 'auto']}
                    style={{ filter: leftAxisFilter, transition: 'all 0.3s ease' }} 
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(15, 23, 42, 0.65)', 
                      backdropFilter: 'blur(8px)',
                      WebkitBackdropFilter: 'blur(8px)',
                      borderColor: 'rgba(255, 255, 255, 0.15)', 
                      borderRadius: '8px',
                      padding: '8px 12px',
                      fontSize: '11px',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
                    }}
                    itemStyle={{ color: 'var(--text-main)', padding: '2px 0' }}
                    labelStyle={{ fontWeight: 'bold', marginBottom: '4px', color: 'var(--text-muted)', fontSize: '11px' }}
                    labelFormatter={(label) => `เวลา: ${label}`}
                  />
                  {CONFIG.rooms.map(room => {
                    if (!visibleRooms[room.id]) return null;
                    const isHovered = hoveredRoom === room.id;
                    const isOthersHovered = hoveredRoom !== null && hoveredRoom !== room.id;
                    
                    return (
                      <Line 
                        key={`${room.id}_temp`}
                        type="monotone" 
                        dataKey={`${room.id}_temp`} 
                        name={`${room.icon} ${room.sheetName}`} 
                        stroke={room.color} 
                        strokeWidth={isHovered ? 2.5 : 1.5} 
                        strokeOpacity={isOthersHovered ? 0.15 : 1}
                        style={{
                          filter: isHovered ? `drop-shadow(0px 0px 4px ${room.color})` : 'none',
                          transition: 'all 0.3s ease'
                        }}
                        dot={false}
                        activeDot={{ r: isHovered ? 6 : 4 }}
                        connectNulls
                        onMouseEnter={() => setHoveredRoom(room.id)}
                        onMouseLeave={() => setHoveredRoom(null)}
                      />
                    );
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Humidity Chart */}
          <div className={`glass-panel chart-container ${expandedChart === 'hum' ? 'expanded-fullscreen' : ''}`}>
            <div className="flex justify-between items-center mb-6">
              <h3 style={{margin: 0, display: 'flex', alignItems: 'center'}}><Droplets size={24} color="#38bdf8" style={{marginRight: 8}} /> กราฟความชื้น (%)</h3>
              <button onClick={() => setExpandedChart(expandedChart === 'hum' ? null : 'hum')} className="p-2 bg-[#1f2937] hover:bg-[#374151] border border-[#374151] rounded-lg text-gray-400 hover:text-white transition-colors" title={expandedChart === 'hum' ? "ย่อหน้าต่าง" : "ขยายเต็มจอ"}>
                {expandedChart === 'hum' ? <X size={20} /> : <Maximize2 size={20} />}
              </button>
            </div>
            
            <CustomLegend payload={legendPayload} onHover={setHoveredRoom} type="hum" />
            
            <div style={{ flex: 1, minHeight: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={filteredData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} onMouseLeave={() => setHoveredRoom(null)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                  <XAxis 
                    dataKey="rawDate" 
                    stroke="var(--text-muted)" 
                    tick={{fill: 'var(--text-muted)', fontSize: 10}} 
                    minTickGap={15}
                    tickFormatter={(val) => {
                      if (val && val.includes(' ')) return val.split(' ')[1];
                      return val;
                    }}
                  />
                  <YAxis 
                    stroke={leftAxisColor} 
                    tick={{fill: leftAxisColor, fontWeight: leftAxisWeight}} 
                    ticks={humTicks.length > 0 ? humTicks : undefined}
                    domain={humTicks.length > 0 ? [humTicks[0], humTicks[humTicks.length - 1]] : ['auto', 'auto']}
                    style={{ filter: leftAxisFilter, transition: 'all 0.3s ease' }} 
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(15, 23, 42, 0.65)', 
                      backdropFilter: 'blur(8px)',
                      WebkitBackdropFilter: 'blur(8px)',
                      borderColor: 'rgba(255, 255, 255, 0.15)', 
                      borderRadius: '8px',
                      padding: '8px 12px',
                      fontSize: '11px',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
                    }}
                    itemStyle={{ color: 'var(--text-main)', padding: '2px 0' }}
                    labelStyle={{ fontWeight: 'bold', marginBottom: '4px', color: 'var(--text-muted)', fontSize: '11px' }}
                    labelFormatter={(label) => `เวลา: ${label}`}
                  />
                  {CONFIG.rooms.map(room => {
                    if (!visibleRooms[room.id]) return null;
                    const isHovered = hoveredRoom === room.id;
                    const isOthersHovered = hoveredRoom !== null && hoveredRoom !== room.id;
                    
                    return (
                      <Line 
                        key={`${room.id}_hum`}
                        type="monotone" 
                        dataKey={`${room.id}_hum`} 
                        name={`${room.icon} ${room.sheetName}`} 
                        stroke={room.color} 
                        strokeWidth={isHovered ? 2.5 : 1.5} 
                        strokeOpacity={isOthersHovered ? 0.15 : 1}
                        style={{
                          filter: isHovered ? `drop-shadow(0px 0px 4px ${room.color})` : 'none',
                          transition: 'all 0.3s ease'
                        }}
                        dot={false}
                        activeDot={{ r: isHovered ? 6 : 4 }}
                        connectNulls
                        onMouseEnter={() => setHoveredRoom(room.id)}
                        onMouseLeave={() => setHoveredRoom(null)}
                      />
                    );
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
