import AppRoutes from './routes';
import { useEffect } from 'react';
import { useReport } from './hooks/useReport';

function App() {
  const r = useReport();
  useEffect(() => {
    r('app_started');
  }, []);
  return <AppRoutes />;
}

export default App;
