import { isSameDay } from 'date-fns';

const normalize = (value) => (value || '').toString().trim().toLowerCase();

const getStatusFromText = (text) => {
  const value = normalize(text);

  if (!value) {
    return { key: 'available', label: 'Available', color: 'emerald' };
  }

  if (value.includes('ลา') || value.includes('sick') || value.includes('leave') || value.includes('vacation')) {
    return { key: 'leave', label: 'On Leave', color: 'red' };
  }

  if (value.includes('wfh') || value.includes('remote') || value.includes('บ้าน')) {
    return { key: 'wfh', label: 'Working Remotely', color: 'blue' };
  }

  if (value.includes('meeting') || value.includes('ประชุม')) {
    return { key: 'meeting', label: 'In a Meeting', color: 'pink' };
  }

  if (value.includes('office') || value.includes('ออฟฟิศ')) {
    return { key: 'office', label: 'At Office', color: 'emerald' };
  }

  return { key: 'busy', label: text, color: 'amber' };
};

export const determineEmployeeStatus = (employee, events = [], referenceDate = new Date()) => {
  const now = referenceDate;
  const todayEvents = events
    .filter((event) => isSameDay(new Date(event.start), now))
    .sort((a, b) => new Date(a.start) - new Date(b.start));

  let currentEvent = todayEvents.find((event) => {
    const start = new Date(event.start);
    const end = new Date(event.end);
    if (Number.isNaN(end.getTime())) return true;
    return now >= start && now <= end;
  });

  if (!currentEvent && todayEvents.length > 0) {
    currentEvent = todayEvents[0];
  }

  if (employee?.customStatus) {
    const custom = getStatusFromText(employee.customStatus);
    return {
      ...custom,
      label: employee.customStatus,
      source: 'custom',
      currentEvent,
      todayEvents,
      isLiveNow: todayEvents.some((event) => {
        const start = new Date(event.start);
        const end = new Date(event.end);
        return now >= start && now <= end;
      }),
    };
  }

  if (currentEvent) {
    const fromEvent = getStatusFromText(currentEvent.title);
    return {
      ...fromEvent,
      source: 'event',
      currentEvent,
      todayEvents,
      isLiveNow: todayEvents.some((event) => {
        const start = new Date(event.start);
        const end = new Date(event.end);
        return now >= start && now <= end;
      }),
    };
  }

  return {
    key: 'available',
    label: 'Available',
    color: 'emerald',
    source: 'default',
    currentEvent: null,
    todayEvents,
    isLiveNow: false,
  };
};

