import * as fs from "fs";
import * as path from "path";

const CONTRACT_NAME = "SecureYieldCalculator";
const rel = "../backend";
const outdir = path.resolve("./abi");

if (!fs.existsSync(outdir)) {
  fs.mkdirSync(outdir);
}

const dir = path.resolve(rel);
const dirname = path.basename(dir);

const line = "\n===================================================================\n";

if (!fs.existsSync(dir)) {
  console.error(
    `${line}Unable to locate ${rel}. Expecting <root>/secure-yield/${dirname}${line}`
  );
  process.exit(1);
}

if (!fs.existsSync(outdir)) {
  console.error(`${line}Unable to locate ${outdir}.${line}`);
  process.exit(1);
}

const deploymentsDir = path.join(dir, "deployments");

function readDeployment(chainName, chainId, contractName, optional) {
  const chainDeploymentDir = path.join(deploymentsDir, chainName);
  if (!fs.existsSync(chainDeploymentDir)) {
    console.error(
      `${line}Unable to locate '${chainDeploymentDir}' directory.\n\n1. Goto '${dirname}' directory\n2. Run 'npx hardhat deploy --network ${chainName}'.${line}`
    );
    if (!optional) {
      process.exit(1);
    }
    return undefined;
  }
  const jsonString = fs.readFileSync(
    path.join(chainDeploymentDir, `${contractName}.json`),
    "utf-8"
  );
  const obj = JSON.parse(jsonString);
  obj.chainId = chainId;
  return obj;
}

const deployLocalhost = readDeployment("localhost", 31337, CONTRACT_NAME, true);
const deploySepolia = readDeployment("sepolia", 11155111, CONTRACT_NAME, true);

function readArtifact(contractName) {
  const artifactPath1 = path.join(dir, "artifacts", "contracts", `${contractName}.sol`, `${contractName}.json`);
  const artifactPath2 = path.join(dir, "artifacts", `${contractName}.sol`, `${contractName}.json`);
  const candidatePaths = [artifactPath1, artifactPath2];
  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      const raw = fs.readFileSync(p, "utf-8");
      const obj = JSON.parse(raw);
      if (obj && obj.abi) return obj;
    }
  }
  return undefined;
}

let artifact = undefined;
if (!deployLocalhost && !deploySepolia) {
  artifact = readArtifact(CONTRACT_NAME);
  if (!artifact) {
    console.error(
      `${line}No deployments found and no compiled artifact located. Build backend first:\n1. cd backend\n2. npx hardhat compile\n3. rerun 'npm run genabi' in frontend${line}`
    );
    process.exit(1);
  }
}

if (deployLocalhost && deploySepolia) {
  if (JSON.stringify(deployLocalhost.abi) !== JSON.stringify(deploySepolia.abi)) {
    console.error(
      `${line}Deployments on localhost and Sepolia differ. Cant use the same abi on both networks. Consider re-deploying the contracts on both networks.${line}`
    );
    process.exit(1);
  }
}

const abiSource = deploySepolia || deployLocalhost || artifact;

const tsCode = `
/*
  This file is auto-generated.
  Command: 'npm run genabi'
*/
export const ${CONTRACT_NAME}ABI = ${JSON.stringify({ abi: abiSource.abi }, null, 2)} as const;
\n`;

const sepoliaAddress = deploySepolia ? deploySepolia.address : "0x0000000000000000000000000000000000000000";
const localhostAddress = deployLocalhost ? deployLocalhost.address : "0x0000000000000000000000000000000000000000";

const tsAddresses = `
/*
  This file is auto-generated.
  Command: 'npm run genabi'
*/
export const ${CONTRACT_NAME}Addresses = { 
  "11155111": { address: "${sepoliaAddress}", chainId: 11155111, chainName: "sepolia" },
  "31337": { address: "${localhostAddress}", chainId: 31337, chainName: "hardhat" },
};
`;

console.log(`Generated ${path.join(outdir, `${CONTRACT_NAME}ABI.ts`)}`);
console.log(`Generated ${path.join(outdir, `${CONTRACT_NAME}Addresses.ts`)}`);

fs.writeFileSync(path.join(outdir, `${CONTRACT_NAME}ABI.ts`), tsCode, "utf-8");
fs.writeFileSync(path.join(outdir, `${CONTRACT_NAME}Addresses.ts`), tsAddresses, "utf-8");

