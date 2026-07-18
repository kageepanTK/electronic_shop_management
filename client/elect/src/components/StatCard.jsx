const StatCard = ({ icon, label, value, trend, trendUp, color }) => {
  return (
    <div style={{ ...styles.card, backgroundColor: color.bg }}>
      <div style={{ ...styles.iconWrap, backgroundColor: color.icon }}>{icon}</div>
      <p style={styles.label}>{label}</p>
      <p style={styles.value}>{value}</p>
      <p style={{ ...styles.trend, color: trendUp ? '#16a34a' : '#dc2626' }}>
        {trendUp ? '↑' : '↓'} {trend} than last month
      </p>
    </div>
  );
};

const styles = {
  card: { borderRadius: '12px', padding: '16px', flex: 1 },
  iconWrap: {
    width: '32px', height: '32px', borderRadius: '8px',
    display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px',
  },
  label: { fontSize: '13px', color: '#666', margin: '0 0 4px' },
  value: { fontSize: '22px', fontWeight: 'bold', margin: '0 0 4px' },
  trend: { fontSize: '12px', margin: 0 },
};

export default StatCard;