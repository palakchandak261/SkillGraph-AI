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

// System & Governance Pages
import DataQualityAdmin from './pages/DataQualityAdmin';
import Overview from './pages/Overview';
import DataExplorer from './pages/DataExplorer';
import Pipeline from './pages/Pipeline';
import ModelEvaluation from './pages/ModelEvaluation';

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

            {/* System & Data Governance */}
            <Route path="/system/admin" element={<DataQualityAdmin />} />
            <Route path="/system/overview" element={<Overview />} />
            <Route path="/system/data" element={<DataExplorer />} />
            <Route path="/system/pipeline" element={<Pipeline />} />
            <Route path="/system/evaluation" element={<ModelEvaluation />} />

            {/* Legacy & Shortcut Redirects */}
            <Route path="/data" element={<Navigate to="/system/data" replace />} />
            <Route path="/skills" element={<Navigate to="/dashboard" replace />} />
            <Route path="/pipeline" element={<Navigate to="/system/pipeline" replace />} />
            <Route path="/gap-analyzer" element={<Navigate to="/gap-analysis" replace />} />
            <Route path="/forecast" element={<Navigate to="/future-radar" replace />} />
            <Route path="/evaluation" element={<Navigate to="/system/evaluation" replace />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </StudentProvider>
  );
}

export default App;
