import './utils/apm';
import './utils/tray';
import './utils/menu';
import './i18n';
import './store/settings';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(<App />);
