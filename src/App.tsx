import type { ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from './lib/auth'
import { Layout } from './components/Layout'
import AuthPage from './pages/Auth'
import Home from './pages/Home'
import WorkoutPage from './pages/Workout'
import HistoryPage from './pages/History'
import WorkoutDetail from './pages/WorkoutDetail'
import ExercisesPage from './pages/Exercises'
import ExerciseDetail from './pages/ExerciseDetail'
import RoutineEditor from './pages/RoutineEditor'
import StatsPage from './pages/Stats'
import RoutinesPage from './pages/Routines'
import UserProfile from './pages/UserProfile'
import SocialWorkout from './pages/SocialWorkout'
import MeasurementsPage from './pages/Measurements'
import JoinPage from './pages/Join'
import ProfilePage from './pages/Profile'
import CoachHome from './pages/coach/CoachHome'
import ClientForm from './pages/coach/ClientForm'
import ClientDetail from './pages/coach/ClientDetail'
import ProgramBuilder from './pages/coach/ProgramBuilder'

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const loc = useLocation()
  if (loading) return <div className="page"><div className="skeleton" style={{ height: 120 }} /></div>
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname }} />
  return children
}

function RequireCoach({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  return user?.is_coach ? children : <Navigate to="/" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<AuthPage />} />
      <Route path="/workout" element={<RequireAuth><WorkoutPage /></RequireAuth>} />
      <Route element={<RequireAuth><Layout /></RequireAuth>}>
        <Route index element={<Home />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="history/:id" element={<WorkoutDetail />} />
        <Route path="exercises" element={<ExercisesPage />} />
        <Route path="exercises/:slug" element={<ExerciseDetail />} />
        <Route path="routines/new" element={<RoutineEditor />} />
        <Route path="stats" element={<StatsPage />} />
        <Route path="routines" element={<RoutinesPage />} />
        <Route path="feed" element={<Navigate to="/" replace />} />
        <Route path="u/:id" element={<UserProfile />} />
        <Route path="w/:id" element={<SocialWorkout />} />
        <Route path="measurements" element={<MeasurementsPage />} />
        <Route path="routines/:id" element={<RoutineEditor />} />
        <Route path="join/:code" element={<JoinPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="coach" element={<RequireCoach><CoachHome /></RequireCoach>} />
        <Route path="coach/clients/new" element={<RequireCoach><ClientForm /></RequireCoach>} />
        <Route path="coach/clients/:id" element={<RequireCoach><ClientDetail /></RequireCoach>} />
        <Route path="coach/clients/:id/edit" element={<RequireCoach><ClientForm /></RequireCoach>} />
        <Route path="coach/programs/new" element={<RequireCoach><ProgramBuilder /></RequireCoach>} />
        <Route path="coach/programs/:id" element={<RequireCoach><ProgramBuilder /></RequireCoach>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
