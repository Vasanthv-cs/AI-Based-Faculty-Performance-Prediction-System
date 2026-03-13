// Mock data for the Faculty Performance Prediction System

export type UserRole = 'admin' | 'hod' | 'faculty';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  department?: string;
  avatar?: string;
}

export interface FDPProgram {
  id: string;
  facultyId: string;
  name: string;
  organization: string;
  date: string;
  certificate?: string;
}

export interface IndustrialVisit {
  id: string;
  facultyId: string;
  industryName: string;
  date: string;
  studentsCount: number;
  report?: string;
}

export interface CourseHandled {
  id: string;
  facultyId: string;
  courseName: string;
  courseCode: string;
  semester: string;
  year: number;
  studentsCount: number;
}

export interface ResearchPaper {
  id: string;
  facultyId: string;
  title: string;
  journal: string;
  year: number;
  citations: number;
  proof?: string;
}

export interface Certification {
  id: string;
  facultyId: string;
  name: string;
  provider: string;
  date: string;
  certificate?: string;
}

export interface FacultyPerformance {
  facultyId: string;
  score: number;
  category: 'Excellent' | 'Good' | 'Average' | 'Needs Improvement';
  fdpScore: number;
  visitScore: number;
  courseScore: number;
  researchScore: number;
  certificationScore: number;
  trend: 'up' | 'down' | 'stable';
  insights: string[];
}

// Demo Users
export const demoUsers: User[] = [
  { id: '1', email: 'admin@university.edu', name: 'Dr. Admin User', role: 'admin' },
  { id: '2', email: 'hod.cs@university.edu', name: 'Dr. Priya Sharma', role: 'hod', department: 'Computer Science' },
  { id: '3', email: 'hod.ece@university.edu', name: 'Dr. Rajesh Kumar', role: 'hod', department: 'Electronics' },
  { id: '4', email: 'john.doe@university.edu', name: 'Dr. John Doe', role: 'faculty', department: 'Computer Science' },
  { id: '5', email: 'jane.smith@university.edu', name: 'Dr. Jane Smith', role: 'faculty', department: 'Computer Science' },
  { id: '6', email: 'mike.wilson@university.edu', name: 'Prof. Mike Wilson', role: 'faculty', department: 'Electronics' },
  { id: '7', email: 'sarah.johnson@university.edu', name: 'Dr. Sarah Johnson', role: 'faculty', department: 'Computer Science' },
  { id: '8', email: 'david.brown@university.edu', name: 'Prof. David Brown', role: 'faculty', department: 'Electronics' },
];

// Mock FDP Programs
export const mockFDPs: FDPProgram[] = [
  { id: '1', facultyId: '4', name: 'Machine Learning Fundamentals', organization: 'IIT Delhi', date: '2024-01-15' },
  { id: '2', facultyId: '4', name: 'Cloud Computing Workshop', organization: 'AWS', date: '2024-03-20' },
  { id: '3', facultyId: '5', name: 'Data Science with Python', organization: 'Coursera', date: '2024-02-10' },
  { id: '4', facultyId: '6', name: 'IoT Systems Design', organization: 'IISC Bangalore', date: '2024-04-05' },
  { id: '5', facultyId: '7', name: 'Cybersecurity Essentials', organization: 'NPTEL', date: '2024-01-25' },
  { id: '6', facultyId: '7', name: 'Blockchain Technology', organization: 'IBM', date: '2024-05-15' },
];

// Mock Industrial Visits
export const mockVisits: IndustrialVisit[] = [
  { id: '1', facultyId: '4', industryName: 'TCS Innovation Labs', date: '2024-02-20', studentsCount: 45 },
  { id: '2', facultyId: '5', industryName: 'Infosys Campus', date: '2024-03-15', studentsCount: 50 },
  { id: '3', facultyId: '6', industryName: 'Texas Instruments', date: '2024-04-10', studentsCount: 35 },
  { id: '4', facultyId: '8', industryName: 'Intel Manufacturing', date: '2024-05-05', studentsCount: 40 },
];

// Mock Courses Handled
export const mockCourses: CourseHandled[] = [
  { id: '1', facultyId: '4', courseName: 'Data Structures', courseCode: 'CS201', semester: 'Fall', year: 2024, studentsCount: 60 },
  { id: '2', facultyId: '4', courseName: 'Algorithm Design', courseCode: 'CS301', semester: 'Spring', year: 2024, studentsCount: 55 },
  { id: '3', facultyId: '5', courseName: 'Database Systems', courseCode: 'CS302', semester: 'Fall', year: 2024, studentsCount: 65 },
  { id: '4', facultyId: '6', courseName: 'Digital Electronics', courseCode: 'EC201', semester: 'Fall', year: 2024, studentsCount: 50 },
  { id: '5', facultyId: '7', courseName: 'Computer Networks', courseCode: 'CS401', semester: 'Spring', year: 2024, studentsCount: 45 },
  { id: '6', facultyId: '8', courseName: 'VLSI Design', courseCode: 'EC401', semester: 'Fall', year: 2024, studentsCount: 40 },
];

// Mock Research Papers
export const mockPapers: ResearchPaper[] = [
  { id: '1', facultyId: '4', title: 'Deep Learning for Image Recognition', journal: 'IEEE Transactions', year: 2024, citations: 25 },
  { id: '2', facultyId: '4', title: 'Efficient Algorithms for Big Data', journal: 'ACM Computing', year: 2023, citations: 42 },
  { id: '3', facultyId: '5', title: 'NoSQL Database Optimization', journal: 'Springer', year: 2024, citations: 18 },
  { id: '4', facultyId: '6', title: 'Smart IoT Sensor Networks', journal: 'IEEE Sensors', year: 2024, citations: 30 },
  { id: '5', facultyId: '7', title: 'Network Security Protocols', journal: 'Elsevier', year: 2023, citations: 35 },
  { id: '6', facultyId: '7', title: 'Blockchain in Healthcare', journal: 'IEEE Access', year: 2024, citations: 22 },
  { id: '7', facultyId: '8', title: 'Low Power VLSI Architectures', journal: 'IEEE TCAS', year: 2024, citations: 28 },
];

// Mock Certifications
export const mockCertifications: Certification[] = [
  { id: '1', facultyId: '4', name: 'AWS Solutions Architect', provider: 'Amazon', date: '2024-01-10' },
  { id: '2', facultyId: '4', name: 'TensorFlow Developer', provider: 'Google', date: '2024-03-15' },
  { id: '3', facultyId: '5', name: 'MongoDB Developer', provider: 'MongoDB Inc.', date: '2024-02-20' },
  { id: '4', facultyId: '6', name: 'IoT Specialist', provider: 'Cisco', date: '2024-04-25' },
  { id: '5', facultyId: '7', name: 'Certified Ethical Hacker', provider: 'EC-Council', date: '2024-05-30' },
  { id: '6', facultyId: '8', name: 'Cadence VLSI Design', provider: 'Cadence', date: '2024-03-10' },
];

// AI Performance Predictions
export const mockPerformance: FacultyPerformance[] = [
  {
    facultyId: '4',
    score: 92,
    category: 'Excellent',
    fdpScore: 90,
    visitScore: 85,
    courseScore: 95,
    researchScore: 95,
    certificationScore: 90,
    trend: 'up',
    insights: [
      'Outstanding research output with high citation impact',
      'Consistently participates in professional development',
      'Strong industry collaboration through visits',
      'Recommended for promotion consideration',
    ],
  },
  {
    facultyId: '5',
    score: 78,
    category: 'Good',
    fdpScore: 75,
    visitScore: 80,
    courseScore: 85,
    researchScore: 70,
    certificationScore: 75,
    trend: 'stable',
    insights: [
      'Solid teaching performance',
      'Could increase research publication frequency',
      'Good engagement with industry partners',
    ],
  },
  {
    facultyId: '6',
    score: 85,
    category: 'Excellent',
    fdpScore: 80,
    visitScore: 90,
    courseScore: 85,
    researchScore: 85,
    certificationScore: 80,
    trend: 'up',
    insights: [
      'Strong industry connections',
      'Growing research impact',
      'Excellent practical teaching approach',
    ],
  },
  {
    facultyId: '7',
    score: 88,
    category: 'Excellent',
    fdpScore: 95,
    visitScore: 70,
    courseScore: 90,
    researchScore: 90,
    certificationScore: 85,
    trend: 'up',
    insights: [
      'Exceptional commitment to professional development',
      'High-quality research publications',
      'Consider increasing industrial collaboration',
    ],
  },
  {
    facultyId: '8',
    score: 72,
    category: 'Good',
    fdpScore: 65,
    visitScore: 75,
    courseScore: 80,
    researchScore: 75,
    certificationScore: 70,
    trend: 'down',
    insights: [
      'Experienced faculty with steady performance',
      'Should attend more FDP programs',
      'Research output could be improved',
    ],
  },
];

// Department Statistics
export const departmentStats = {
  'Computer Science': {
    totalFaculty: 4,
    avgScore: 86,
    topPerformer: 'Dr. John Doe',
    totalPapers: 8,
    totalCertifications: 6,
  },
  'Electronics': {
    totalFaculty: 2,
    avgScore: 78.5,
    topPerformer: 'Prof. Mike Wilson',
    totalPapers: 4,
    totalCertifications: 3,
  },
};

// Helper functions
export const getFacultyById = (id: string) => demoUsers.find(u => u.id === id);
export const getFacultyByDepartment = (dept: string) => demoUsers.filter(u => u.department === dept && u.role === 'faculty');
export const getPerformanceByFacultyId = (id: string) => mockPerformance.find(p => p.facultyId === id);
export const getFDPsByFacultyId = (id: string) => mockFDPs.filter(f => f.facultyId === id);
export const getVisitsByFacultyId = (id: string) => mockVisits.filter(v => v.facultyId === id);
export const getCoursesByFacultyId = (id: string) => mockCourses.filter(c => c.facultyId === id);
export const getPapersByFacultyId = (id: string) => mockPapers.filter(p => p.facultyId === id);
export const getCertificationsByFacultyId = (id: string) => mockCertifications.filter(c => c.facultyId === id);
