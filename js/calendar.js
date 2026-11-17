export const START_YEAR=2027;
export function dateAt(day){return new Date(Date.UTC(START_YEAR,0,1+day));}
export function dateLabel(day){const d=dateAt(day);return `${d.getUTCFullYear()}.${String(d.getUTCMonth()+1).padStart(2,'0')}.${String(d.getUTCDate()).padStart(2,'0')}`;}
export const monthKey=day=>dateLabel(day).slice(0,7);
