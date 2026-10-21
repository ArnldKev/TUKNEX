const dayFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Lima',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
function limaDay(date: Date) {
  const parts = dayFormatter.formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value || '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function quoteChartPeriods(dates: string[], range: 'week' | 'month', reference = new Date()) {
  const currentDay = limaDay(reference);
  const calendarDate = new Date(`${currentDay}T12:00:00Z`);
  const monthKey = currentDay.slice(0, 7);
  const validDays = dates
    .map((date) => new Date(date))
    .filter((date) => !Number.isNaN(date.getTime()))
    .map(limaDay);
  const monthLabel = calendarDate.toLocaleDateString('es-PE', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
  const periods = Array.from({ length: range === 'week' ? 7 : 4 }, (_, index) => {
    if (range === 'week') {
      const day = new Date(calendarDate);
      day.setUTCDate(day.getUTCDate() - 6 + index);
      const key = day.toISOString().slice(0, 10);
      return {
        count: validDays.filter((value) => value === key).length,
        label: day.toLocaleDateString('es-PE', { day: 'numeric', month: 'short', timeZone: 'UTC' }),
      };
    }
    const firstDay = index * 8 + 1;
    const lastDay = index === 3 ? 31 : firstDay + 7;
    return {
      count: validDays.filter(
        (value) =>
          value.startsWith(monthKey) &&
          Number(value.slice(-2)) >= firstDay &&
          Number(value.slice(-2)) <= lastDay,
      ).length,
      label: index === 3 ? '25–fin' : `${firstDay}–${lastDay}`,
    };
  });
  return { periods, monthLabel };
}
