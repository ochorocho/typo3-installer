import { createContext } from '@lit/context';

export const installerContext = createContext('installer-state');

export const STEPS = [
  { id: 'packages', title: 'Packages', component: 'step-packages' },
  { id: 'requirements', title: 'Requirements', component: 'step-requirements' },
  { id: 'database', title: 'Database', component: 'step-database' },
  { id: 'admin', title: 'Admin', component: 'step-admin' },
  { id: 'site', title: 'Site', component: 'step-site' },
  { id: 'install', title: 'Install', component: 'step-progress' }
];

export const initialState = {
  currentStep: 0,
  packages: {
    available: {},
    selected: [],
    validated: false
  },
  requirements: {
    checked: false,
    passed: false,
    results: []
  },
  database: {
    driver: 'pdo_mysql',
    host: 'localhost',
    port: '3306',
    name: '',
    user: '',
    password: '',
    tested: false,
    valid: false
  },
  admin: {
    username: 'admin',
    password: '',
    email: ''
  },
  site: {
    name: 'My TYPO3 Site',
    baseUrl: ''
  },
  installation: {
    running: false,
    progress: 0,
    currentTask: '',
    completed: false,
    error: null,
    backendUrl: null
  }
};
