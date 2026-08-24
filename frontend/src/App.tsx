import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Common/Layout';
import RequireAuth from './components/Auth/RequireAuth';
import PublicOnly from './components/Auth/PublicOnly';
import Dashboard from './pages/Dashboard';
import Analytics from './pages/Analytics';
import Builds from './pages/Builds';
import BuildDetails from './pages/BuildDetails';
import Projects from './pages/Projects';
import TestDetails from './pages/TestDetails';
import FlakyTests from './pages/FlakyTests';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import UserManagement from './pages/UserManagement';
import ApiKeys from './pages/ApiKeys';
import ProfileSettings from './pages/ProfileSettings';
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
                  <Route path="/builds/:buildId" element={<BuildDetails />} />
                  <Route path="/tests/:testId" element={<TestDetails />} />
                  <Route path="/flaky-tests" element={<FlakyTests />} />
                  <Route path="/users" element={<UserManagement />} />
                  <Route path="/settings/api-keys" element={<ApiKeys />} />
                  <Route path="/settings/profile" element={<ProfileSettings />} />
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