import { useState, useEffect, useMemo } from 'react';
import { Car, RefreshCw, ArrowLeft, Calendar, Gauge, ShieldAlert, Wrench, Battery, AlertTriangle, CheckCircle2, AlertCircle, Info, Clock } from 'lucide-react';
import { fetchVehicleData } from '../api/vehicle';

const VehicleDashboardPanel = ({ slotNumber = 6 }) => {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const [failedImages, setFailedImages] = useState({});

  const handleImageError = (id) => {
    setFailedImages(prev => ({ ...prev, [id]: true }));
  };

  const loadData = async () => {
    setLoading(true);
    const data = await fetchVehicleData();
    setVehicles(data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const selectedVehicle = useMemo(() => {
    return vehicles.find(v => String(v.id) === String(selectedVehicleId));
  }, [vehicles, selectedVehicleId]);

  // Risk summary metrics
  const riskSummary = useMemo(() => {
    let danger = 0;
    let warning = 0;
    let normal = 0;

    vehicles.forEach(v => {
      if (v.overallStatus === 'danger') danger++;
      else if (v.overallStatus === 'warning') warning++;
      else normal++;
    });

    return { danger, warning, normal, total: vehicles.length };
  }, [vehicles]);

  const getStatusBadge = (status) => {
    if (status === 'danger') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-500/20 text-red-400 border border-red-500/40 text-[10px] font-bold shrink-0">
          <AlertCircle size={11} /> เสี่ยงสูง
        </span>
      );
    }
    if (status === 'warning') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/40 text-[10px] font-bold shrink-0">
          <AlertTriangle size={11} /> เตือน
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-bold shrink-0">
        <CheckCircle2 size={11} /> ปกติ
      </span>
    );
  };

  return (
    <div 
      id={`dashboard-slot-${slotNumber}`}
      className="glass-panel flex flex-col min-w-0 min-h-0 h-full border border-white/10 bg-slate-900/60 rounded-2xl relative overflow-hidden p-4 backdrop-blur-md"
    >
      {/* Panel Header */}
      <div className="flex items-center justify-between gap-2 pb-2.5 mb-2 border-b border-slate-800/80 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shrink-0">
            <Car size={18} />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-gray-100 truncate flex items-center gap-2">
              ยานพาหนะ & พ.ร.บ./ภาษี
              <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-md font-mono">
                SLOT {slotNumber}
              </span>
            </h3>
            <p className="text-[11px] text-gray-400 truncate">
              {selectedVehicle ? `กำลังแสดง: ${selectedVehicle.licensePlate} (${selectedVehicle.model})` : `รถทั้งหมด ${vehicles.length} คัน`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {selectedVehicle && (
            <button
              onClick={() => setSelectedVehicleId(null)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-medium border border-slate-700 transition-colors cursor-pointer"
            >
              <ArrowLeft size={13} /> รถทั้งหมด
            </button>
          )}
          <button
            onClick={loadData}
            disabled={loading}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer disabled:opacity-50"
            title="รีเฟรชข้อมูลรถยนต์"
          >
            <RefreshCw size={14} className={loading ? "animate-spin text-cyan-400" : ""} />
          </button>
        </div>
      </div>

      {/* 📊 FEATURE 1: RISK SUMMARY COUNTER BAR */}
      {!loading && !selectedVehicle && (
        <div className="flex items-center justify-between gap-1.5 p-2 bg-slate-950/80 border border-slate-800 rounded-xl mb-3 shrink-0 shadow-inner flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-bold text-gray-300">สรุปความเสี่ยง:</span>
            
            {riskSummary.danger > 0 ? (
              <span className="px-2 py-0.5 rounded-full bg-red-950/90 border border-red-500/50 text-red-300 text-[10px] font-bold flex items-center gap-1 shadow-sm">
                🔴 หมดอายุ: {riskSummary.danger} คัน
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full bg-slate-800 text-gray-400 text-[10px]">
                🔴 หมดอายุ: 0
              </span>
            )}

            {riskSummary.warning > 0 ? (
              <span className="px-2 py-0.5 rounded-full bg-amber-950/90 border border-amber-500/50 text-amber-300 text-[10px] font-bold flex items-center gap-1 shadow-sm">
                🟡 ใกล้เตือน: {riskSummary.warning} คัน
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full bg-slate-800 text-gray-400 text-[10px]">
                🟡 ใกล้เตือน: 0
              </span>
            )}

            <span className="px-2 py-0.5 rounded-full bg-emerald-950/90 border border-emerald-500/50 text-emerald-300 text-[10px] font-bold flex items-center gap-1 shadow-sm">
              🟢 ปกติ: {riskSummary.normal} คัน
            </span>
          </div>

          <span className="text-[10px] text-gray-400 font-mono font-medium">
            รวม {riskSummary.total} คัน
          </span>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar pr-1">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full py-12">
            <div className="w-7 h-7 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mb-2"></div>
            <p className="text-xs text-gray-400">กำลังโหลดข้อมูลรถยนต์จาก Google Sheets...</p>
          </div>
        ) : selectedVehicle ? (
          /* ======================================================== */
          /* 📌 SINGLE CAR DETAIL VIEW */
          /* ======================================================== */
          <div className="flex flex-col gap-3.5 animate-in fade-in duration-200">
            {/* Wide Hero Image Banner */}
            <div className="relative w-full h-36 rounded-xl overflow-hidden border border-slate-700/80 bg-slate-950 flex items-center justify-center shadow-lg group">
              {selectedVehicle.imageUrl && !failedImages[selectedVehicle.id] ? (
                <img 
                  src={selectedVehicle.imageUrl} 
                  alt={selectedVehicle.model}
                  referrerPolicy="no-referrer"
                  onError={() => handleImageError(selectedVehicle.id)}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className={`w-full h-full bg-gradient-to-r ${selectedVehicle.typeMeta.gradient} flex items-center justify-center`}>
                  <div className="text-5xl drop-shadow-lg">{selectedVehicle.typeMeta.icon}</div>
                </div>
              )}
              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent pointer-events-none" />
              
              {/* Floating Header Info */}
              <div className="absolute bottom-2.5 left-3 right-3 flex items-end justify-between gap-2 z-10">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="px-2.5 py-1 bg-cyan-950/90 border border-cyan-500/50 text-cyan-300 font-bold text-sm rounded-lg font-mono tracking-wider shadow-md backdrop-blur-sm">
                      {selectedVehicle.licensePlate}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border backdrop-blur-sm ${selectedVehicle.typeMeta.badgeBg}`}>
                      {selectedVehicle.typeMeta.typeLabel}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-gray-200 drop-shadow">
                    {selectedVehicle.model}
                  </h4>
                </div>
                <div>{getStatusBadge(selectedVehicle.overallStatus)}</div>
              </div>
            </div>

            {/* Prominent & Enlarged Risk Reasons */}
            {selectedVehicle.riskReasons && selectedVehicle.riskReasons.length > 0 && (
              <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 flex flex-col gap-2">
                <div className="text-xs font-bold text-gray-200 flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
                  <ShieldAlert size={15} className="text-red-400" />
                  <span>รายการแจ้งเตือนสาเหตุความเสี่ยง:</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  {selectedVehicle.riskReasons.map((reason, idx) => (
                    <div 
                      key={idx}
                      className={`text-xs px-3 py-2 rounded-xl border font-bold flex items-center gap-2 shadow-md ${
                        reason.level === 'danger'
                          ? 'bg-red-950/90 border-red-500/60 text-red-200 shadow-red-950/40'
                          : reason.level === 'warning'
                          ? 'bg-amber-950/90 border-amber-500/60 text-amber-200 shadow-amber-950/40'
                          : 'bg-slate-800 border-slate-700 text-slate-200'
                      }`}
                    >
                      {reason.level === 'danger' && <AlertCircle size={16} className="text-red-400 shrink-0 animate-pulse" />}
                      {reason.level === 'warning' && <AlertTriangle size={16} className="text-amber-400 shrink-0" />}
                      {reason.level === 'info' && <Info size={16} className="text-cyan-400 shrink-0" />}
                      <span className="leading-snug">{reason.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SECTION 1: การเช็คระยะ & เลขไมล์ (With Next Service Alert) */}
            <div className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-800 flex flex-col gap-2.5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2 text-cyan-400 font-semibold text-xs">
                  <Gauge size={15} />
                  <span>1. การเช็คระยะ & เลขไมล์ล่าสุด</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/60">
                  <span className="text-[10px] text-gray-400 flex items-center gap-1">
                    <Calendar size={12} className="text-cyan-400" /> วันที่เช็คระยะล่าสุด
                  </span>
                  <div className="text-xs font-bold text-gray-200 mt-1">
                    {selectedVehicle.lastServiceDate || '-'}
                  </div>
                </div>
                <div className="bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/60">
                  <span className="text-[10px] text-gray-400 flex items-center gap-1">
                    <Gauge size={12} className="text-blue-400" /> เลขไมล์ที่เช็คล่าสุด
                  </span>
                  <div className="text-xs font-bold text-gray-200 mt-1 font-mono">
                    {selectedVehicle.lastMileage} {selectedVehicle.lastMileage !== '-' ? 'กม.' : ''}
                  </div>
                </div>
              </div>

              {/* 🛠️ FEATURE 4: NEXT SERVICE ESTIMATED DATE */}
              {selectedVehicle.nextServiceStatus && (
                <div className={`p-2.5 rounded-lg border flex items-center justify-between text-xs font-medium ${
                  selectedVehicle.nextServiceStatus.status === 'warning' 
                    ? 'bg-amber-950/40 border-amber-500/40 text-amber-300' 
                    : 'bg-slate-800/50 border-slate-700 text-gray-300'
                }`}>
                  <span className="flex items-center gap-1.5 text-[11px]">
                    <Clock size={13} className="text-cyan-400" />
                    เช็คระยะครั้งถัดไป (คาดการณ์ 6 เดือน):
                  </span>
                  <span className="font-bold font-mono">
                    {selectedVehicle.nextServiceStatus.nextDateStr}
                  </span>
                </div>
              )}
            </div>

            {/* SECTION 2: สถานะการเปลี่ยนอะไหล่ */}
            <div className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-800 flex flex-col gap-2.5">
              <div className="flex items-center gap-2 text-cyan-400 font-semibold text-xs border-b border-slate-800 pb-2">
                <Wrench size={15} />
                <span>2. ประวัติเปลี่ยนอะไหล่ & อุปกรณ์</span>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/50 border border-slate-700/50 text-xs">
                  <div className="flex items-center gap-2">
                    <Wrench size={13} className="text-amber-400" />
                    <span className="text-gray-300 font-medium">ยางรถยนต์:</span>
                  </div>
                  <span className="font-semibold text-gray-200">{selectedVehicle.tireDate}</span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/50 border border-slate-700/50 text-xs">
                  <div className="flex items-center gap-2">
                    <Wrench size={13} className="text-cyan-400" />
                    <span className="text-gray-300 font-medium">ยางปัดน้ำฝน:</span>
                  </div>
                  <span className="font-semibold text-gray-200">{selectedVehicle.wiperDate}</span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/50 border border-slate-700/50 text-xs">
                  <div className="flex items-center gap-2">
                    <Battery size={13} className="text-emerald-400" />
                    <span className="text-gray-300 font-medium">แบตเตอรี่:</span>
                  </div>
                  <span className="font-semibold text-gray-200">{selectedVehicle.batteryDate}</span>
                </div>
              </div>
            </div>

            {/* SECTION 3: เอกสารสำคัญ & วันหมดอายุ */}
            <div className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-800 flex flex-col gap-2.5">
              <div className="flex items-center gap-2 text-cyan-400 font-semibold text-xs border-b border-slate-800 pb-2">
                <ShieldAlert size={15} />
                <span>3. เอกสารสำคัญ & วันหมดอายุ</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className={`p-2.5 rounded-lg border flex flex-col gap-1 ${
                  selectedVehicle.taxStatus.status === 'danger' 
                    ? 'bg-red-950/30 border-red-500/40 text-red-300' 
                    : selectedVehicle.taxStatus.status === 'warning'
                    ? 'bg-amber-950/30 border-amber-500/40 text-amber-300'
                    : 'bg-slate-800/60 border-slate-700/60 text-gray-200'
                }`}>
                  <span className="text-[10px] text-gray-400">วันหมดอายุ พ.ร.บ. / ภาษี</span>
                  <span className="text-xs font-bold font-mono">{selectedVehicle.taxExpireDate}</span>
                  <span className="text-[10px] font-semibold mt-0.5">{selectedVehicle.taxStatus.text}</span>
                </div>

                <div className={`p-2.5 rounded-lg border flex flex-col gap-1 ${
                  selectedVehicle.insuranceStatus.status === 'danger' 
                    ? 'bg-red-950/30 border-red-500/40 text-red-300' 
                    : selectedVehicle.insuranceStatus.status === 'warning'
                    ? 'bg-amber-950/30 border-amber-500/40 text-amber-300'
                    : 'bg-slate-800/60 border-slate-700/60 text-gray-200'
                }`}>
                  <span className="text-[10px] text-gray-400">วันหมดอายุ ประกันภัย</span>
                  <span className="text-xs font-bold font-mono">{selectedVehicle.insuranceExpireDate}</span>
                  <span className="text-[10px] font-semibold mt-0.5">{selectedVehicle.insuranceStatus.text}</span>
                </div>
              </div>
            </div>

          </div>
        ) : (
          /* ======================================================== */
          /* 📌 PROMINENT CARDS WITH HERO IMAGE & ENLARGED RISK REASONS */
          /* ======================================================== */
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {vehicles.map(v => (
              <div
                key={v.id}
                onClick={() => setSelectedVehicleId(v.id)}
                className={`bg-slate-900/90 hover:brightness-110 border ${
                  v.overallStatus === 'danger' ? 'border-red-500/50 shadow-red-950/30' : v.overallStatus === 'warning' ? 'border-amber-500/50 shadow-amber-950/30' : 'border-slate-700/80'
                } rounded-xl transition-all cursor-pointer flex flex-col justify-between gap-2.5 group shadow-md hover:shadow-cyan-950/40 relative overflow-hidden`}
              >
                {/* WIDE HERO CAR IMAGE BANNER */}
                <div className="relative w-full h-28 bg-slate-950 overflow-hidden flex items-center justify-center">
                  {v.imageUrl && !failedImages[v.id] ? (
                    <img 
                      src={v.imageUrl} 
                      alt={v.model}
                      referrerPolicy="no-referrer"
                      onError={() => handleImageError(v.id)}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className={`w-full h-full bg-gradient-to-r ${v.typeMeta.gradient} flex items-center justify-center`}>
                      <div className="text-4xl drop-shadow group-hover:scale-110 transition-transform">{v.typeMeta.icon}</div>
                    </div>
                  )}
                  {/* Overlay shadow */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-black/40 pointer-events-none" />

                  {/* Top Bar on Image: License Plate + Compact Status Badge */}
                  <div className="absolute top-2 left-2.5 right-2.5 flex items-center justify-between gap-1 z-10">
                    <span className="px-2 py-0.5 bg-slate-950/90 border border-slate-700 text-cyan-300 font-mono text-xs font-bold rounded shadow-md backdrop-blur-sm">
                      {v.licensePlate}
                    </span>
                    {getStatusBadge(v.overallStatus)}
                  </div>

                  {/* Bottom Bar on Image: Model Name & Type */}
                  <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between z-10">
                    <h4 className="text-xs font-bold text-white drop-shadow truncate">{v.model}</h4>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border backdrop-blur-sm ${v.typeMeta.badgeBg}`}>
                      {v.typeMeta.typeLabel}
                    </span>
                  </div>
                </div>

                {/* Card Body Padding Area */}
                <div className="p-3 pt-0 flex flex-col gap-2">
                  {/* ENLARGED & PROMINENT RISK REASON BADGES */}
                  {v.riskReasons && v.riskReasons.length > 0 ? (
                    <div className="flex flex-col gap-1.5">
                      {v.riskReasons.map((reason, rIdx) => (
                        <div 
                          key={rIdx}
                          className={`text-xs px-2.5 py-1.5 rounded-lg font-bold flex items-center gap-2 border shadow-sm ${
                            reason.level === 'danger'
                              ? 'bg-red-950/90 border-red-500/60 text-red-200 shadow-red-950/30'
                              : reason.level === 'warning'
                              ? 'bg-amber-950/90 border-amber-500/60 text-amber-200 shadow-amber-950/30'
                              : 'bg-slate-800 border-slate-700 text-slate-300'
                          }`}
                        >
                          {reason.level === 'danger' && <AlertCircle size={14} className="text-red-400 shrink-0 animate-pulse" />}
                          {reason.level === 'warning' && <AlertTriangle size={14} className="text-amber-400 shrink-0" />}
                          {reason.level === 'info' && <Info size={14} className="text-cyan-400 shrink-0" />}
                          <span className="truncate leading-snug">{reason.message}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[11px] text-emerald-400 font-semibold px-2 py-1 bg-emerald-950/30 border border-emerald-800/40 rounded-lg flex items-center gap-1.5">
                      <CheckCircle2 size={13} /> เอกสารและสถานะอยู่ในเกณฑ์ปกติ
                    </div>
                  )}

                  {/* Key Stats Bar */}
                  <div className="grid grid-cols-2 gap-1.5 text-[10px] text-gray-400 bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                    <div>
                      <span>เลขไมล์ล่าสุด:</span>
                      <div className="font-mono font-bold text-gray-200 truncate">{v.lastMileage} กม.</div>
                    </div>
                    <div>
                      <span>พ.ร.บ./ภาษี:</span>
                      <div className={`font-mono font-bold truncate ${
                        v.taxStatus.status === 'danger' ? 'text-red-400 font-extrabold' : v.taxStatus.status === 'warning' ? 'text-amber-400' : 'text-gray-200'
                      }`}>
                        {v.taxExpireDate}
                      </div>
                    </div>
                  </div>

                  <div className="text-[10px] text-cyan-400 font-semibold text-right group-hover:underline flex items-center justify-end gap-1">
                    คลิกเพื่อดูประวัติรายคัน ➔
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default VehicleDashboardPanel;
