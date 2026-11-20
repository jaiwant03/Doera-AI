import { describe, it, expect, beforeAll, beforeEach, afterEach, jest } from '@jest/globals';
import mongoose from 'mongoose';
import Task from '../src/models/Task.js';
import ExecutionEvidence from '../src/models/ExecutionEvidence.js';
import TaskEvent from '../src/models/TaskEvent.js';
import evidenceService from '../src/services/evidenceService.js';
import extractAndRegisterDeliverables from '../src/services/deliverableExtractor.js';
import * as missionController from '../src/controllers/missionController.js';

describe('DOERA AI — Mission Control, Proof of Execution & Follow-Up Tracker', () => {
  const userA_Id = new mongoose.Types.ObjectId();
  const userB_Id = new mongoose.Types.ObjectId();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Test 1: Mission Creation with Dynamic Unique ID & Metadata
  it('1. should create a mission with dynamic unique mission ID, task list, dependencies, and assigned agents', async () => {
    const userRequest = 'Organize a two-day robotics workshop for 80 students with a budget of ₹40,000.';
    
    // Simulate req/res for createMission
    let resStatus = 200;
    let resData = null;
    const req = {
      user: { _id: userA_Id },
      body: {
        title: 'Two-Day Robotics Workshop 2026',
        userRequest,
        category: 'MISSION_PLANNING',
        assignedAgents: ['Planner', 'Research', 'Budget', 'Verification'],
        subtasks: [
          { id: 'sub_plan', title: 'Formulate execution schedule', agent: 'Planner', status: 'completed', dependencies: [] },
          { id: 'sub_budget', title: 'Audit ₹40,000 budget constraint', agent: 'Budget', status: 'pending', dependencies: ['sub_plan'] },
          { id: 'sub_verify', title: 'Verify deliverables', agent: 'Verification', status: 'pending', dependencies: ['sub_budget'] },
        ],
      },
    };
    const res = {
      status: (code) => { resStatus = code; return res; },
      json: (data) => { resData = data; return res; },
    };

    // Mock Task.create
    const dynamicId = `MSN-${Date.now().toString(36).toUpperCase()}-TEST01`;
    const mockCreatedMission = {
      _id: new mongoose.Types.ObjectId(),
      taskId: dynamicId,
      missionId: dynamicId,
      userId: userA_Id,
      title: req.body.title,
      userRequest: req.body.userRequest,
      category: req.body.category,
      status: 'CREATED',
      assignedAgents: req.body.assignedAgents,
      subtasks: req.body.subtasks,
      deliverables: [],
      createdAt: new Date(),
    };

    jest.spyOn(Task, 'create').mockResolvedValue(mockCreatedMission);
    jest.spyOn(TaskEvent, 'create').mockResolvedValue({});

    await missionController.createMission(req, res, () => {});

    expect(resStatus).toBe(201);
    expect(resData).toBeDefined();
    expect(resData.success).toBe(true);
    expect(resData.mission.missionId).toMatch(/^MSN-[A-Z0-9]+-[A-Z0-9]+/);
    expect(resData.mission.userId).toEqual(userA_Id);
    expect(resData.mission.subtasks.length).toBe(3);
    expect(resData.mission.assignedAgents).toContain('Budget');
  });

  // Test 2: Mission Status Transitions & State Fidelity
  it('2. should support all standard mission status states and only confirm backend-verified states', () => {
    const validStatuses = [
      'CREATED',
      'PLANNING',
      'IN_PROGRESS',
      'WAITING_FOR_INPUT',
      'VERIFICATION',
      'COMPLETED',
      'PARTIALLY_COMPLETED',
      'FAILED',
      'CANCELLED',
      'PAUSED',
    ];

    const enumValues = Task.schema.path('status').enumValues;
    validStatuses.forEach((status) => {
      expect(enumValues).toContain(status);
    });
  });

  // Test 3: Actual Progress Calculation based on Backend Subtask States
  it('3. should calculate actual progress accurately from completed subtask counts without fake timers', () => {
    const mockTask = new Task({
      taskId: 'MSN-CALC-TEST',
      userId: userA_Id,
      userRequest: 'Analyze and plan',
      conversationId: new mongoose.Types.ObjectId(),
      subtasks: [
        { id: 'sub_1', title: 'Task 1', agent: 'Planner', status: 'completed' },
        { id: 'sub_2', title: 'Task 2', agent: 'Research', status: 'completed' },
        { id: 'sub_3', title: 'Task 3', agent: 'Budget', status: 'pending' },
        { id: 'sub_4', title: 'Task 4', agent: 'Verification', status: 'pending' },
      ],
      status: 'IN_PROGRESS',
    });

    // 2 completed out of 4 = 50%
    expect(mockTask.actualProgress).toBe(50);

    // Complete third subtask: 3 of 4 = 75%
    mockTask.subtasks[2].status = 'completed';
    expect(mockTask.actualProgress).toBe(75);

    // Complete all subtasks: 4 of 4 = 100%
    mockTask.subtasks[3].status = 'completed';
    mockTask.status = 'COMPLETED';
    expect(mockTask.actualProgress).toBe(100);
  });

  // Test 4: Proof of Execution for All Six Real Evidence Types
  it('4. should record authentic, verifiable proof of execution records for Document, Research, Spreadsheet, Chart, Report, and Email', async () => {
    jest.spyOn(Task, 'updateOne').mockResolvedValue({ modifiedCount: 1 });

    // 1. Document Processed Evidence
    jest.spyOn(ExecutionEvidence, 'create').mockImplementationOnce(async (data) => ({
      ...data,
      _id: new mongoose.Types.ObjectId(),
    }));
    const docEv = await evidenceService.recordDocumentEvidence({
      userId: userA_Id,
      taskId: 'MSN-DOC-001',
      filename: 'annual_report.pdf',
      pageCount: 14,
      wordCount: 4200,
      summary: 'Executive summary of annual corporate report.',
    });
    expect(docEv.evidenceType).toBe('DOCUMENT_PROCESSED');
    expect(docEv.targetData.filename).toBe('annual_report.pdf');
    expect(docEv.targetData.pageCount).toBe(14);
    expect(docEv.verificationStatus).toBe('VERIFIED');
    expect(docEv.executionMode).toBe('REAL');

    // 2. Research Completed Evidence
    jest.spyOn(ExecutionEvidence, 'create').mockImplementationOnce(async (data) => ({
      ...data,
      _id: new mongoose.Types.ObjectId(),
    }));
    const researchEv = await evidenceService.recordResearchEvidence({
      userId: userA_Id,
      taskId: 'MSN-RES-001',
      query: 'Find laptop repair shops in Coimbatore',
      sources: [
        { title: 'Dell Service Centre', url: 'https://maps.example.com/dell' },
        { title: 'Gandhipuram Tech Hub', url: 'https://maps.example.com/tech' },
      ],
      summary: 'Found 2 verified repair providers with active phone contacts.',
    });
    expect(researchEv.evidenceType).toBe('RESEARCH_COMPLETED');
    expect(researchEv.sourceUrls.length).toBe(2);
    expect(researchEv.sourceUrls[0].url).toContain('dell');

    // 3. Spreadsheet Analysed Evidence
    jest.spyOn(ExecutionEvidence, 'create').mockImplementationOnce(async (data) => ({
      ...data,
      _id: new mongoose.Types.ObjectId(),
    }));
    const sheetEv = await evidenceService.recordSpreadsheetEvidence({
      userId: userA_Id,
      taskId: 'MSN-SHEET-001',
      filename: 'q4_expenses.xlsx',
      rowCount: 142,
      columnCount: 8,
      sheetsCount: 2,
      calculations: { totalExpenses: 84000, highestCategory: 'Catering' },
    });
    expect(sheetEv.evidenceType).toBe('SPREADSHEET_ANALYSED');
    expect(sheetEv.targetData.rowCount).toBe(142);
    expect(sheetEv.targetData.calculations.highestCategory).toBe('Catering');

    // 4. Chart Generated Evidence
    jest.spyOn(ExecutionEvidence, 'create').mockImplementationOnce(async (data) => ({
      ...data,
      _id: new mongoose.Types.ObjectId(),
    }));
    const chartEv = await evidenceService.recordChartEvidence({
      userId: userA_Id,
      taskId: 'MSN-CHART-001',
      chartType: 'bar',
      labels: ['Catering', 'Logistics', 'Prizes', 'Operations'],
      seriesName: 'Expenses',
      chartConfig: { type: 'bar', data: [44, 9, 34, 7] },
    });
    expect(chartEv.evidenceType).toBe('CHART_GENERATED');
    expect(chartEv.targetData.chartType).toBe('bar');
    expect(chartEv.targetData.dataPointsCount).toBe(4);

    // 5. Report Generated Evidence
    jest.spyOn(ExecutionEvidence, 'create').mockImplementationOnce(async (data) => ({
      ...data,
      _id: new mongoose.Types.ObjectId(),
    }));
    const reportEv = await evidenceService.recordReportEvidence({
      userId: userA_Id,
      taskId: 'MSN-REP-001',
      title: 'Hackathon Execution Plan',
      deliverableRef: 'deliv_report_001',
      sectionsCount: 5,
      isVerified: true,
    });
    expect(reportEv.evidenceType).toBe('REPORT_GENERATED');
    expect(reportEv.verificationStatus).toBe('VERIFIED');
    expect(reportEv.deliverableRef).toBe('deliv_report_001');

    // 6. Email Sent Evidence (Distinguishing Real vs Simulated)
    jest.spyOn(ExecutionEvidence, 'create').mockImplementationOnce(async (data) => ({
      ...data,
      _id: new mongoose.Types.ObjectId(),
    }));
    const simEmailEv = await evidenceService.recordEmailEvidence({
      userId: userA_Id,
      taskId: 'MSN-MAIL-001',
      recipient: 'principal@college.edu',
      subject: 'Hackathon Permission Request',
      isRealGoogleAuth: false, // Demo mode user
    });
    expect(simEmailEv.evidenceType).toBe('EMAIL_SENT');
    expect(simEmailEv.verificationStatus).toBe('SIMULATED');
    expect(simEmailEv.isSimulated).toBe(true);
    expect(simEmailEv.requestSummary).toContain('SIMULATED');
  });

  // Test 5: Deliverables Extraction and Registration
  it('5. should extract and persist tangible deliverables with types, formats, and verified flags', async () => {
    const mockTask = {
      taskId: 'MSN-DELIV-TEST',
      userId: userA_Id,
      userRequest: 'College Hackathon for 100 participants with ₹50,000 budget',
      deliverables: [],
      save: jest.fn().mockResolvedValue(true),
    };

    const mockResultState = {
      planningData: {
        missionTitle: 'Two-Day College Hackathon 2026',
        scale: { participants: 100, duration: '2 Days' },
        schedule: [{ day: 'Day 1', items: [{ time: '09:00 AM', activity: 'Registration' }] }],
      },
      budgetData: {
        totalBudget: 50000,
        currency: 'INR',
        contingencyPercentage: 6,
        lineItems: [{ category: 'Food', amount: 22000 }],
      },
      communicationDrafts: [
        { type: 'INSTITUTIONAL_APPROVAL', recipient: 'Principal', subject: 'Hackathon Permission' },
        { type: 'SPONSOR_OUTREACH', recipient: 'Sponsor', subject: 'Partnership' },
      ],
      chartConfig: { type: 'pie', labels: ['Food', 'Prizes', 'Operations'] },
    };

    jest.spyOn(evidenceService, 'recordChartEvidence').mockResolvedValue({});
    jest.spyOn(evidenceService, 'recordReportEvidence').mockResolvedValue({});

    const deliverables = await extractAndRegisterDeliverables(
      mockTask,
      mockResultState,
      userA_Id,
      '# Comprehensive Hackathon Execution Dossier\n\nFull plan verified.'
    );

    expect(deliverables.length).toBeGreaterThanOrEqual(4);
    const types = deliverables.map((d) => d.type);
    expect(types).toContain('PLANNING_SCHEDULE');
    expect(types).toContain('BUDGET_BREAKDOWN');
    expect(types).toContain('COMMUNICATION_SUITE');
    expect(types).toContain('CHART');
    expect(types).toContain('REPORT');
    expect(mockTask.save).toHaveBeenCalled();
  });

  // Test 6: Follow-up Tracker & Continuing Missions
  it('6. should allow users to return to previous missions, submit follow-up instructions, and append new deliverables', async () => {
    const existingMission = {
      _id: new mongoose.Types.ObjectId(),
      taskId: 'MSN-EXISTING-001',
      missionId: 'MSN-EXISTING-001',
      userId: userA_Id,
      title: 'College Hackathon Plan',
      subtasks: [
        { id: 'sub_1', title: 'Plan event', status: 'completed' },
      ],
      deliverables: [],
      status: 'IN_PROGRESS',
      save: jest.fn().mockResolvedValue(true),
    };

    jest.spyOn(Task, 'findOne').mockResolvedValue(existingMission);
    jest.spyOn(TaskEvent, 'create').mockResolvedValue({});
    jest.spyOn(evidenceService, 'recordReportEvidence').mockResolvedValue({
      _id: new mongoose.Types.ObjectId(),
      verificationStatus: 'VERIFIED',
    });

    let resData = null;
    const req = {
      user: { _id: userA_Id },
      params: { id: 'MSN-EXISTING-001' },
      body: { instruction: 'Reallocate ₹5,000 from marketing to catering refreshments' },
    };
    const res = {
      json: (data) => { resData = data; return res; },
    };

    await missionController.addFollowUpInstruction(req, res, () => {});

    expect(resData).toBeDefined();
    expect(resData.success).toBe(true);
    expect(resData.mission.subtasks.length).toBe(2);
    expect(resData.mission.subtasks[1].agent).toBe('FollowUp');
    expect(resData.mission.subtasks[1].details).toContain('Reallocate ₹5,000');
    expect(resData.deliverable).toBeDefined();
    expect(resData.deliverable.type).toBe('REPORT');
    expect(existingMission.save).toHaveBeenCalled();
  });

  // Test 7: Strict User Isolation (Prevent Accessing Other Users' Missions)
  it('7. should enforce strict user isolation: User B cannot access or modify User A missions or evidence', async () => {
    // User A owns the mission
    jest.spyOn(Task, 'findOne').mockImplementation(({ userId }) => {
      // If query matches User A, return mission; if User B, return null
      if (String(userId) === String(userA_Id)) {
        return Promise.resolve({
          _id: new mongoose.Types.ObjectId(),
          taskId: 'MSN-USER-A-ONLY',
          userId: userA_Id,
          deliverables: [],
        });
      }
      return Promise.resolve(null);
    });

    let resStatus = 200;
    let resError = null;
    // User B attempts to access User A's mission
    const req = {
      user: { _id: userB_Id },
      params: { id: 'MSN-USER-A-ONLY' },
    };
    const res = {
      status: (code) => { resStatus = code; return res; },
      json: (data) => { resError = data; return res; },
    };

    await missionController.getMissionById(req, res, () => {});

    expect(resStatus).toBe(404);
    expect(resError.error).toMatch(/not found|unauthorized/i);
  });
});
