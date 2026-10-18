import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import { StudentProvider } from './context/StudentContext';

// Student Career Journey Pages
import Home from './pages/Home';
import MarketDashboard from './pages/MarketDashboard';
import CareerIntelligence from './pages/CareerIntelligence';
import SkillsProfile from './pages/SkillsProfile';
import SkillGapAnalyzer from './pages/SkillGapAnalyzer';
import LearningRoadmap from './pages/LearningRoadmap';
import OpportunityMatcher from './pages/OpportunityMatcher';
import CareerSimulator from './pages/CareerSimulator';
import TransferableSkills from './pages/TransferableSkills';
import ProjectGenerator from './pages/ProjectGenerator';
import FutureSkillRadar from './pages/FutureSkillRadar';
import CareerAlternatives from './pages/CareerAlternatives';
import CareerGraphPage from './pages/CareerGraphPage';
import StudentProgress from './pages/StudentProgress';


function App() {
  return (
    <StudentProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            {/* Student Career Journey */}
            <Route path="/" element={<Home />} />
            <Route path="/dashboard" element={<MarketDashboard />} />
            <Route path="/careers" element={<CareerIntelligence />} />
            <Route path="/careers/:careerId" element={<CareerIntelligence />} />
            <Route path="/profile" element={<SkillsProfile />} />
            <Route path="/gap-analysis" element={<SkillGapAnalyzer />} />
            <Route path="/roadmap" element={<LearningRoadmap />} />
            <Route path="/opportunities" element={<OpportunityMatcher />} />
            <Route path="/simulator" element={<CareerSimulator />} />
            <Route path="/transferable" element={<TransferableSkills />} />
            <Route path="/projects" element={<ProjectGenerator />} />
            <Route path="/future-radar" element={<FutureSkillRadar />} />
            <Route path="/alternatives" element={<CareerAlternatives />} />
            <Route path="/graph" element={<CareerGraphPage />} />
            <Route path="/progress" element={<StudentProgress />} />

            {/* Legacy & Shortcut Redirects */}
            <Route path="/system/*" element={<Navigate to="/" replace />} />
            <Route path="/data" element={<Navigate to="/careers" replace />} />
            <Route path="/skills" element={<Navigate to="/profile" replace />} />
            <Route path="/pipeline" element={<Navigate to="/" replace />} />
            <Route path="/gap-analyzer" element={<Navigate to="/gap-analysis" replace />} />
            <Route path="/forecast" element={<Navigate to="/dashboard" replace />} />
            <Route path="/evaluation" element={<Navigate to="/" replace />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </StudentProvider>
  );
}

export default App;
