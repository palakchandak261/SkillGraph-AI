import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import { StudentProvider } from './context/StudentContext';

// Student Journey Pages
import Home from './pages/Home';
import CareerIntelligence from './pages/CareerIntelligence';
import SkillsProfile from './pages/SkillsProfile';
import SkillGapAnalyzer from './pages/SkillGapAnalyzer';
import LearningRoadmap from './pages/LearningRoadmap';
import CareerAlternatives from './pages/CareerAlternatives';
import CareerGraphPage from './pages/CareerGraphPage';
import StudentProgress from './pages/StudentProgress';

// System & Data Transparency Pages
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
            <Route path="/careers" element={<CareerIntelligence />} />
            <Route path="/careers/:careerId" element={<CareerIntelligence />} />
            <Route path="/profile" element={<SkillsProfile />} />
            <Route path="/gap-analysis" element={<SkillGapAnalyzer />} />
            <Route path="/roadmap" element={<LearningRoadmap />} />
            <Route path="/alternatives" element={<CareerAlternatives />} />
            <Route path="/graph" element={<CareerGraphPage />} />
            <Route path="/progress" element={<StudentProgress />} />

            {/* System & Data Insights */}
            <Route path="/system/overview" element={<Overview />} />
            <Route path="/system/data" element={<DataExplorer />} />
            <Route path="/system/pipeline" element={<Pipeline />} />
            <Route path="/system/evaluation" element={<ModelEvaluation />} />

            {/* Legacy & Shortcut Redirects */}
            <Route path="/data" element={<Navigate to="/system/data" replace />} />
            <Route path="/skills" element={<Navigate to="/careers" replace />} />
            <Route path="/pipeline" element={<Navigate to="/system/pipeline" replace />} />
            <Route path="/gap-analyzer" element={<Navigate to="/gap-analysis" replace />} />
            <Route path="/forecast" element={<Navigate to="/careers" replace />} />
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
