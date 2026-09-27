import { Property, Client } from '../src/types';
import {
  calculateMatchCompatibility,
  budgetScore,
  locationScore,
  areaScore,
  propertyTypeScore,
  transactionTypeScore,
  bedroomScore,
  featureScore,
  DEFAULT_MATCH_WEIGHTS,
} from '../src/services/matchingEngine';

console.log('=== AMLAKINO MATCHING ENGINE VALIDATION ===\n');

// 1. Example Test from Prompt
const testClient1: Client = {
  id: 'cli_test_1',
  fullName: 'پیمان حسینی',
  mobile: '09121112233',
  role: 'buyer',
  status: 'active',
  desiredDealType: 'sale',
  desiredPropertyTypes: ['apartment'],
  desiredDistricts: ['شمال تهران'],
  minArea: 80,
  maxArea: 100,
  budgetMin: 7_000_000_000,
  budgetMax: 8_000_000_000,
  minBedrooms: 2,
  mustHaveParking: true,
  mustHaveElevator: true,
  ownerId: 'usr_101',
  privacyState: 'private',
  agentId: 'usr_101',
  createdAt: '1403/07/01',
};

const testProperty1: Property = {
  id: 'prop_test_1',
  code: 'AML-TEST1',
  title: 'آپارتمان ۹۲ متری سعادت‌آباد',
  dealType: 'sale',
  propertyType: 'apartment',
  area: 92,
  totalPrice: 7_500_000_000,
  bedrooms: 2,
  district: 'سعادت‌آباد',
  city: 'تهران',
  floor: 3,
  totalFloors: 5,
  yearBuilt: 1399,
  parking: true,
  elevator: true,
  storage: true,
  balcony: true,
  addressSummary: 'سعادت‌آباد، علامه',
  description: 'واحد شیک و خوش نقشه',
  features: ['پارکینگ', 'آسانسور', 'انباری'],
  ownerName: 'آقای شمس',
  ownerPhone: '09129998877',
  status: 'active',
  ownerId: 'usr_101',
  privacyState: 'private',
  agentId: 'usr_101',
  createdAt: '1403/07/01',
  updatedAt: '1403/07/01',
};

console.log('--- TEST 1: Ideal High Compatibility Match ---');
const res1 = calculateMatchCompatibility(testProperty1, testClient1);
console.log(`Total Score: ${res1.score}% (Expected: > 90%)`);
console.log('Matched Factors:');
res1.matchedFactors.forEach((f) => console.log('  ', f));
if (res1.weakFactors.length > 0) {
  console.log('Weak Factors:');
  res1.weakFactors.forEach((f) => console.log('  ', f));
}
if (res1.score < 90) {
  console.error('FAIL: Expected score >= 90% for ideal match');
} else {
  console.log('PASS: High score obtained!');
}

// 2. Partial Match Test: Property area = 110 sqm (deviates from 80-100m)
console.log('\n--- TEST 2: Partial Match Deviation (110 sqm Property) ---');
const testPropertyPartial: Property = {
  ...testProperty1,
  id: 'prop_test_2',
  area: 110,
  title: 'آپارتمان ۱۱۰ متری سعادت‌آباد',
};
const res2 = calculateMatchCompatibility(testPropertyPartial, testClient1);
console.log(`Total Score: ${res2.score}%`);
console.log('Weak Factors (Should show deviation):');
res2.weakFactors.forEach((f) => console.log('  ', f));
const hasAreaDeviation = res2.weakFactors.some((f) => f.includes('متراژ کمی بیشتر'));
if (hasAreaDeviation) {
  console.log('PASS: Correctly explained area deviation without zeroing the match!');
} else {
  console.error('FAIL: Missing area deviation explanation');
}

// 3. Poor Match Test: Transaction Type Mismatch (Rent property vs Buy client)
console.log('\n--- TEST 3: Poor Match / Incompatible Transaction Type ---');
const testPropertyRent: Property = {
  ...testProperty1,
  id: 'prop_test_3',
  dealType: 'rent',
  deposit: 1_000_000_000,
  monthlyRent: 30_000_000,
};
const res3 = calculateMatchCompatibility(testPropertyRent, testClient1);
console.log(`Total Score: ${res3.score}% (Expected: <= 15% due to Rent vs Sale)`);
console.log('Summary:', res3.summary);
if (res3.score <= 15) {
  console.log('PASS: Incompatible transaction type correctly disqualified!');
} else {
  console.error('FAIL: Expected score <= 15% for rent vs sale');
}

// 4. Test Individual Unit Functions
console.log('\n--- TEST 4: Deterministic Individual Scorer Functions ---');
const bScore = budgetScore(testProperty1, testClient1, 25);
const lScore = locationScore(testProperty1, testClient1, 20);
const aScore = areaScore(testProperty1, testClient1, 15);
const tScore = transactionTypeScore(testProperty1, testClient1, 10);
const pScore = propertyTypeScore(testProperty1, testClient1, 10);
const bedScore = bedroomScore(testProperty1, testClient1, 10);
const fScore = featureScore(testProperty1, testClient1, 10);

console.log(`Budget Score: ${bScore.weightedScore}/${bScore.weight} - ${bScore.explanation}`);
console.log(`Location Score: ${lScore.weightedScore}/${lScore.weight} - ${lScore.explanation}`);
console.log(`Area Score: ${aScore.weightedScore}/${aScore.weight} - ${aScore.explanation}`);
console.log(`Transaction Score: ${tScore.weightedScore}/${tScore.weight} - ${tScore.explanation}`);
console.log(`Property Type Score: ${pScore.weightedScore}/${pScore.weight} - ${pScore.explanation}`);
console.log(`Bedrooms Score: ${bedScore.weightedScore}/${bedScore.weight} - ${bedScore.explanation}`);
console.log(`Features Score: ${fScore.weightedScore}/${fScore.weight} - ${fScore.explanation}`);

console.log('\nAll tests executed successfully.');
