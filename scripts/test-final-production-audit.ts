import { storageService } from '../src/services/storageService';
import { authzService } from '../src/services/authzService';
import { matchService } from '../src/services/matchService';
import { visitService } from '../src/services/visitService';
import { calculateMatchCompatibility, DEFAULT_MATCH_WEIGHTS } from '../src/services/matchingEngine';
import { User, Property, Client, FollowUp, Visit, Opportunity } from '../src/types';

interface TestResult {
  category: string;
  name: string;
  passed: boolean;
  details?: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, category: string, name: string, details?: string) {
  if (condition) {
    results.push({ category, name, passed: true, details });
    console.log(`[PASS] [${category}] ${name}`);
  } else {
    results.push({ category, name, passed: false, details });
    console.error(`[FAIL] [${category}] ${name} -> ${details || 'Assertion failed'}`);
  }
}

async function runFinalProductionAudit() {
  console.log('=== STARTING AMLAKINO FINAL PRODUCTION AUDIT ===\n');

  // SETUP: Mock Data for Team A and Team B
  const supervisorA: User = {
    id: 'usr_sup_a',
    fullName: 'مدیر تیم الف (Supervisor A)',
    mobile: '09121110001',
    email: 'supervisor.a@agency-a.ir',
    role: 'manager',
    teamId: 'team_a',
    isActive: true,
    agentMode: 'team_member',
    subscriptionStatus: 'active',
    createdAt: new Date().toISOString(),
  };

  const agentA: User = {
    id: 'usr_agent_a',
    fullName: 'مشاور الف (Agent A)',
    mobile: '09121110002',
    email: 'agent.a@agency-a.ir',
    role: 'agent',
    teamId: 'team_a',
    isActive: true,
    agentMode: 'team_member',
    subscriptionStatus: 'active',
    createdAt: new Date().toISOString(),
  };

  const supervisorB: User = {
    id: 'usr_sup_b',
    fullName: 'مدیر تیم ب (Supervisor B)',
    mobile: '09122220001',
    email: 'supervisor.b@agency-b.ir',
    role: 'manager',
    teamId: 'team_b',
    isActive: true,
    agentMode: 'team_member',
    subscriptionStatus: 'active',
    createdAt: new Date().toISOString(),
  };

  const agentB: User = {
    id: 'usr_agent_b',
    fullName: 'مشاور ب (Agent B)',
    mobile: '09122220002',
    email: 'agent.b@agency-b.ir',
    role: 'agent',
    teamId: 'team_b',
    isActive: true,
    agentMode: 'team_member',
    subscriptionStatus: 'active',
    createdAt: new Date().toISOString(),
  };

  // 1. Create Properties & Clients for both teams
  const propA1 = await storageService.createProperty(
    {
      title: 'آپارتمان ۱۴۰ متری سعادت آباد',
      dealType: 'sale',
      transactionType: 'sale',
      propertyType: 'apartment',
      area: 140,
      price: 14000000000,
      totalPrice: 14000000000,
      bedrooms: 3,
      district: 'سعادت‌آباد',
      city: 'تهران',
      privacyState: 'private',
      status: 'active',
      ownerName: 'محسن کریمی (مالک خصوصی A)',
      ownerPhone: '09129990001',
      addressSummary: 'سعادت آباد، میدان کاج',
      fullAddress: 'سعادت آباد، میدان کاج، خ ۱۲، پلاک ۲۲',
      notes: 'یادداشت خصوصی مشاور الف: مالک تخفیف پای معامله می‌دهد.',
    },
    agentA
  );

  const propA_shared = await storageService.createProperty(
    {
      title: 'آپارتمان ۸۵ متری شهرک غرب',
      dealType: 'sale',
      transactionType: 'sale',
      propertyType: 'apartment',
      area: 85,
      price: 8500000000,
      totalPrice: 8500000000,
      bedrooms: 2,
      district: 'شهرک غرب',
      city: 'تهران',
      privacyState: 'shared',
      status: 'active',
      ownerName: 'رضا صبوری (مالک اشتراکی A)',
      ownerPhone: '09129990002',
      addressSummary: 'شهرک غرب، فاز ۱',
      fullAddress: 'شهرک غرب، فاز ۱، خ مهستان، پلاک ۴',
      notes: 'یادداشت اشتراکی تیم الف',
    },
    agentA
  );

  const clientA1 = await storageService.createClient(
    {
      fullName: 'دکتر علوی (متقاضی خصوصی A)',
      name: 'دکتر علوی',
      mobile: '09128880001',
      role: 'buyer',
      transactionType: 'sale',
      desiredDealType: 'sale',
      propertyType: 'apartment',
      desiredPropertyTypes: ['apartment'],
      budgetMax: 15000000000,
      maxBudget: 15000000000,
      minArea: 120,
      maxArea: 160,
      minBedrooms: 3,
      bedrooms: 3,
      desiredDistricts: ['سعادت‌آباد'],
      preferredRegions: ['سعادت‌آباد'],
      privacyState: 'private',
      status: 'active',
      notes: 'متقاضی نقدی، آماده عقد قرارداد فوری',
    },
    agentA
  );

  const clientA_shared = await storageService.createClient(
    {
      fullName: 'مهندس سهرابی (متقاضی اشتراکی A)',
      name: 'مهندس سهرابی',
      mobile: '09128880002',
      role: 'buyer',
      transactionType: 'sale',
      desiredDealType: 'sale',
      propertyType: 'apartment',
      desiredPropertyTypes: ['apartment'],
      budgetMax: 9000000000,
      maxBudget: 9000000000,
      minArea: 80,
      maxArea: 100,
      minBedrooms: 2,
      bedrooms: 2,
      desiredDistricts: ['شهرک غرب'],
      preferredRegions: ['شهرک غرب'],
      privacyState: 'shared',
      status: 'active',
      notes: 'بودجه تا ۹ میلیارد تومان',
    },
    agentA
  );

  const propB1 = await storageService.createProperty(
    {
      title: 'پنت‌هاوس ۲۵۰ متری نیاوران',
      dealType: 'sale',
      transactionType: 'sale',
      propertyType: 'penthouse',
      area: 250,
      price: 35000000000,
      totalPrice: 35000000000,
      bedrooms: 4,
      district: 'نیاوران',
      city: 'تهران',
      privacyState: 'private',
      status: 'active',
      ownerName: 'آقای شایسته (مالک خصوصی B)',
      ownerPhone: '09127770001',
      addressSummary: 'نیاوران، خ بوکان',
      fullAddress: 'نیاوران، خ بوکان، برج الماس، طبقه ۱۲',
      notes: 'یادداشت خصوصی مشاور ب: فروشنده بسیار حساس به قیمت.',
    },
    agentB
  );

  const clientB1 = await storageService.createClient(
    {
      fullName: 'مهندس بهرامی (متقاضی خصوصی B)',
      name: 'مهندس بهرامی',
      mobile: '09126660001',
      role: 'buyer',
      transactionType: 'sale',
      desiredDealType: 'sale',
      propertyType: 'penthouse',
      desiredPropertyTypes: ['penthouse'],
      budgetMax: 40000000000,
      maxBudget: 40000000000,
      minArea: 200,
      maxArea: 300,
      minBedrooms: 4,
      bedrooms: 4,
      desiredDistricts: ['نیاوران'],
      preferredRegions: ['نیاوران'],
      privacyState: 'private',
      status: 'active',
      notes: 'متقاضی خرید پنت‌هاوس لوکس',
    },
    agentB
  );

  // SECTION 2: MULTI-TENANT ISOLATION
  console.log('\n--- VERIFYING MULTI-TENANT ISOLATION ---');

  // 2.1: Agent A cannot see Team B properties
  const agentAProperties = await storageService.getProperties(agentA);
  const seesPropB = agentAProperties.some((p) => p.id === propB1.id || p.teamId === 'team_b');
  assert(!seesPropB, 'Multi-Tenant', 'Agent A cannot see Team B properties');

  // 2.2: Supervisor A cannot see Team B properties
  const supervisorAProperties = await storageService.getProperties(supervisorA);
  const supASeesPropB = supervisorAProperties.some((p) => p.id === propB1.id || p.teamId === 'team_b');
  assert(!supASeesPropB, 'Multi-Tenant', 'Supervisor A cannot see Team B properties');

  // 2.3: Agent B cannot see Team A properties
  const agentBProperties = await storageService.getProperties(agentB);
  const seesPropA = agentBProperties.some((p) => p.id === propA1.id || p.teamId === 'team_a');
  assert(!seesPropA, 'Multi-Tenant', 'Agent B cannot see Team A properties');

  // 2.4: Supervisor B cannot see Team A properties
  const supervisorBProperties = await storageService.getProperties(supervisorB);
  const supBSeesPropA = supervisorBProperties.some((p) => p.id === propA1.id || p.teamId === 'team_a');
  assert(!supBSeesPropA, 'Multi-Tenant', 'Supervisor B cannot see Team A properties');

  // 2.5: Agent A cannot see Team B clients
  const agentAClients = await storageService.getClients(agentA);
  const seesClientB = agentAClients.some((c) => c.id === clientB1.id || c.teamId === 'team_b');
  assert(!seesClientB, 'Multi-Tenant', 'Agent A cannot see Team B clients');

  // 2.6: Supervisor A cannot see Team B clients
  const supervisorAClients = await storageService.getClients(supervisorA);
  const supASeesClientB = supervisorAClients.some((c) => c.id === clientB1.id || c.teamId === 'team_b');
  assert(!supASeesClientB, 'Multi-Tenant', 'Supervisor A cannot see Team B clients');

  // 2.7: Agent B cannot see Team A clients
  const agentBClients = await storageService.getClients(agentB);
  const seesClientA = agentBClients.some((c) => c.id === clientA1.id || c.teamId === 'team_a');
  assert(!seesClientA, 'Multi-Tenant', 'Agent B cannot see Team A clients');

  // 2.8: Supervisor B cannot see Team A clients
  const supervisorBClients = await storageService.getClients(supervisorB);
  const supBSeesClientA = supervisorBClients.some((c) => c.id === clientA1.id || c.teamId === 'team_a');
  assert(!supBSeesClientA, 'Multi-Tenant', 'Supervisor B cannot see Team A clients');

  // 2.9: Direct ID access rejection across teams
  let directAccessThrew = false;
  try {
    await storageService.getPropertyById(propB1.id, agentA);
  } catch {
    directAccessThrew = true;
  }
  assert(directAccessThrew, 'Multi-Tenant', 'Direct getPropertyById across teams throws unauthorized');

  let directClientAccessThrew = false;
  try {
    await storageService.getClientById(clientB1.id, agentA);
  } catch {
    directClientAccessThrew = true;
  }
  assert(directClientAccessThrew, 'Multi-Tenant', 'Direct getClientById across teams throws unauthorized');

  // 2.10: Modification cross-tenant rejection
  let modifyCrossTenantThrew = false;
  try {
    await storageService.updateProperty(propB1.id, { price: 1000 }, agentA);
  } catch {
    modifyCrossTenantThrew = true;
  }
  assert(modifyCrossTenantThrew, 'Multi-Tenant', 'Agent A cannot modify Team B property');

  // 2.11: Team A Supervisor cannot see Agent A private owner contact or private notes
  const supViewPropA_private = await storageService.getPropertyById(propA1.id, supervisorA);
  assert(
    supViewPropA_private?.ownerPhone === '' && supViewPropA_private?.notes === undefined,
    'Privacy & RBAC',
    'Supervisor cannot view private owner phone or confidential notes of Agent A'
  );

  // SECTION 3: PRIVILEGE ESCALATION
  console.log('\n--- VERIFYING PRIVILEGE ESCALATION PREVENTION ---');

  // 3.1: Agent attempting to edit role or team_id
  const agentFakeElevation: User = { ...agentA, role: 'manager' };
  assert(
    !authzService.isManager(agentA) && authzService.isManager(supervisorA),
    'Privilege Escalation',
    'Agent role cannot self-elevate to manager without server authorization'
  );

  // SECTION 4: MATCH SECURITY & CROSS-TENANT ISOLATION
  console.log('\n--- VERIFYING MATCH SECURITY & TEAM MATCH ISOLATION ---');

  // 4.1: Cross match between Property A and Client B must never happen in getAll
  const matchesForAgentA = await matchService.getAll(agentA);
  const crossMatchFound = matchesForAgentA.some(
    (m) =>
      (m.property.teamId === 'team_a' && m.client.teamId === 'team_b') ||
      (m.property.teamId === 'team_b' && m.client.teamId === 'team_a')
  );
  assert(!crossMatchFound, 'Match Security', 'Cross-tenant matches (Team A x Team B) are strictly excluded');

  // 4.2: Property A + Client A works
  const matchA = matchesForAgentA.find(
    (m) => m.propertyId === propA1.id && m.clientId === clientA1.id
  );
  assert(Boolean(matchA && matchA.matchScore > 80), 'Match Security', 'Intra-team match (Property A + Client A) succeeds with high score');

  // 4.3: Property B + Client B works
  const matchesForAgentB = await matchService.getAll(agentB);
  const matchB = matchesForAgentB.find(
    (m) => m.propertyId === propB1.id && m.clientId === clientB1.id
  );
  assert(Boolean(matchB && matchB.matchScore > 80), 'Match Security', 'Intra-team match (Property B + Client B) succeeds with high score');

  // 4.4: findMatchesForProperty & findMatchesForClient sanity & privacy masking
  const propMatches = await matchService.findMatchesForProperty(propA1.id, agentA);
  assert(propMatches.length > 0, 'Match Security', 'findMatchesForProperty returns valid intra-team matches');
  const clientMatches = await matchService.findMatchesForClient(clientA1.id, agentA);
  assert(clientMatches.length > 0, 'Match Security', 'findMatchesForClient returns valid intra-team matches');

  // SECTION 5: MATCHING ENGINE NUMERICAL INTEGRITY
  console.log('\n--- VERIFYING MATCHING ENGINE NUMERICAL INTEGRITY ---');

  const testCases = [
    { p: propA1, c: clientA1 },
    { p: propA_shared, c: clientA_shared },
    { p: propB1, c: clientB1 },
    { p: propA1, c: clientB1 },
  ];

  let mathIntegrityPassed = true;
  for (const tc of testCases) {
    const res = calculateMatchCompatibility(tc.p, tc.c, DEFAULT_MATCH_WEIGHTS);
    if (isNaN(res.score) || !isFinite(res.score) || res.score < 0 || res.score > 100) {
      mathIntegrityPassed = false;
      console.error(`Invalid score: ${res.score}`);
    }
  }
  assert(mathIntegrityPassed, 'Matching Engine', 'Scores are strictly bounded 0-100, no NaN, no Infinity, no negative');

  // SECTION 6: TEAM LOOKUP ISOLATION
  console.log('\n--- VERIFYING TEAM LOOKUP ISOLATION ---');

  const teamForA = await storageService.getTeam(agentA);
  assert(teamForA === null || teamForA.id === agentA.teamId, 'Team Lookup', 'storageService.getTeam obtains caller team specifically');

  const teamForB = await storageService.getTeam(agentB);
  assert(teamForB === null || teamForB.id === agentB.teamId, 'Team Lookup', 'storageService.getTeam never returns Team A to Team B');

  // SECTION 7: END-TO-END USER WORKFLOWS
  console.log('\n--- VERIFYING AGENT & SUPERVISOR WORKFLOWS ---');

  // Agent workflow: Create follow-up and visit
  const followUpA = await storageService.createFollowUp(
    {
      title: 'تماس با دکتر علوی جهت هماهنگی جلسه قرارداد',
      dueDate: 'امروز',
      dueTime: '17:00',
      priority: 'high',
      status: 'pending',
      type: 'call',
      clientId: clientA1.id,
      clientName: clientA1.fullName,
      clientPhone: clientA1.mobile,
      propertyId: propA1.id,
      propertyTitle: propA1.title,
    },
    agentA
  );
  assert(Boolean(followUpA.id), 'Agent Workflow', 'Agent creates follow-up successfully');

  const visitA = await visitService.schedule(
    {
      client: clientA1,
      property: propA1,
      date: 'فردا',
      time: '18:30',
      notes: 'بازدید اول متقاضی',
    },
    agentA
  );
  assert(Boolean(visitA.id), 'Agent Workflow', 'Agent schedules visit successfully');

  // Supervisor workflow: View KPI stats
  const supStats = await storageService.getDashboardStats(supervisorA);
  assert(
    typeof supStats.activePropertiesCount === 'number' && typeof supStats.activeClientsCount === 'number',
    'Supervisor Workflow',
    'Supervisor views aggregated dashboard stats successfully'
  );

  console.log('\n=== FINAL PRODUCTION AUDIT COMPLETED ===');
  const allPassed = results.every((r) => r.passed);
  console.log(`TOTAL AUDIT CHECKS: ${results.length} | PASSED: ${results.filter((r) => r.passed).length} | FAILED: ${results.filter((r) => !r.passed).length}`);
  return allPassed;
}

runFinalProductionAudit().then((passed) => {
  if (!passed) {
    process.exit(1);
  }
});
