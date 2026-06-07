/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useStore } from './store/useStore';
import Dashboard from './components/dashboard/Dashboard';
import AppShell from './components/layout/AppShell';
import { Toaster } from 'react-hot-toast';

export default function App() {
  const activeProjectId = useStore(state => state.activeProjectId);

  if (!activeProjectId) {
    return (
      <>
        <Dashboard />
        <Toaster position="bottom-right" />
      </>
    );
  }

  return (
    <>
      <AppShell />
      <Toaster position="bottom-right" />
    </>
  );
}
