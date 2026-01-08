import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import AppLayout from "./layout/AppLayout";
import RequireAuth from "./auth/RequireAuth";
import { ScrollToTop } from "./components/common/ScrollToTop";

// TailAdmin pages
import SignIn from "./pages/AuthPages/SignIn";
import SignUp from "./pages/AuthPages/SignUp";
import NotFound from "./pages/OtherPage/NotFound";
import Home from "./pages/Dashboard/Home";

// Auth callback (VERY IMPORTANT)
import AuthCallback from "./pages/AuthPages/AuthCallback";

// Your pages
import Profile from "./pages/profile/Profile";
import Estimate from "./pages/estimate/Estimate";
import History from "./pages/history/History";
import Landing from "./pages/Landing/Landing";
import Terms from "./pages/Legal/Terms";
import Refund from "./pages/Legal/Refund";
import Shipping from "./pages/Legal/Shipping";
export default function App() {
  return (
    <Router>
      <ScrollToTop />
      <Routes>
        {/* Public callback route */}
        <Route path="/auth/callback" element={<AuthCallback />} />

          {/* Public */}
        <Route path="/" element={<Landing />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/refund-policy" element={<Refund />} />
        <Route path="/shipping-policy" element={<Shipping />} />
        {/* Auth pages */}
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />

        {/* Protected Dashboard Layout */}
        {/* ✅ Protected app under /app */}
        <Route
          path="/app"
          element={
            <RequireAuth>
              <AppLayout />
            </RequireAuth>
          }
        >
          <Route index element={<Home />} />
          <Route path="profile" element={<Profile />} />
          <Route path="estimate" element={<Estimate />} />
          <Route path="history" element={<History />} />


          
        </Route>

        

        {/* Fallback */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}
