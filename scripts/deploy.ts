import fs from "fs";
import path from "path";
import { createWalletClient, createPublicClient, http, defineChain } from "viem";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";
import * as dotenv from "dotenv";

dotenv.config();

const somniaShannon = defineChain({
  id: 50312,
  name: "Somnia Shannon Testnet",
  nativeCurrency: { name: "STT", symbol: "STT", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://dream-rpc.somnia.network"] },
  },
  blockExplorers: {
    default: { name: "Shannon Explorer", url: "https://shannon-explorer.somnia.network" },
  },
});

async function main() {
  const artifactPath = path.resolve(process.cwd(), "contracts", "build", "ProofCastAnchor.json");
  if (!fs.existsSync(artifactPath)) {
    console.error("Artifact not found. Please run compile first.");
    process.exit(1);
  }

  const { abi, bytecode } = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

  let privateKey = (process.env.SOMNIA_DEPLOYER_PRIVATE_KEY || process.env.PRIVATE_KEY) as `0x${string}`;

  if (!privateKey) {
    console.log("No SOMNIA_DEPLOYER_PRIVATE_KEY or PRIVATE_KEY found in environment.");
    console.log("To deploy the real smart contract to Somnia Shannon Testnet, please set:");
    console.log("SOMNIA_DEPLOYER_PRIVATE_KEY=0x<your_private_key_with_testnet_stt>");
    console.log("\nYou can get free testnet STT tokens from the Somnia Faucet: https://testnet.somnia.network/");
    return;
  }

  if (!privateKey.startsWith("0x")) {
    privateKey = `0x${privateKey}` as `0x${string}`;
  }

  const account = privateKeyToAccount(privateKey);
  console.log("Deployer Address:", account.address);

  const publicClient = createPublicClient({
    chain: somniaShannon,
    transport: http(),
  });

  const walletClient = createWalletClient({
    account,
    chain: somniaShannon,
    transport: http(),
  });

  const balance = await publicClient.getBalance({ address: account.address });
  console.log("Deployer STT Balance:", (Number(balance) / 1e18).toFixed(6), "STT");

  if (balance === 0n) {
    console.error("Deployer balance is 0 STT. Please fund this account from https://testnet.somnia.network/ faucet.");
    return;
  }

  console.log("Broadcasting deployment transaction to Somnia Shannon Testnet...");

  const hash = await walletClient.deployContract({
    abi,
    bytecode: bytecode as `0x${string}`,
  });

  console.log("Deployment Tx Hash:", hash);
  console.log(`Explorer: https://shannon-explorer.somnia.network/tx/${hash}`);
  console.log("Waiting for transaction receipt...");

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log("Contract successfully deployed at:", receipt.contractAddress);
  console.log(`View Contract: https://shannon-explorer.somnia.network/address/${receipt.contractAddress}`);

  return receipt.contractAddress;
}

main().catch(console.error);
