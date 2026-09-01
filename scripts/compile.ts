import fs from "fs";
import path from "path";
// @ts-ignore
import solc from "solc";

const contractPath = path.resolve(process.cwd(), "contracts", "ProofCastAnchor.sol");
const source = fs.readFileSync(contractPath, "utf8");

const input = {
  language: "Solidity",
  sources: {
    "ProofCastAnchor.sol": {
      content: source,
    },
  },
  settings: {
    optimizer: {
      enabled: true,
      runs: 200,
    },
    outputSelection: {
      "*": {
        "*": ["abi", "evm.bytecode"],
      },
    },
  },
};

const output = JSON.parse(solc.compile(JSON.stringify(input)));

if (output.errors) {
  for (const error of output.errors) {
    console.error(error.formattedMessage);
  }
}

const contract = output.contracts["ProofCastAnchor.sol"]["ProofCastAnchor"];
const bytecode = "0x" + contract.evm.bytecode.object;
const abi = contract.abi;

fs.mkdirSync(path.resolve(process.cwd(), "contracts", "build"), { recursive: true });
fs.writeFileSync(
  path.resolve(process.cwd(), "contracts", "build", "ProofCastAnchor.json"),
  JSON.stringify({ abi, bytecode }, null, 2)
);

console.log("Successfully compiled ProofCastAnchor.sol!");
console.log("Bytecode length:", bytecode.length);
console.log("ABI functions:", abi.filter((x: any) => x.type === "function").map((x: any) => x.name));
