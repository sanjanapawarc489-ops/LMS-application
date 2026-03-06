import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth";
import ProtectedRoute from "./components/ProtectedRoute";
import ShellLayout from "./components/ShellLayout";
import LoginPage from "./pages/LoginPage";
import CoursesPage from "./pages/CoursesPage";
import CourseDetailsPage from "./pages/CourseDetailsPage";
import LearningPage from "./pages/LearningPage";
import MyEnrollmentsPage from "./pages/MyEnrollmentsPage";

export default function App() {
  const { user, loading } = useAuth();

  if (loading) return <div className="center-screen">Loading...</div>;

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/courses" /> : <LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <ShellLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/courses" />} />
        <Route path="courses" element={<CoursesPage />} />
        <Route path="courses/:courseId" element={<CourseDetailsPage />} />
        <Route path="enrollments" element={<MyEnrollmentsPage />} />
        <Route path="learn/:courseId" element={<LearningPage />} />
      </Route>
      <Route path="*" element={<Navigate to={user ? "/courses" : "/login"} />} />
    </Routes>
  );
}

