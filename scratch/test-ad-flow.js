async function runTest() {
  console.log('Starting Sentinel ADS extension-backend integration test...');

  const BASE_URL = 'http://localhost:3001';
  let caseId = '';
  let riskScore = 0;

  try {
    console.log('\n--- 1. Simulating extension auto-scan ---');
    const scanPayload = {
      url: 'http://miracle-diet-scam.com/buy-now',
      title: 'Weight loss fast, lose 10 kg in 3 days',
      evidenceText:
        'Miracle capsule for fast weight loss. Lose 10 kg in 3 days. Safe and FDA approved. 11-1-12345-1-0003',
      productLicenseNumber: '11-1-12345-1-0003',
    };

    const scanRes = await fetch(`${BASE_URL}/risk/logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(scanPayload),
    });

    if (!scanRes.ok) {
      throw new Error(`Failed to send risk logs: ${scanRes.status} ${await scanRes.text()}`);
    }

    const scanResult = await scanRes.json();
    caseId = scanResult.id;
    riskScore = scanResult.aiRiskScore;

    console.log(`Created case: ${caseId}`);
    console.log(`Detected domain: ${scanResult.domain}`);
    console.log(`Risk score: ${riskScore}%`);
    console.log(`License status: ${scanResult.licenseStatus}`);

    console.log('\n--- 2. Verifying dashboard/system retrieval ---');
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'inspector@fda.go.th', password: 'password123' }),
    });

    if (!loginRes.ok) {
      throw new Error('Failed to login as inspector');
    }

    const { token } = await loginRes.json();
    const logsRes = await fetch(`${BASE_URL}/risk/logs`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const riskLogs = await logsRes.json();
    const foundLog = riskLogs.find((log) => log.id === caseId);

    if (!foundLog) {
      throw new Error('Test failed: log not found in risk logs queue');
    }

    console.log(`Verified case ${caseId} in risk logs queue.`);

    console.log('\n--- 3. Simulating block action ---');
    const blockRes = await fetch(`${BASE_URL}/block/case/${caseId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ performedByUserId: riskScore >= 80 ? null : 1 }),
    });

    if (!blockRes.ok) {
      throw new Error(`Failed to execute block: ${blockRes.status} ${await blockRes.text()}`);
    }

    const blockResult = await blockRes.json();
    console.log(`Block response: ${JSON.stringify(blockResult)}`);

    console.log('\n--- 4. Verifying blocked domain sync ---');
    const domainsRes = await fetch(`${BASE_URL}/domains`);
    const blockedDomains = await domainsRes.json();
    const isDomainBlocked = blockedDomains.some((d) => d.domain === 'miracle-diet-scam.com');

    if (!isDomainBlocked) {
      throw new Error('Test failed: domain was not added to the blocked list');
    }

    console.log('Blocked domain verified in /domains.');
    console.log('\nIntegration test succeeded.');
  } catch (error) {
    console.error('Integration test failed:', error.message);
    process.exit(1);
  }
}

runTest();
