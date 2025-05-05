import AppRoutes from './routes';
import { ThemeProvider } from './components/theme-provider';

function App() {
  return (
    <ThemeProvider>
      <AppRoutes />
    </ThemeProvider>
  );
}

export default App;
