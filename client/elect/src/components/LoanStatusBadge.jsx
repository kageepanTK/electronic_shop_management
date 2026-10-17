const colors = {
  PENDING: { bg: '#FAEEDA', color: '#854F0B' },
  APPROVED: { bg: '#E6F1FB', color: '#185FA5' },
  REJECTED: { bg: '#fee2e2', color: '#dc2626' },
  ACTIVE: { bg: '#E1F5EE', color: '#0F6E56' },
  OVERDUE: { bg: '#fecaca', color: '#991b1b' },
  PAID: { bg: '#EAF3DE', color: '#3B6D11' },
};

const LoanStatusBadge = ({ status }) => (
  <span
    style={{
      padding: '2px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 500,
      backgroundColor: colors[status]?.bg, color: colors[status]?.color,
    }}
  >
    {status}
  </span>
);

export default LoanStatusBadge;