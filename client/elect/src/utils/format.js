export const customerCode = (id) => `C-${String(id).padStart(4, '0')}`;
export const money = (v) => `$${(parseFloat(v) || 0).toFixed(2)}`;