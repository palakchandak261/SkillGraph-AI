import React, { createContext, useContext, useState, useEffect } from 'react';
import type { StudentSkillItem, CareerSearchItem } from '../types';

interface StudentContextType {
  targetCareer: CareerSearchItem | null;
  setTargetCareer: (career: CareerSearchItem | null) => void;
  studentSkills: StudentSkillItem[];
  addSkill: (skill: StudentSkillItem) => void;
  removeSkill: (skillName: string) => void;
  updateSkillProficiency: (skillName: string, proficiency: 'beginner' | 'intermediate' | 'advanced') => void;
  experienceLevel: string;
  setExperienceLevel: (lvl: string) => void;
  roadmapProgress: Record<string, 'not_started' | 'learning' | 'practiced' | 'confident'>;
  updateRoadmapProgress: (skillName: string, status: 'not_started' | 'learning' | 'practiced' | 'confident') => void;
  resetProfile: () => void;
}

const StudentContext = createContext<StudentContextType | undefined>(undefined);

const DEFAULT_SKILLS: StudentSkillItem[] = [
  { skill_name: 'Python', proficiency: 'intermediate' },
  { skill_name: 'SQL', proficiency: 'beginner' },
  { skill_name: 'Git', proficiency: 'intermediate' },
];

export const StudentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [targetCareer, setTargetCareer] = useState<CareerSearchItem | null>(() => {
    const saved = localStorage.getItem('sg_target_career');
    return saved ? JSON.parse(saved) : null;
  });

  const [studentSkills, setStudentSkills] = useState<StudentSkillItem[]>(() => {
    const saved = localStorage.getItem('sg_student_skills');
    return saved ? JSON.parse(saved) : DEFAULT_SKILLS;
  });

  const [experienceLevel, setExperienceLevel] = useState<string>(() => {
    return localStorage.getItem('sg_exp_level') || 'student';
  });

  const [roadmapProgress, setRoadmapProgress] = useState<Record<string, 'not_started' | 'learning' | 'practiced' | 'confident'>>(() => {
    const saved = localStorage.getItem('sg_roadmap_progress');
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    if (targetCareer) {
      localStorage.setItem('sg_target_career', JSON.stringify(targetCareer));
    } else {
      localStorage.removeItem('sg_target_career');
    }
  }, [targetCareer]);

  useEffect(() => {
    localStorage.setItem('sg_student_skills', JSON.stringify(studentSkills));
  }, [studentSkills]);

  useEffect(() => {
    localStorage.setItem('sg_exp_level', experienceLevel);
  }, [experienceLevel]);

  useEffect(() => {
    localStorage.setItem('sg_roadmap_progress', JSON.stringify(roadmapProgress));
  }, [roadmapProgress]);

  const addSkill = (skill: StudentSkillItem) => {
    setStudentSkills((prev) => {
      const exists = prev.some((s) => s.skill_name.toLowerCase() === skill.skill_name.toLowerCase());
      if (exists) return prev;
      return [...prev, skill];
    });
  };

  const removeSkill = (skillName: string) => {
    setStudentSkills((prev) => prev.filter((s) => s.skill_name.toLowerCase() !== skillName.toLowerCase()));
  };

  const updateSkillProficiency = (skillName: string, proficiency: 'beginner' | 'intermediate' | 'advanced') => {
    setStudentSkills((prev) =>
      prev.map((s) => (s.skill_name.toLowerCase() === skillName.toLowerCase() ? { ...s, proficiency } : s))
    );
  };

  const updateRoadmapProgress = (skillName: string, status: 'not_started' | 'learning' | 'practiced' | 'confident') => {
    setRoadmapProgress((prev) => ({
      ...prev,
      [skillName]: status,
    }));
  };

  const resetProfile = () => {
    setTargetCareer(null);
    setStudentSkills(DEFAULT_SKILLS);
    setExperienceLevel('student');
    setRoadmapProgress({});
    localStorage.removeItem('sg_target_career');
    localStorage.removeItem('sg_student_skills');
    localStorage.removeItem('sg_exp_level');
    localStorage.removeItem('sg_roadmap_progress');
  };

  return (
    <StudentContext.Provider
      value={{
        targetCareer,
        setTargetCareer,
        studentSkills,
        addSkill,
        removeSkill,
        updateSkillProficiency,
        experienceLevel,
        setExperienceLevel,
        roadmapProgress,
        updateRoadmapProgress,
        resetProfile,
      }}
    >
      {children}
    </StudentContext.Provider>
  );
};

export const useStudent = () => {
  const context = useContext(StudentContext);
  if (!context) {
    throw new Error('useStudent must be used within a StudentProvider');
  }
  return context;
};
