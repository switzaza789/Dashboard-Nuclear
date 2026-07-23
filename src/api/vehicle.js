import axios from 'axios';

const VEHICLE_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/1Kd51jWBbsAkXVvBAt0KF1aTtq8RUBh9cArqGZaDFI9Q/gviz/tq?tqx=out:csv&gid=1508392092';

// Helper parser for simple CSV with quoted fields
function parseCSV(csvText) {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
  const result = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const row = [];
    let insideQuote = false;
    let currentToken = '';
    
    for (let c = 0; c < line.length; c++) {
      const char = line[c];
      if (char === '"') {
        insideQuote = !insideQuote;
      } else if (char === ',' && !insideQuote) {
        row.push(currentToken.trim());
        currentToken = '';
      } else {
        currentToken += char;
      }
    }
    row.push(currentToken.trim());
    result.push(row);
  }
  
  return result;
}

// Convert Google Drive view URLs or image links to direct image URLs
export function formatImageUrl(urlStr) {
  if (!urlStr || typeof urlStr !== 'string') return null;

  // Find http/https URL inside text
  const match = urlStr.match(/(https?:\/\/[^\s"',)]+)/i);
  if (!match) return null;

  let rawUrl = match[1];

  // Convert Google Drive share link to direct view URL
  const driveMatch = rawUrl.match(/drive\.google\.com\/(?:file\/d\/|open\?id=)([a-zA-Z0-9_-]+)/i);
  if (driveMatch && driveMatch[1]) {
    return `https://lh3.googleusercontent.com/d/${driveMatch[1]}`;
  }

  return rawUrl;
}

// Extract model text by stripping out any embedded URLs
export function cleanModelName(str) {
  if (!str) return 'ไม่ระบุรุ่น';
  return str.replace(/https?:\/\/[^\s"',)]+/gi, '').trim() || 'ไม่ระบุรุ่น';
}

// Map fuel type & model string to category, icon, color badge, and visual styling
export function getVehicleTypeMeta(fuelType, modelStr) {
  const f = (fuelType || '').toLowerCase();
  const m = (modelStr || '').toLowerCase();
  
  if (f.includes('ไฟฟ้า') || m.includes('neta')) {
    return {
      typeKey: 'ev',
      typeLabel: 'รถไฟฟ้า EV',
      icon: '⚡',
      badgeBg: 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300',
      gradient: 'from-emerald-900/40 via-slate-900 to-slate-900',
      accentColor: '#10b981',
      brand: 'NETA'
    };
  }
  if (m.includes('almera')) {
    return {
      typeKey: 'sedan',
      typeLabel: 'รถเก๋ง (Sedan)',
      icon: '🚗',
      badgeBg: 'bg-blue-950/60 border-blue-500/40 text-blue-300',
      gradient: 'from-blue-900/40 via-slate-900 to-slate-900',
      accentColor: '#3b82f6',
      brand: 'NISSAN'
    };
  }
  if (m.includes('mg') || m.includes('zs')) {
    return {
      typeKey: 'suv',
      typeLabel: 'รถ SUV',
      icon: '🚙',
      badgeBg: 'bg-amber-950/60 border-amber-500/40 text-amber-300',
      gradient: 'from-amber-900/40 via-slate-900 to-slate-900',
      accentColor: '#f59e0b',
      brand: 'MG'
    };
  }
  if (m.includes('maxus') || m.includes('hyundai')) {
    return {
      typeKey: 'van',
      typeLabel: 'รถตู้ (Van)',
      icon: '🚐',
      badgeBg: 'bg-purple-950/60 border-purple-500/40 text-purple-300',
      gradient: 'from-purple-900/40 via-slate-900 to-slate-900',
      accentColor: '#a855f7',
      brand: m.includes('hyundai') ? 'HYUNDAI' : 'MAXUS'
    };
  }
  if (m.includes('revo')) {
    return {
      typeKey: 'pickup',
      typeLabel: 'รถกระบะ (Pickup)',
      icon: '🛻',
      badgeBg: 'bg-red-950/60 border-red-500/40 text-red-300',
      gradient: 'from-red-900/40 via-slate-900 to-slate-900',
      accentColor: '#ef4444',
      brand: 'TOYOTA'
    };
  }
  
  return {
    typeKey: 'general',
    typeLabel: fuelType || 'รถทั่วไป',
    icon: '🚘',
    badgeBg: 'bg-slate-800 border-slate-700 text-slate-300',
    gradient: 'from-slate-800/40 via-slate-900 to-slate-900',
    accentColor: '#64748b',
    brand: 'VEHICLE'
  };
}

// Calculate days remaining and risk status
function calculateDateStatus(dateStr) {
  if (!dateStr || dateStr === '-' || dateStr.trim() === '') {
    return { dateStr: '-', daysDiff: null, status: 'normal', text: 'ไม่ระบุ' };
  }

  // Expecting format DD/MM/YYYY
  const parts = dateStr.trim().split('/');
  if (parts.length < 3) {
    return { dateStr, daysDiff: null, status: 'normal', text: dateStr };
  }

  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  let year = parseInt(parts[2], 10);

  if (isNaN(day) || isNaN(month) || isNaN(year)) {
    return { dateStr, daysDiff: null, status: 'normal', text: dateStr };
  }

  if (year > 2400) year -= 543; // Convert BE to CE if needed

  const targetDate = new Date(year, month, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffTime = targetDate.getTime() - today.getTime();
  const daysDiff = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (daysDiff < 0) {
    return { dateStr, daysDiff, status: 'danger', text: `หมดอายุแล้ว (${Math.abs(daysDiff)} วัน)` };
  } else if (daysDiff <= 30) {
    return { dateStr, daysDiff, status: 'warning', text: `เหลือ ${daysDiff} วัน` };
  } else {
    return { dateStr, daysDiff, status: 'normal', text: `เหลือ ${daysDiff} วัน` };
  }
}

// Calculate next service date (+6 months / 180 days from last service date)
function calculateNextServiceStatus(lastServiceDateStr) {
  if (!lastServiceDateStr || lastServiceDateStr === '-' || lastServiceDateStr.trim() === '') {
    return null;
  }

  const parts = lastServiceDateStr.trim().split('/');
  if (parts.length < 3) return null;

  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  let year = parseInt(parts[2], 10);

  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
  if (year > 2400) year -= 543;

  const lastDate = new Date(year, month, day);
  // Add 6 months for next estimated service
  const nextDate = new Date(lastDate);
  nextDate.setMonth(nextDate.getMonth() + 6);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffTime = nextDate.getTime() - today.getTime();
  const daysDiff = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const formatStr = `${String(nextDate.getDate()).padStart(2, '0')}/${String(nextDate.getMonth() + 1).padStart(2, '0')}/${nextDate.getFullYear()}`;

  if (daysDiff < 0) {
    return {
      status: 'warning',
      nextDateStr: formatStr,
      daysDiff,
      message: `🛠️ เลยกำหนดเช็คระยะถัดไปแล้ว (คาดการณ์เมื่อ ${formatStr})`
    };
  } else if (daysDiff <= 30) {
    return {
      status: 'warning',
      nextDateStr: formatStr,
      daysDiff,
      message: `🛠️ ครบรอบเช็คระยะถัดไปในอีก ${daysDiff} วัน (ประมาณ ${formatStr})`
    };
  }

  return {
    status: 'normal',
    nextDateStr: formatStr,
    daysDiff,
    message: `เช็คระยะถัดไปประมาณ ${formatStr}`
  };
}

export async function fetchVehicleData() {
  try {
    const res = await axios.get(VEHICLE_SHEET_CSV_URL, { responseType: 'text' });
    const rows = parseCSV(res.data);
    
    if (rows.length <= 1) return [];

    // Header row
    const headers = rows[0].map(h => h.trim().toLowerCase());
    
    const findCol = (...keywords) => {
      for (const kw of keywords) {
        const idx = headers.findIndex(h => h.includes(kw.toLowerCase()));
        if (idx !== -1) return idx;
      }
      return -1;
    };

    const idIdx = findCol('ลำดับ');
    const plateIdx = findCol('ทะเบียน');
    const imgIdx = findCol('รูปรถ', 'รูปภาพ', 'รูป');
    const fuelIdx = findCol('ประเภท');
    const modelIdx = findCol('รุ่น', 'ยี่ห้อ');
    const serviceIdx = findCol('เช็คระยะ');
    const mileageIdx = findCol('เลขไมล์');
    const tireIdx = findCol('เปลี่ยนยางล่าสุด');
    const wiperIdx = findCol('เปลี่ยนยางปัดน้ำฝน');
    const batteryIdx = findCol('เปลี่ยนแบตเตอรี่');
    const taxIdx = findCol('พ.ร.บ.', 'ภาษี');
    const insuranceIdx = findCol('ประกัน');
    const noteIdx = findCol('หมายเหตุ', 'สถานะ');

    const getValue = (row, idx, defaultVal = '-') => {
      if (idx === -1 || idx >= row.length) return defaultVal;
      const val = row[idx];
      return (val !== undefined && val !== null && String(val).trim() !== '') ? String(val).trim() : defaultVal;
    };

    const dataRows = rows.slice(1);
    
    const vehicles = dataRows.map((row, index) => {
      const id = getValue(row, idIdx, String(index + 1));
      const licensePlate = getValue(row, plateIdx, 'ไม่ระบุทะเบียน');
      
      const rawImageCol = getValue(row, imgIdx, '');
      const rawFuelCol = getValue(row, fuelIdx, '');
      const rawModelCol = getValue(row, modelIdx, '');

      // Check Column L (`รูปรถ`) or any embedded URL in model string
      const imageUrl = formatImageUrl(rawImageCol) || formatImageUrl(rawModelCol);
      const model = cleanModelName(rawModelCol);
      const fuelType = rawFuelCol;

      const lastServiceDate = getValue(row, serviceIdx, '-');
      
      // Raw mileage string
      const rawMileage = getValue(row, mileageIdx, '');
      const cleanMileageNum = rawMileage ? Number(rawMileage.replace(/,/g, '')) : NaN;
      const lastMileage = !isNaN(cleanMileageNum) && cleanMileageNum > 0
        ? cleanMileageNum.toLocaleString()
        : (rawMileage || '-');

      const tireDate = getValue(row, tireIdx, '-');
      const wiperDate = getValue(row, wiperIdx, '-');
      const batteryDate = getValue(row, batteryIdx, '-');
      const taxExpireStr = getValue(row, taxIdx, '-');
      const insuranceExpireStr = getValue(row, insuranceIdx, '-');
      const note = getValue(row, noteIdx, '');

      const typeMeta = getVehicleTypeMeta(fuelType, model);
      const taxStatus = calculateDateStatus(taxExpireStr);
      const insuranceStatus = calculateDateStatus(insuranceExpireStr);
      const nextServiceStatus = calculateNextServiceStatus(lastServiceDate);

      // Determine overall risk & detailed risk causes
      const riskReasons = [];
      let overallStatus = 'normal';

      if (taxStatus.status === 'danger') {
        overallStatus = 'danger';
        riskReasons.push({ type: 'tax', level: 'danger', message: `พ.ร.บ./ภาษี หมดอายุแล้ว (${taxStatus.dateStr})` });
      } else if (taxStatus.status === 'warning') {
        if (overallStatus !== 'danger') overallStatus = 'warning';
        riskReasons.push({ type: 'tax', level: 'warning', message: `พ.ร.บ./ภาษี ใกล้หมดอายุ (เหลือ ${taxStatus.daysDiff} วัน)` });
      }

      if (insuranceStatus.status === 'danger') {
        overallStatus = 'danger';
        riskReasons.push({ type: 'insurance', level: 'danger', message: `ประกันภัย หมดอายุแล้ว (${insuranceStatus.dateStr})` });
      } else if (insuranceStatus.status === 'warning') {
        if (overallStatus !== 'danger') overallStatus = 'warning';
        riskReasons.push({ type: 'insurance', level: 'warning', message: `ประกันภัย ใกล้หมดอายุ (เหลือ ${insuranceStatus.daysDiff} วัน)` });
      }

      if (nextServiceStatus && nextServiceStatus.status === 'warning') {
        if (overallStatus !== 'danger') overallStatus = 'warning';
        riskReasons.push({ type: 'service', level: 'warning', message: nextServiceStatus.message });
      }

      if (note && note !== '-' && note.trim().length > 0) {
        riskReasons.push({ type: 'note', level: 'info', message: note });
      }

      // Min days diff for sorting
      let minDaysDiff = 99999;
      if (taxStatus.daysDiff !== null && taxStatus.daysDiff < minDaysDiff) minDaysDiff = taxStatus.daysDiff;
      if (insuranceStatus.daysDiff !== null && insuranceStatus.daysDiff < minDaysDiff) minDaysDiff = insuranceStatus.daysDiff;

      return {
        id,
        licensePlate,
        fuelType,
        model,
        imageUrl,
        typeMeta,
        lastServiceDate,
        nextServiceStatus,
        lastMileage,
        tireDate,
        wiperDate,
        batteryDate,
        taxExpireDate: taxExpireStr,
        taxStatus,
        insuranceExpireDate: insuranceExpireStr,
        insuranceStatus,
        note,
        overallStatus,
        riskReasons,
        minDaysDiff
      };
    }).filter(v => v.licensePlate && v.licensePlate !== 'ไม่ระบุทะเบียน');

    // Sort by Risk Priority: 🔴 danger (0) -> 🟡 warning (1) -> 🟢 normal (2)
    const statusPriority = { danger: 0, warning: 1, normal: 2 };
    vehicles.sort((a, b) => {
      const prioA = statusPriority[a.overallStatus] ?? 2;
      const prioB = statusPriority[b.overallStatus] ?? 2;
      
      if (prioA !== prioB) {
        return prioA - prioB;
      }
      return a.minDaysDiff - b.minDaysDiff;
    });

    return vehicles;
  } catch (err) {
    console.error('Error fetching vehicle sheet CSV:', err);
    return [];
  }
}
