// E2E Integration Test for Sentinel ADS Extension-Backend Protocol
// Simulates browser extension actions: Auto-Scanning, Reporting, Auto-Detecting, and Auto-Blocking.

async function runTest() {
  console.log('🏁 Starting Sentinel ADS Extension-Backend Protocol Test...');
  
  const BASE_URL = 'http://localhost:3001';
  let caseId = '';
  let riskScore = 0;
  
  try {
    // ==========================================
    // STEP 1: Simulate Extension Auto-Scan (Auto-Detect Log)
    // ==========================================
    console.log('\n--- 1. Simulating Extension Auto-Scan (Detecting Exaggerated Content) ---');
    const scanPayload = {
      url: 'http://miracle-diet-scam.com/buy-now',
      title: 'คุมหิวสูตรผอมไว ลด 10 กิโลใน 3 วัน การันตี!',
      evidenceText: 'ผลิตภัณฑ์คุมหิว ยาลดความอ้วนสูตรเร่งด่วน สลายไขมันสะสม ลด 10 กิโลใน 3 วัน ปลอดภัย อย. 11-1-12345-1-0003',
      productLicenseNumber: '11-1-12345-1-0003' // ends with odd digit '3' -> should evaluate to VALID license
    };
    
    console.log('Sending scan log to backend POST /risk/logs...');
    const scanRes = await fetch(`${BASE_URL}/risk/logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(scanPayload)
    });
    
    if (!scanRes.ok) {
      throw new Error(`Failed to send risk logs: ${scanRes.status} ${await scanRes.text()}`);
    }
    
    const scanResult = await scanRes.json();
    caseId = scanResult.id;
    riskScore = scanResult.aiRiskScore;
    
    console.log('✅ Auto-Scan Log Received by Backend successfully!');
    console.log(`- Generated Case ID: ${caseId}`);
    console.log(`- Detected Domain: ${scanResult.domain}`);
    console.log(`- Computed AI Risk Score: ${riskScore}%`);
    console.log(`- License Status: ${scanResult.licenseStatus}`);
    console.log(`- AI Analysis Report Preview:\n  ${scanResult.aiAnalysis.substring(0, 150)}...`);
    
    // ==========================================
    // STEP 2: Verify Log exists in Dashboard view (GET /risk/logs)
    // ==========================================
    console.log('\n--- 2. Simulating Dashboard Retrieval of SYSTEM Auto-Scan Logs ---');
    // First we login to get token
    console.log('Logging in as Inspector to fetch auth token...');
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'inspector@fda.go.th', password: 'password123' })
    });
    
    if (!loginRes.ok) {
      throw new Error('Failed to login as inspector');
    }
    
    const { token } = await loginRes.json();
    
    console.log('Fetching risk logs from GET /risk/logs...');
    const logsRes = await fetch(`${BASE_URL}/risk/logs`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const riskLogs = await logsRes.json();
    const foundLog = riskLogs.find(log => log.id === caseId);
    
    if (foundLog) {
      console.log(`✅ Verified! Case ${caseId} is correctly registered in the system risk logs queue.`);
    } else {
      throw new Error('Test failed: Log not found in database risk logs queue');
    }
    
    // ==========================================
    // STEP 3: Simulate Extension Auto-Block (riskScore >= 80%)
    // ==========================================
    console.log('\n--- 3. Simulating Extension Auto-Block (Blocking Unsafe Domain) ---');
    if (riskScore >= 80) {
      console.log(`Risk Score is ${riskScore}% (>= 80%). Simulating AUTO_BLOCK action...`);
      console.log(`Calling POST /block/case/${caseId}...`);
      
      const blockRes = await fetch(`${BASE_URL}/block/case/${caseId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ performedByUserId: null }) // Auto-blocked by system
      });
      
      if (!blockRes.ok) {
        throw new Error(`Failed to execute block: ${blockRes.status} ${await blockRes.text()}`);
      }
      
      const blockResult = await blockRes.json();
      console.log('✅ Block Command executed successfully by Backend!');
      console.log(`- Block Log Entry: ID ${blockResult.id}, Reason: ${blockResult.reason}`);
    } else {
      console.log(`Risk Score is ${riskScore}% (< 80%). Simulating manual block request...`);
      const blockRes = await fetch(`${BASE_URL}/block/case/${caseId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ performedByUserId: 1 }) // Manually blocked by Inspector
      });
      const blockResult = await blockRes.json();
      console.log('✅ Manual Block executed successfully!');
    }
    
    // ==========================================
    // STEP 4: Verify Domain in Global Blocklist (GET /domains)
    // ==========================================
    console.log('\n--- 4. Simulating Extension Blocklist Synchronization ---');
    console.log('Fetching blocklist from GET /domains...');
    
    const domainsRes = await fetch(`${BASE_URL}/domains`);
    const blockedDomains = await domainsRes.json();
    
    const isDomainBlocked = blockedDomains.some(d => d.domain === 'miracle-diet-scam.com');
    if (isDomainBlocked) {
      console.log('✅ Success! "miracle-diet-scam.com" is now officially blacklisted.');
      console.log('   When any browser with Sentinel ADS Extension loads this domain, it will be BLOCKED immediately.');
    } else {
      throw new Error('Test failed: Domain was not added to the blocked list');
    }
    
    console.log('\n🏆 E2E INTEGRATION TEST SUCCEEDED! ALL SYSTEMS GO!');
    
  } catch (error) {
    console.error('❌ Integration Test Failed:', error.message);
    process.exit(1);
  }
}

runTest();
