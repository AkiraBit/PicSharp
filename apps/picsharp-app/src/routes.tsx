import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import AppLayout from './components/layouts/app-layout';
import Compression from './pages/compression';
import ClassicCompressionGuide from './pages/compression/classic-guide';
import WatchCompressionGuide from './pages/compression/watch-guide';
import CompressionClassic from './pages/compression/classic';
import CompressionWatch from './pages/compression/watch';
import Settings from './pages/settings';
import SettingsGeneral from './pages/settings/general';
import SettingsCompression from './pages/settings/compression';
import SettingsTinypng from './pages/settings/tinypng';
import ImageCompare from './pages/image-compare';
import { Toaster } from 'sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useTheme } from '@/components/theme-provider';

export default function AppRoutes() {
  const { theme } = useTheme();
  return (
    <TooltipProvider delayDuration={100}>
      <Toaster
        position='top-center'
        theme={theme}
        offset={{
          top: '24px',
          right: '16px',
          bottom: '24px',
          left: '16px',
        }}
      />
      <BrowserRouter>
        <Routes>
          <Route path='/' element={<AppLayout />}>
            <Route index element={<Navigate to='/compression' />} />
            <Route path='compression' element={<Compression />}>
              <Route index element={<Navigate to='/compression/classic/guide' />} />
              <Route path='classic'>
                <Route index element={<Navigate to='/compression/classic/guide' />} />
                <Route path='guide' element={<ClassicCompressionGuide />} />
                <Route path='workspace' element={<CompressionClassic />} />
              </Route>
              <Route path='watch'>
                <Route index element={<Navigate to='/compression/watch/guide' />} />
                <Route path='guide' element={<WatchCompressionGuide />} />
                <Route path='workspace' element={<CompressionWatch />} />
              </Route>
            </Route>
            <Route path='settings' element={<Settings />}>
              <Route index element={<Navigate to='/settings/general' />} />
              <Route path='general' element={<SettingsGeneral />} />
              <Route path='tinypng' element={<SettingsTinypng />} />
              <Route path='compression' element={<SettingsCompression />} />
            </Route>
            <Route path='image-compare' element={<ImageCompare />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  );
}
