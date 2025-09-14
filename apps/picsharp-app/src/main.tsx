import './utils/tray';
import './utils/menu';
import './i18n';
import './store/settings';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

console.log('main', import.meta.env.VITE_SENTRY_DSN);

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(<App />);
