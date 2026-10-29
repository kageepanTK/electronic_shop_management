export const customerCode = (id) => `C-${String(id).padStart(4, '0')}`;
export const money = (v) => `$${(parseFloat(v) || 0).toFixed(2)}`;
export const lkr = (v) =>
  `LKR ${(Number(v) || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;