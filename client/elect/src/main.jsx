import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './utils/axiosConfig'; // attaches JWT token to every axios request
import './index.css'; // global styles (optional, remove if not using)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);