import type { Algodv2, Indexer, Transaction } from "algosdk";
import { config } from "../config";
import { invariant } from "./invariant";
import type { CreateSmartContract } from "./validation";

export type AlgorandNetwork = "mainnet" | "testnet";

export async function compileApp(
  client: Algodv2,
  source: string
): Promise<Uint8Array> {
  const compiledProgram = await client.compile(source).do();
  return new Uint8Array(Buffer.from(compiledProgram.result, "base64"));
}

export function calculateCost(
  config: Pick<CreateSmartContract, "globalState" | "localState" | "extraPages">
) {
  return {
    appCreate:
      100_000 * (1 + config.extraPages) +
      (25000 + 3500) * config.globalState.numInts +
      (25000 + 25000) * config.globalState.numByteSlices,
    appOptIn:
      100_000 +
      (25000 + 3500) * config.localState.numInts +
      (25000 + 25000) * config.localState.numByteSlices,
  };
}

export async function getAlgod(network: AlgorandNetwork): Promise<Algodv2> {
  const { Algodv2 } = await import("algosdk");
  return new Algodv2("", config[network].algod, "");
}

export async function getIndexer(network: AlgorandNetwork): Promise<Indexer> {
  const { Indexer } = await import("algosdk");
  return new Indexer("", config[network].indexer, "");
}

export async function deploySmartContract(
  network: AlgorandNetwork,
  accountAddress: string,
  data: CreateSmartContract
): Promise<Transaction> {
  const { makeApplicationCreateTxnFromObject, OnApplicationComplete } =
    await import("algosdk");

  const client = await getAlgod(network);
  const indexer = await getIndexer(network);

  const cost = calculateCost(data);
  const accountInfo = await indexer.lookupAccountByID(accountAddress).do();

  invariant(
    cost.appCreate <= accountInfo["account"].amount,
    "not enough funds to create app"
  );

  const approvalProgram = await compileApp(client, data.approvalSource);
  const clearProgram = await compileApp(client, data.clearStateSource);

  const suggestedParams = await client.getTransactionParams().do();
  const txn = makeApplicationCreateTxnFromObject({
    approvalProgram,
    clearProgram,
    suggestedParams,
    from: accountAddress,
    onComplete: OnApplicationComplete.NoOpOC,
    numGlobalByteSlices: data.globalState.numByteSlices,
    numGlobalInts: data.globalState.numInts,
    numLocalByteSlices: data.localState.numByteSlices,
    numLocalInts: data.localState.numInts,
    extraPages: data.extraPages,
  });

  return txn;
}
