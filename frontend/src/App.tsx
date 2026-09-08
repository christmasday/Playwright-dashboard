import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Common/Layout';
import RequireAuth from './components/Auth/RequireAuth';
import PublicOnly from './components/Auth/PublicOnly';
import Dashboard from './pages/Dashboard';
import Analytics from './pages/Analytics';
import Builds from './pages/Builds';
import BuildDetails from './pages/BuildDetails';
import BuildCompare from './pages/BuildCompare';
import Projects from './pages/Projects';
import TestDetails from './pages/TestDetails';
import FlakyTests from './pages/FlakyTests';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import UserManagement from './pages/UserManagement';
import ProfileSettings from './pages/ProfileSettings';
import AlertSettings from './pages/AlertSettings';
import UserSettings from './pages/UserSettings';
import VerifyEmail from './pages/VerifyEmail';
import Docs from './pages/Docs';
import './styles/globals.css';

const LandingRedirect = () => {
  window.location.replace('/landing.html');
  return null;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingRedirect />} />
        <Route
          path="/login"
          element={
            <PublicOnly>
              <Login />
            </PublicOnly>
          }
        />
        <Route
          path="/signup"
          element={
            <PublicOnly>
              <Signup />
            </PublicOnly>
          }
        />
        <Route path="/docs" element={<Docs />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route
          path="/*"
          element={
            <RequireAuth>
              <Layout>
                <Routes>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/projects" element={<Projects />} />
                  <Route path="/projects/:projectId/builds" element={<Builds />} />
                  <Route path="/projects/:projectId" element={<Builds />} />
                  <Route path="/builds" element={<Builds />} />
                  <Route path="/builds/compare" element={<BuildCompare />} />
                  <Route path="/builds/:buildId" element={<BuildDetails />} />
                  <Route path="/tests/:testId" element={<TestDetails />} />
                  <Route path="/flaky-tests" element={<FlakyTests />} />
                  <Route path="/alerts" element={<AlertSettings />} />
                  <Route path="/settings/alerts" element={<AlertSettings />} />
                  <Route path="/integrations" element={<UserSettings initialTab="integrations" />} />
                  <Route path="/settings/integrations" element={<UserSettings initialTab="integrations" />} />
                  <Route path="/storage" element={<UserSettings initialTab="storage" />} />
                  <Route path="/settings/storage" element={<UserSettings initialTab="storage" />} />
                  <Route path="/settings/ai" element={<UserSettings initialTab="ai" />} />
                  <Route path="/settings/notifications" element={<UserSettings initialTab="notifications" />} />
                  <Route path="/settings/api-keys" element={<UserSettings initialTab="api-keys" />} />
                  <Route path="/api-keys" element={<UserSettings initialTab="api-keys" />} />
                  <Route path="/users" element={<UserManagement />} />
                  <Route path="/settings/profile" element={<ProfileSettings />} />
                  <Route path="/profile" element={<ProfileSettings />} />
                  <Route path="/settings" element={<UserSettings />} />
                  <Route path="/docs" element={<Docs />} />
                </Routes>
              </Layout>
            </RequireAuth>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;