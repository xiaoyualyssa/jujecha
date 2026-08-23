import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import RecordPage from './pages/Record'
import AnalysisPage from './pages/Analysis'
import ReviewPage from './pages/Review'
import ActionsPage from './pages/Actions'
import ToolboxPage from './pages/Toolbox'
import SettingsPage from './pages/Settings'
import MePage from './pages/Me'
import AuthPage from './pages/Auth'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/record" element={<RecordPage />} />
        <Route path="/review" element={<ReviewPage />} />
        <Route path="/analysis" element={<AnalysisPage />} />
        <Route path="/me" element={<MePage />} />
        <Route path="/actions" element={<ActionsPage />} />
        <Route path="/toolbox" element={<ToolboxPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/auth/login" element={<AuthPage mode="login" />} />
        <Route path="/auth/register" element={<AuthPage mode="register" />} />
        <Route path="*" element={<Dashboard />} />
      </Routes>
    </Layout>
  )
}
