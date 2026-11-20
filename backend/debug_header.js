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
  const imgBuffer = await sharp(Buffer.from(darkSvg)).png().toBuffer();
  const width = 1200;
  const height = 800;

  const baseStats = await sharp(imgBuffer).stats();
  const baseLuminance = Math.round(
    0.299 * baseStats.channels[0].mean +
    0.587 * baseStats.channels[1].mean +
    0.114 * baseStats.channels[2].mean
  );

  const headerH = Math.max(10, Math.round(height * 0.10));
  const headerBuf = await sharp(imgBuffer)
    .extract({ left: 0, top: 0, width, height: headerH })
    .toBuffer();
  const headerStats = await sharp(headerBuf).stats();

  const hLum = Math.round(
    0.299 * headerStats.channels[0].mean +
    0.587 * headerStats.channels[1].mean +
    0.114 * headerStats.channels[2].mean
  );
  const hasHeaderBar = Math.abs(hLum - baseLuminance) >= 4;

  console.log({ baseLuminance, hLum, diff: Math.abs(hLum - baseLuminance), hasHeaderBar });
}

main().catch(console.error);
