import sharp from 'sharp';

async function main() {
  const darkSvg = `
    <svg width="1200" height="800" xmlns="http://www.w3.org/2000/svg">
      <rect width="1200" height="800" fill="#08050B"/>
      <!-- Top Navigation Header -->
      <rect width="1200" height="80" fill="#1B0E23"/>
      <text x="40" y="50" font-family="Arial" font-size="24" font-weight="bold" fill="#FF55BD">DOERA AI Engine</text>
      <text x="800" y="50" font-family="Arial" font-size="16" fill="#EDE4EE">Dashboard  Pricing  Login  Settings</text>
      <!-- Main Content Cards -->
      <rect x="40" y="140" width="540" height="300" rx="16" fill="#150C1C" stroke="#361744" stroke-width="2"/>
      <text x="70" y="190" font-family="Arial" font-size="20" font-weight="bold" fill="#FFFFFF">Autonomous Agent Orchestrator</text>
      <text x="70" y="230" font-family="Arial" font-size="14" fill="#B9AEBE">Status: Operational across 7 real-time nodes.</text>
      <rect x="70" y="260" width="160" height="40" rx="8" fill="#FF55BD"/>
      <text x="100" y="285" font-family="Arial" font-size="14" font-weight="bold" fill="#FFFFFF">Launch Task</text>

      <rect x="620" y="140" width="540" height="300" rx="16" fill="#150C1C" stroke="#361744" stroke-width="2"/>
      <text x="650" y="190" font-family="Arial" font-size="20" font-weight="bold" fill="#FFFFFF">Mission Control Real-Time Telemetry</text>
      <text x="650" y="230" font-family="Arial" font-size="14" fill="#B9AEBE">Proof of Execution hashes and live tracking.</text>
    </svg>
  `;
  const buf = await sharp(Buffer.from(darkSvg)).png().toBuffer();
  const width = 1200;
  const height = 800;
  const headerH = 80;

  const hBuf = await sharp(buf).extract({ left: 0, top: 0, width, height: headerH }).toBuffer();
  const hStats = await sharp(hBuf).stats();

  const bodyBuf = await sharp(buf).extract({ left: 0, top: headerH, width, height: height - headerH }).toBuffer();
  const bodyStats = await sharp(bodyBuf).stats();
  
  console.log('hStats:', JSON.stringify(hStats.channels.map(c => ({ mean: c.mean, stdev: c.stdev }))));
  console.log('bodyStats:', JSON.stringify(bodyStats.channels.map(c => ({ mean: c.mean, stdev: c.stdev }))));
}

main().catch(console.error);
