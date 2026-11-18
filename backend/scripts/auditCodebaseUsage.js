import fs from 'fs';
import path from 'path';

const models = [
  'AgentExecution',
  'Approval',
  'Conversation',
  'ExternalContact',
  'FileMetadata',
  'Integration',
  'Memory',
  'Message',
  'Notification',
  'Payment',
  'Project',
  'ResearchSession',
  'Subscription',
  'Task',
  'TaskEvent',
  'UsageRecord',
  'User',
  'Workflow',
  'WorkflowExecution'
];

function searchDir(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (file === 'node_modules' || file === '.git' || file === 'dist' || file === 'build') continue;
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      searchDir(fullPath, fileList);
    } else if (file.endsWith('.js') || file.endsWith('.jsx') || file.endsWith('.ts') || file.endsWith('.tsx')) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

const backendFiles = searchDir('backend/src');
const frontendFiles = searchDir('frontend/src');

console.log('=== USAGE OF MONGOOSE MODELS IN BACKEND & FRONTEND ===');
const results = {};

for (const m of models) {
  results[m] = {
    backendImports: [],
    frontendMentions: [],
    routesOrControllers: []
  };

  const regexModel = new RegExp('\\b' + m + '\\b', 'g');
  for (const f of backendFiles) {
    if (f.includes('models\\' + m + '.js') || f.includes('models/' + m + '.js')) continue;
    const content = fs.readFileSync(f, 'utf8');
    if (regexModel.test(content)) {
      results[m].backendImports.push(f.replace(/\\/g, '/'));
    }
  }

  const lowerM = m.toLowerCase();
  for (const f of frontendFiles) {
    const content = fs.readFileSync(f, 'utf8');
    if (content.toLowerCase().includes(lowerM)) {
      results[m].frontendMentions.push(f.replace(/\\/g, '/'));
    }
  }
}

for (const [m, data] of Object.entries(results)) {
  console.log(`\nModel: ${m}`);
  console.log(`  Backend usage (${data.backendImports.length} files):`, data.backendImports);
  console.log(`  Frontend mentions (${data.frontendMentions.length} files):`, data.frontendMentions.slice(0, 5));
}
