import { securityTestService } from '../src/services/securityTestService';

async function main() {
  console.log('=== AMLAKINO SECURITY & PRIVACY SUITE VALIDATION ===');
  const report = await securityTestService.runAllTests();
  
  console.log(`\nTotal Tests: ${report.results.length}`);
  console.log(`Passed: ${report.totalPassed}`);
  console.log(`Failed: ${report.totalFailed}`);
  console.log(`All Passed: ${report.allPassed ? 'YES ✓' : 'NO ✗'}\n`);

  for (const t of report.results) {
    const status = t.passed ? '✓ PASS' : '✗ FAIL';
    console.log(`[${status}] ${t.id} - ${t.title}`);
  }

  if (!report.allPassed) {
    console.error('Security test failures detected!');
    process.exit(1);
  } else {
    console.log('\nAll security and authorization checks PASSED with 100% compliance.');
  }
}

main().catch((err) => {
  console.error('Execution error:', err);
  process.exit(1);
});
