import fs from 'fs';
import readline from 'readline';

async function getLastUserInput() {
  const fileStream = fs.createReadStream('C:/Users/JAIWANT KARRUN.S.A/.gemini/antigravity/brain/53256e6f-5d1b-4d0d-b1cb-d1a42dd7e71d/.system_generated/logs/transcript.jsonl');
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });
  let userInputs = [];
  for await (const line of rl) {
    if (line.includes('"USER_INPUT"')) {
      userInputs.push(line);
    }
  }
  console.log('Total user inputs:', userInputs.length);
  const last3 = userInputs.slice(-3);
  for (const item of last3) {
    const parsed = JSON.parse(item);
    console.log('--- USER INPUT ---', parsed.created_at);
    console.log(parsed.content?.slice(0, 300));
  }
}
getLastUserInput().catch(console.error);
