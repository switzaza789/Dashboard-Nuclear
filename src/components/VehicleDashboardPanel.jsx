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

  const getStatusBadge = (status, compact = false) => {
    if (status === 'danger') {
      return (
        <span className={`inline-flex items-center gap-1 rounded-md bg-red-500/20 text-red-400 border border-red-500/40 font-bold shrink-0 ${compact ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-0.5 text-[10px]'}`}>
          <AlertCircle size={compact ? 10 : 11} /> เสี่ยงสูง
        </span>
      );
    }
    if (status === 'warning') {
      return (
        <span className={`inline-flex items-center gap-1 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/40 font-bold shrink-0 ${compact ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-0.5 text-[10px]'}`}>
          <AlertTriangle size={compact ? 10 : 11} /> เตือน
        </span>
      );
    }
    return (
      <span className={`inline-flex items-center gap-1 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold shrink-0 ${compact ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-0.5 text-[10px]'}`}>
        <CheckCircle2 size={compact ? 10 : 11} /> ปกติ
      </span>
    );
  };

  return (
    <div 
      id={`dashboard-slot-${slotNumber}`}
      className="glass-panel flex flex-col min-w-0 min-h-0 h-full border border-white/10 bg-slate-900/60 rounded-2xl relative overflow-hidden p-3 backdrop-blur-md"
    >
      {/* Panel Header */}
      <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-800/80 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shrink-0">
            <Car size={16} />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs font-bold text-gray-100 truncate flex items-center gap-1.5">
              ยานพาหนะ & พ.ร.บ./ภาษี
              <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono">
                SLOT {slotNumber}
              </span>
            </h3>
            <p className="text-[10px] text-gray-400 truncate">
              {selectedVehicle ? `กำลังแสดง: ${selectedVehicle.licensePlate} (${selectedVehicle.model})` : `แสดงครบทุกคัน (${vehicles.length} คันในหน้าเดียว)`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {selectedVehicle && (
            <button
              onClick={() => setSelectedVehicleId(null)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 text-[11px] font-medium border border-slate-700 transition-colors cursor-pointer"
            >
              <ArrowLeft size={12} /> ทั้งหมด
            </button>
          )}
          <button
            onClick={loadData}
            disabled={loading}
            className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer disabled:opacity-50"
            title="รีเฟรชข้อมูลรถยนต์"
          >
            <RefreshCw size={13} className={loading ? "animate-spin text-cyan-400" : ""} />
          </button>
        </div>
      </div>

      {/* 📊 RISK SUMMARY COUNTER BAR */}
      {!loading && !selectedVehicle && (
        <div className="flex items-center justify-between gap-1 px-2 py-1 bg-slate-950/80 border border-slate-800 rounded-lg mb-2 shrink-0 shadow-inner text-[10px]">
          <div className="flex items-center gap-1.5 flex-wrap">
            {riskSummary.danger > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-red-950/90 border border-red-500/50 text-red-300 font-bold flex items-center gap-1">
                🔴 หมดอายุ {riskSummary.danger}
              </span>
            )}
            {riskSummary.warning > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-amber-950/90 border border-amber-500/50 text-amber-300 font-bold flex items-center gap-1">
                🟡 ใกล้เตือน {riskSummary.warning}
              </span>
            )}
            <span className="px-1.5 py-0.5 rounded bg-emerald-950/90 border border-emerald-500/50 text-emerald-300 font-bold flex items-center gap-1">
              🟢 ปกติ {riskSummary.normal}
            </span>
          </div>

          <span className="text-[10px] text-gray-400 font-mono">
            รวม {riskSummary.total} คัน
          </span>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 min-h-0 relative overflow-hidden flex flex-col">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full py-12">
            <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mb-2"></div>
            <p className="text-xs text-gray-400">กำลังโหลดข้อมูล...</p>
          </div>
        ) : selectedVehicle ? (
          /* ======================================================== */
          /* 📌 SINGLE CAR DETAIL VIEW (Scrollable inside detail view) */
          /* ======================================================== */
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 flex flex-col gap-3 animate-in fade-in duration-200">
            {/* Wide Hero Image Banner */}
            <div className="relative w-full h-32 rounded-xl overflow-hidden border border-slate-700/80 bg-slate-950 flex items-center justify-center shadow-lg group shrink-0">
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
                  <div className="text-4xl drop-shadow-lg">{selectedVehicle.typeMeta.icon}</div>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent pointer-events-none" />
              
              <div className="absolute bottom-2 left-2.5 right-2.5 flex items-end justify-between gap-2 z-10">
                <div>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="px-2 py-0.5 bg-cyan-950/90 border border-cyan-500/50 text-cyan-300 font-bold text-xs rounded font-mono tracking-wider shadow-md backdrop-blur-sm">
                      {selectedVehicle.licensePlate}
                    </span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border backdrop-blur-sm ${selectedVehicle.typeMeta.badgeBg}`}>
                      {selectedVehicle.typeMeta.typeLabel}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-gray-200 drop-shadow truncate">
                    {selectedVehicle.model}
                  </h4>
                </div>
                <div>{getStatusBadge(selectedVehicle.overallStatus)}</div>
              </div>
            </div>

            {/* Prominent Risk Reasons */}
            {selectedVehicle.riskReasons && selectedVehicle.riskReasons.length > 0 && (
              <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800 flex flex-col gap-1.5 shrink-0">
                <div className="text-xs font-bold text-gray-200 flex items-center gap-1.5 border-b border-slate-800 pb-1">
                  <ShieldAlert size={14} className="text-red-400" />
                  <span>รายการแจ้งเตือนสาเหตุความเสี่ยง:</span>
                </div>
                <div className="flex flex-col gap-1">
                  {selectedVehicle.riskReasons.map((reason, idx) => (
                    <div 
                      key={idx}
                      className={`text-xs px-2.5 py-1.5 rounded-lg border font-bold flex items-center gap-2 shadow-md ${
                        reason.level === 'danger'
                          ? 'bg-red-950/90 border-red-500/60 text-red-200 shadow-red-950/40'
                          : reason.level === 'warning'
                          ? 'bg-amber-950/90 border-amber-500/60 text-amber-200 shadow-amber-950/40'
                          : 'bg-slate-800 border-slate-700 text-slate-200'
                      }`}
                    >
                      {reason.level === 'danger' && <AlertCircle size={14} className="text-red-400 shrink-0 animate-pulse" />}
                      {reason.level === 'warning' && <AlertTriangle size={14} className="text-amber-400 shrink-0" />}
                      {reason.level === 'info' && <Info size={14} className="text-cyan-400 shrink-0" />}
                      <span className="leading-snug">{reason.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SECTION 1: การเช็คระยะ & เลขไมล์ */}
            <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800 flex flex-col gap-2 shrink-0">
              <div className="flex items-center justify-between border-b border-slate-800 pb-1">
                <div className="flex items-center gap-1.5 text-cyan-400 font-semibold text-xs">
                  <Gauge size={14} />
                  <span>1. การเช็คระยะ & เลขไมล์ล่าสุด</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-800/60 p-2 rounded-lg border border-slate-700/60">
                  <span className="text-[10px] text-gray-400 flex items-center gap-1">
                    <Calendar size={11} className="text-cyan-400" /> วันที่เช็คระยะล่าสุด
                  </span>
                  <div className="text-xs font-bold text-gray-200 mt-0.5">
                    {selectedVehicle.lastServiceDate || '-'}
                  </div>
                </div>
                <div className="bg-slate-800/60 p-2 rounded-lg border border-slate-700/60">
                  <span className="text-[10px] text-gray-400 flex items-center gap-1">
                    <Gauge size={11} className="text-blue-400" /> เลขไมล์ที่เช็คล่าสุด
                  </span>
                  <div className="text-xs font-bold text-gray-200 mt-0.5 font-mono">
                    {selectedVehicle.lastMileage} {selectedVehicle.lastMileage !== '-' ? 'กม.' : ''}
                  </div>
                </div>
              </div>

              {selectedVehicle.nextServiceStatus && (
                <div className={`p-2 rounded-lg border flex items-center justify-between text-xs font-medium ${
                  selectedVehicle.nextServiceStatus.status === 'warning' 
                    ? 'bg-amber-950/40 border-amber-500/40 text-amber-300' 
                    : 'bg-slate-800/50 border-slate-700 text-gray-300'
                }`}>
                  <span className="flex items-center gap-1 text-[10px]">
                    <Clock size={12} className="text-cyan-400" />
                    รอบเช็คระยะถัดไป (+6 เดือน):
                  </span>
                  <span className="font-bold font-mono text-[11px]">
                    {selectedVehicle.nextServiceStatus.nextDateStr}
                  </span>
                </div>
              )}
            </div>

            {/* SECTION 2: สถานะการเปลี่ยนอะไหล่ */}
            <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800 flex flex-col gap-2 shrink-0">
              <div className="flex items-center gap-1.5 text-cyan-400 font-semibold text-xs border-b border-slate-800 pb-1">
                <Wrench size={14} />
                <span>2. ประวัติเปลี่ยนอะไหล่ & อุปกรณ์</span>
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between p-1.5 rounded-lg bg-slate-800/50 border border-slate-700/50 text-xs">
                  <div className="flex items-center gap-1.5">
                    <Wrench size={12} className="text-amber-400" />
                    <span className="text-gray-300 font-medium">ยางรถยนต์:</span>
                  </div>
                  <span className="font-semibold text-gray-200">{selectedVehicle.tireDate}</span>
                </div>

                <div className="flex items-center justify-between p-1.5 rounded-lg bg-slate-800/50 border border-slate-700/50 text-xs">
                  <div className="flex items-center gap-2">
                    <Wrench size={12} className="text-cyan-400" />
                    <span className="text-gray-300 font-medium">ยางปัดน้ำฝน:</span>
                  </div>
                  <span className="font-semibold text-gray-200">{selectedVehicle.wiperDate}</span>
                </div>

                <div className="flex items-center justify-between p-1.5 rounded-lg bg-slate-800/50 border border-slate-700/50 text-xs">
                  <div className="flex items-center gap-2">
                    <Battery size={12} className="text-emerald-400" />
                    <span className="text-gray-300 font-medium">แบตเตอรี่:</span>
                  </div>
                  <span className="font-semibold text-gray-200">{selectedVehicle.batteryDate}</span>
                </div>
              </div>
            </div>

            {/* SECTION 3: เอกสารสำคัญ & วันหมดอายุ */}
            <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800 flex flex-col gap-2 shrink-0">
              <div className="flex items-center gap-1.5 text-cyan-400 font-semibold text-xs border-b border-slate-800 pb-1">
                <ShieldAlert size={14} />
                <span>3. เอกสารสำคัญ & วันหมดอายุ</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className={`p-2 rounded-lg border flex flex-col gap-0.5 ${
                  selectedVehicle.taxStatus.status === 'danger' 
                    ? 'bg-red-950/30 border-red-500/40 text-red-300' 
                    : selectedVehicle.taxStatus.status === 'warning'
                    ? 'bg-amber-950/30 border-amber-500/40 text-amber-300'
                    : 'bg-slate-800/60 border-slate-700/60 text-gray-200'
                }`}>
                  <span className="text-[10px] text-gray-400">วันหมดอายุ พ.ร.บ. / ภาษี</span>
                  <span className="text-xs font-bold font-mono">{selectedVehicle.taxExpireDate}</span>
                  <span className="text-[10px] font-semibold">{selectedVehicle.taxStatus.text}</span>
                </div>

                <div className={`p-2 rounded-lg border flex flex-col gap-0.5 ${
                  selectedVehicle.insuranceStatus.status === 'danger' 
                    ? 'bg-red-950/30 border-red-500/40 text-red-300' 
                    : selectedVehicle.insuranceStatus.status === 'warning'
                    ? 'bg-amber-950/30 border-amber-500/40 text-amber-300'
                    : 'bg-slate-800/60 border-slate-700/60 text-gray-200'
                }`}>
                  <span className="text-[10px] text-gray-400">วันหมดอายุ ประกันภัย</span>
                  <span className="text-xs font-bold font-mono">{selectedVehicle.insuranceExpireDate}</span>
                  <span className="text-[10px] font-semibold">{selectedVehicle.insuranceStatus.text}</span>
                </div>
              </div>
            </div>

          </div>
        ) : (
          /* ======================================================== */
          /* 📌 3x3 GRID TILES LAYOUT (NO SCROLL - FITS ALL CARS) */
          /* ======================================================== */
          <div className="grid grid-cols-3 gap-1.5 h-full min-h-0">
            {vehicles.slice(0, 9).map(v => {
              const primaryRisk = v.riskReasons && v.riskReasons.length > 0 ? v.riskReasons[0] : null;

              return (
                <div
                  key={v.id}
                  onClick={() => setSelectedVehicleId(v.id)}
                  className={`bg-slate-950/90 hover:bg-slate-800/90 border ${
                    v.overallStatus === 'danger' 
                      ? 'border-red-500/60 shadow-[0_0_8px_rgba(239,68,68,0.25)]' 
                      : v.overallStatus === 'warning' 
                      ? 'border-amber-500/60 shadow-[0_0_8px_rgba(245,158,11,0.25)]' 
                      : 'border-slate-800/90 hover:border-cyan-500/50'
                  } rounded-xl p-1.5 flex flex-col justify-between transition-all cursor-pointer group relative overflow-hidden select-none`}
                >
                  {/* Top Image / Icon Header */}
                  <div className="relative w-full h-14 bg-slate-900 rounded-lg overflow-hidden flex items-center justify-center shrink-0">
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
                        <span className="text-xl drop-shadow">{v.typeMeta.icon}</span>
                      </div>
                    )}
                    
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-black/30 pointer-events-none" />

                    {/* Top Status Indicator Dot */}
                    <div className="absolute top-1 right-1 z-10">
                      {v.overallStatus === 'danger' && (
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping inline-block shadow-[0_0_8px_#ef4444]" />
                      )}
                      {v.overallStatus === 'warning' && (
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block shadow-[0_0_8px_#f59e0b]" />
                      )}
                      {v.overallStatus === 'normal' && (
                        <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                      )}
                    </div>

                    {/* License Plate Badge */}
                    <div className="absolute bottom-1 left-1 z-10">
                      <span className="px-1.5 py-0.5 bg-slate-950/90 border border-slate-700 text-cyan-300 font-mono text-[10px] font-bold rounded shadow backdrop-blur-sm">
                        {v.licensePlate}
                      </span>
                    </div>
                  </div>

                  {/* Tile Bottom Info */}
                  <div className="flex flex-col justify-between flex-1 mt-1 min-h-0">
                    <div className="min-w-0">
                      <h4 className="text-[10px] font-bold text-gray-200 truncate leading-tight">
                        {v.model}
                      </h4>
                    </div>

                    {/* Primary Risk Message (If Danger/Warning) */}
                    {primaryRisk ? (
                      <div className={`text-[9px] px-1 py-0.5 rounded font-bold truncate mt-0.5 flex items-center gap-1 ${
                        primaryRisk.level === 'danger' 
                          ? 'bg-red-950/90 text-red-300 border border-red-500/40' 
                          : 'bg-amber-950/90 text-amber-300 border border-amber-500/40'
                      }`}>
                        <AlertCircle size={9} className="shrink-0" />
                        <span className="truncate">{primaryRisk.message}</span>
                      </div>
                    ) : (
                      <div className="text-[9px] text-gray-400 font-mono truncate mt-0.5">
                        ไมล์ {v.lastMileage}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default VehicleDashboardPanel;
