import { useState, useEffect } from 'react';
import { 
  X, UserPlus, RefreshCw, CheckCircle2, AlertCircle, 
  Trash2, Edit2, Check, ShieldCheck, ShieldAlert, Users, Mail, User, AlertTriangle
} from 'lucide-react';
import { 
  fetchAllEmployeesConfig, 
  addEmployee, 
  updateEmployee, 
  toggleEmployeeStatus, 
  deleteEmployee,
  syncAllCalendars 
} from '../api/calendar';

const ManageEmployeesModal = ({ isOpen, onClose, onRefreshData, showToast }) => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  
  // Custom Confirmation Dialog State
  const [confirmDeleteTarget, setConfirmDeleteTarget] = useState(null);

  // New Employee Form State
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newStatus, setNewStatus] = useState('Active');

  // Inline Editing State
  const [editingIndex, setEditingIndex] = useState(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editStatus, setEditStatus] = useState('Active');

  const loadConfig = async () => {
    setLoading(true);
    try {
      const data = await fetchAllEmployeesConfig(true);
      setEmployees(data);
    } catch (err) {
      console.error('Error fetching employees config:', err);
      showToast?.('ไม่สามารถโหลดข้อมูล Config พนักงานได้', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadConfig();
      setIsAdding(false);
      setEditingIndex(null);
      setConfirmDeleteTarget(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // ⚡ Optimistic Status Toggle (Instant 0.01s UI update)
  const handleToggleStatus = async (emp) => {
    const prevEmployees = [...employees];
    const newStatus = emp.status === 'Active' ? 'Inactive' : 'Active';

    // 1. Update UI immediately
    setEmployees(current => current.map(item => 
      item.email === emp.email ? { ...item, status: newStatus } : item
    ));

    try {
      setSaving(true);
      await toggleEmployeeStatus(emp.name, emp.email, emp.status);
      showToast?.(`เปลี่ยนสถานะ ${emp.name} เป็น ${newStatus} เรียบร้อย`, 'success');
      onRefreshData?.();
    } catch (err) {
      console.error('Error toggling status:', err);
      // Rollback on error
      setEmployees(prevEmployees);
      showToast?.('เกิดข้อผิดพลาดในการเปลี่ยนสถานะ (ย้อนกลับค่าเดิม)', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ⚡ Optimistic Add Employee
  const handleAddEmployee = async (e) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) {
      showToast?.('กรุณากรอกชื่อและอีเมลให้ครบถ้วน', 'warning');
      return;
    }

    const newItem = {
      rowIndex: employees.length + 2,
      name: newName.trim(),
      email: newEmail.trim(),
      status: newStatus,
      department: 'General'
    };

    const prevEmployees = [...employees];
    // Immediate UI update
    setEmployees(prev => [...prev, newItem]);
    setIsAdding(false);
    setNewName('');
    setNewEmail('');

    try {
      setSaving(true);
      await addEmployee({
        name: newItem.name,
        email: newItem.email,
        status: newItem.status
      });
      showToast?.(`เพิ่มพนักงาน ${newItem.name} เรียบร้อย`, 'success');
      onRefreshData?.();
    } catch (err) {
      console.error('Error adding employee:', err);
      setEmployees(prevEmployees);
      showToast?.('เกิดข้อผิดพลาดในการเพิ่มพนักงาน (ย้อนกลับค่าเดิม)', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleStartEdit = (emp, index) => {
    setEditingIndex(index);
    setEditName(emp.name);
    setEditEmail(emp.email);
    setEditStatus(emp.status);
  };

  // ⚡ Optimistic Edit Employee
  const handleSaveEdit = async (emp) => {
    if (!editName.trim() || !editEmail.trim()) {
      showToast?.('ชื่อและอีเมลต้องไม่เป็นค่าว่าง', 'warning');
      return;
    }

    const prevEmployees = [...employees];
    // Immediate UI update
    setEmployees(current => current.map((item, idx) => 
      idx === editingIndex 
        ? { ...item, name: editName.trim(), email: editEmail.trim(), status: editStatus } 
        : item
    ));
    setEditingIndex(null);

    try {
      setSaving(true);
      await updateEmployee({
        originalName: emp.name,
        originalEmail: emp.email,
        name: editName.trim(),
        email: editEmail.trim(),
        status: editStatus
      });
      showToast?.(`บันทึกการแก้ไข ${editName} เรียบร้อย`, 'success');
      onRefreshData?.();
    } catch (err) {
      console.error('Error updating employee:', err);
      setEmployees(prevEmployees);
      showToast?.('เกิดข้อผิดพลาดในการแก้ไขข้อมูล (ย้อนกลับค่าเดิม)', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ⚡ Optimistic Delete Employee (Triggered after custom in-app confirmation)
  const handleExecuteDelete = async () => {
    if (!confirmDeleteTarget) return;
    const target = confirmDeleteTarget;
    setConfirmDeleteTarget(null);

    const prevEmployees = [...employees];
    // Immediate UI removal
    setEmployees(current => current.filter(item => item.email !== target.email && item.name !== target.name));

    try {
      setSaving(true);
      await deleteEmployee(target.name, target.email);
      showToast?.(`ลบ ${target.name} เรียบร้อย`, 'success');
      onRefreshData?.();
    } catch (err) {
      console.error('Error deleting employee:', err);
      setEmployees(prevEmployees);
      showToast?.('เกิดข้อผิดพลาดในการลบข้อมูล (ย้อนกลับค่าเดิม)', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSyncAll = async () => {
    try {
      setSaving(true);
      await syncAllCalendars();
      showToast?.('ซิงค์ปฏิทินพนักงาน Active ทั้งหมดเรียบร้อยแล้ว', 'success');
      onRefreshData?.();
    } catch (err) {
      console.error('Sync error:', err);
      showToast?.('เกิดข้อผิดพลาดในการซิงค์ปฏิทิน', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="glass-panel w-full max-w-2xl bg-slate-900/95 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Users size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-100 flex items-center gap-2">
                จัดการรายชื่อพนักงาน & สถานะ (Config)
              </h2>
              <p className="text-xs text-gray-400">
                ตอบสนองแบบ Real-Time พร้อมซิงค์ตรงกับ Google Sheets
              </p>
            </div>
          </div>
          
          <button 
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-white/5 bg-slate-950/40 gap-3">
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <UserPlus size={14} />
            <span>{isAdding ? 'ปิดฟอร์มเพิ่มพนักงาน' : '+ เพิ่มพนักงานใหม่'}</span>
          </button>

          <button
            onClick={handleSyncAll}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer"
            title="ดึงข้อมูลจาก Google Calendar ของพนักงาน Active ทุกคนลงชีตใหม่"
          >
            <RefreshCw size={13} className={saving ? 'animate-spin' : ''} />
            <span>ซิงค์ปฏิทิน Active</span>
          </button>
        </div>

        {/* Add Employee Form Drawer */}
        {isAdding && (
          <form onSubmit={handleAddEmployee} className="p-4 bg-cyan-950/20 border-b border-cyan-500/20 flex flex-col gap-3 animate-in slide-in-from-top-2 duration-200">
            <h3 className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
              <UserPlus size={14} /> ข้อมูลพนักงานใหม่
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] text-gray-400 block mb-1">ชื่อพนักงาน / ชื่อแท็บ</label>
                <input 
                  type="text" 
                  placeholder="เช่น Somchai" 
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-slate-900/90 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] text-gray-400 block mb-1">อีเมล Google Calendar</label>
                <input 
                  type="email" 
                  placeholder="somchai@nuclear-system.com" 
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full bg-slate-900/90 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] text-gray-400 block mb-1">สถานะเริ่มต้น</label>
                <select 
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full bg-slate-900/90 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
                >
                  <option value="Active">🟢 Active (แสดงบนตาราง)</option>
                  <option value="Inactive">🔴 Inactive (ซ่อน)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-1">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-3 py-1 text-xs text-gray-400 hover:text-white rounded-lg cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-lg shadow-md transition-all cursor-pointer"
              >
                {saving ? 'กำลังบันทึก...' : 'บันทึกพนักงานใหม่'}
              </button>
            </div>
          </form>
        )}

        {/* Employee List Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-3">
          {loading ? (
            <div className="py-12 text-center text-xs text-gray-400 flex flex-col items-center gap-2">
              <RefreshCw className="animate-spin text-cyan-400" size={20} />
              <span>กำลังโหลดข้อมูล Config จาก Google Sheets...</span>
            </div>
          ) : employees.length === 0 ? (
            <div className="py-12 text-center text-xs text-gray-400">
              ไม่พบข้อมูลพนักงานในแท็บ Config
            </div>
          ) : (
            employees.map((emp, index) => {
              const isEditing = editingIndex === index;
              const isActive = emp.status === 'Active';

              if (isEditing) {
                return (
                  <div key={`edit-${index}`} className="p-3.5 rounded-xl border border-cyan-500/40 bg-cyan-950/20 flex flex-col gap-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div>
                        <span className="text-[10px] text-gray-400">ชื่อ</span>
                        <input 
                          type="text" 
                          value={editName} 
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full bg-slate-900 border border-white/20 rounded-lg px-2.5 py-1 text-xs text-white"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400">อีเมล</span>
                        <input 
                          type="email" 
                          value={editEmail} 
                          onChange={(e) => setEditEmail(e.target.value)}
                          className="w-full bg-slate-900 border border-white/20 rounded-lg px-2.5 py-1 text-xs text-white"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400">สถานะ</span>
                        <select 
                          value={editStatus} 
                          onChange={(e) => setEditStatus(e.target.value)}
                          className="w-full bg-slate-900 border border-white/20 rounded-lg px-2.5 py-1 text-xs text-white cursor-pointer"
                        >
                          <option value="Active">🟢 Active</option>
                          <option value="Inactive">🔴 Inactive</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setEditingIndex(null)}
                        className="px-2.5 py-1 text-xs text-gray-400 hover:text-white cursor-pointer"
                      >
                        ยกเลิก
                      </button>
                      <button
                        onClick={() => handleSaveEdit(emp)}
                        disabled={saving}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-lg text-xs font-bold cursor-pointer"
                      >
                        <Check size={13} strokeWidth={3} />
                        <span>บันทึก</span>
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div 
                  key={`emp-${index}`}
                  className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                    isActive 
                      ? 'border-emerald-500/20 bg-slate-800/40 hover:border-emerald-500/40' 
                      : 'border-rose-500/20 bg-slate-900/30 opacity-75 hover:opacity-100 hover:border-rose-500/40'
                  }`}
                >
                  {/* Left: Avatar & Info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 border ${
                      isActive 
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                        : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                    }`}>
                      {emp.name.substring(0, 2).toUpperCase()}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-gray-100 truncate">
                          {emp.name}
                        </span>
                        
                        {/* Status Badge Toggle */}
                        <button
                          onClick={() => handleToggleStatus(emp)}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-all inline-flex items-center gap-1 cursor-pointer active:scale-95 ${
                            isActive
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20'
                          }`}
                          title="คลิกเพื่อสลับสถานะทันที"
                        >
                          {isActive ? <ShieldCheck size={11} /> : <ShieldAlert size={11} />}
                          <span>{emp.status}</span>
                        </button>
                      </div>

                      <p className="text-xs text-gray-400 truncate flex items-center gap-1 mt-0.5">
                        <Mail size={11} className="text-gray-500" />
                        <span>{emp.email}</span>
                      </p>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleStartEdit(emp, index)}
                      className="p-1.5 text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-colors cursor-pointer"
                      title="แก้ไขข้อมูล"
                    >
                      <Edit2 size={14} />
                    </button>

                    <button
                      onClick={() => setConfirmDeleteTarget(emp)}
                      className="p-1.5 text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                      title="ลบออกจากระบบ"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-white/10 bg-slate-800/40 flex justify-between items-center text-xs text-gray-400">
          <span>พนักงาน Active จะแสดงผลบนตารางงานโดยอัตโนมัติ</span>
          <button 
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-bold text-xs transition-colors cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>

        {/* 🛑 In-App Sleek Confirmation Dialog (No Browser Freeze) */}
        {confirmDeleteTarget && (
          <div className="absolute inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-slate-900 border border-rose-500/40 rounded-2xl max-w-sm w-full p-5 shadow-2xl text-center flex flex-col items-center gap-3">
              <div className="p-3 bg-rose-500/10 text-rose-400 rounded-full border border-rose-500/30">
                <AlertTriangle size={28} />
              </div>

              <div>
                <h3 className="text-base font-bold text-white">ยืนยันการลบพนักงาน?</h3>
                <p className="text-xs text-gray-400 mt-1">
                  คุณต้องการลบ <span className="text-white font-semibold underline">{confirmDeleteTarget.name}</span> ({confirmDeleteTarget.email}) ออกจากระบบ Config หรือไม่?
                </p>
              </div>

              <div className="flex gap-2 w-full mt-2">
                <button
                  type="button"
                  onClick={() => setConfirmDeleteTarget(null)}
                  className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-gray-300 text-xs font-semibold transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleExecuteDelete}
                  disabled={saving}
                  className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Trash2 size={13} />
                  <span>{saving ? 'กำลังลบ...' : 'ยืนยันการลบ'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageEmployeesModal;
