import { getDefaultDashboardLayout, validateDashboardLayout } from './dashboardLayout';

const STORAGE_KEY = 'tapo_calendar_dashboard_layout_v1';

export const loadStoredDashboardLayout = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        layout: getDefaultDashboardLayout(),
        source: 'default',
        warning: null,
      };
    }

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return {
        layout: getDefaultDashboardLayout(),
        source: 'default',
        warning: 'MALFORMED_JSON',
      };
    }

    const valResult = validateDashboardLayout(parsed);
    if (valResult.valid) {
      return {
        layout: parsed,
        source: 'storage',
        warning: null,
      };
    } else {
      const warning = valResult.reason === 'UNSUPPORTED_VERSION' ? 'UNSUPPORTED_VERSION' : 'INVALID_LAYOUT';
      return {
        layout: getDefaultDashboardLayout(),
        source: 'default',
        warning,
      };
    }
  } catch {
    return {
      layout: getDefaultDashboardLayout(),
      source: 'default',
      warning: 'STORAGE_UNAVAILABLE',
    };
  }
};

export const saveDashboardLayout = (layout) => {
  try {
    const serialized = JSON.stringify(layout);
    localStorage.setItem(STORAGE_KEY, serialized);
    return { success: true, error: null };
  } catch (err) {
    console.error('Failed to save dashboard layout:', err);
    return {
      success: false,
      error: err.name === 'QuotaExceededError' || err.code === 22 ? 'QUOTA_EXCEEDED' : 'WRITE_FAILURE',
    };
  }
};
