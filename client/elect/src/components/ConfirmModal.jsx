import { AlertTriangle } from 'lucide-react';

const ConfirmModal = ({ title, message, confirmLabel = 'Confirm', danger = false, onConfirm, onCancel }) => {
  return (
    <div style={styles.overlay} onClick={onCancel}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={{ ...styles.iconWrap, backgroundColor: danger ? '#fee2e2' : '#E6F1FB' }}>
          <AlertTriangle size={20} color={danger ? '#dc2626' : '#378ADD'} />
        </div>

        <h3 style={{ margin: '12px 0 6px' }}>{title}</h3>
        <p style={{ color: '#666', fontSize: '14px', margin: '0 0 20px' }}>{message}</p>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button style={styles.cancelBtn} onClick={onCancel}>
            Cancel
          </button>
          <button
            style={{ ...styles.confirmBtn, backgroundColor: danger ? '#dc2626' : '#2563eb' }}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 200,
  },
  modal: {
    backgroundColor: '#fff', borderRadius: '12px', padding: '20px',
    width: '320px', textAlign: 'center',
  },
  iconWrap: {
    width: '40px', height: '40px', borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    margin: '0 auto',
  },
  cancelBtn: {
    flex: 1, padding: '10px', backgroundColor: '#f4f4f4', color: '#333',
    border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px',
  },
  confirmBtn: {
    flex: 1, padding: '10px', color: '#fff',
    border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold',
  },
};

export default ConfirmModal;