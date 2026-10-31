const MONTHS = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
];

/** Source dates are usually `YYYY-MM-DD`; keep unknown formats untouched. */
export function formatSourceDate(value: string): string {
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);

  if (iso) {
    const year = iso[1];
    const month = Number(iso[2]);
    const day = iso[3];

    if (year && day && month >= 1 && month <= 12) {
      return `${Number(day)} ${MONTHS[month - 1]} ${year}`;
    }
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}
