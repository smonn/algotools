import type algosdk from "algosdk";
import type {
  Algodv2,
  Indexer,
  makeApplicationCreateTxnFromObject,
  makeApplicationDeleteTxnFromObject,
} from "algosdk";
import { useEffect, useState } from "react";
import { config } from "../config";
import { invariant } from "../utils/invariant";

export type AlgorandNetwork = "mainnet" | "testnet";
export type AlgoSDK = typeof algosdk;
export type ApplicationCreateParams = Omit<
  Parameters<typeof makeApplicationCreateTxnFromObject>[0],
  "suggestedParams"
>;
export type ApplicationDeleteParams = Omit<
  Parameters<typeof makeApplicationDeleteTxnFromObject>[0],
  "suggestedParams"
>;

export class Algorand {
  algod: Algodv2;
  indexer: Indexer;

  constructor(readonly network: AlgorandNetwork, readonly algosdk: AlgoSDK) {
    this.algod = new algosdk.Algodv2("", config[network].algod, "");
    this.indexer = new algosdk.Indexer("", config[network].indexer, "");
  }

  get OnApplicationComplete() {
    return this.algosdk.OnApplicationComplete;
  }

  async compileApp(source: string): Promise<Uint8Array> {
    const compiledProgram = await this.algod.compile(source).do();
    return new Uint8Array(Buffer.from(compiledProgram.result, "base64"));
  }

  async applications(accountAddress: string) {
    const result = await this.indexer
      .lookupAccountCreatedApplications(accountAddress)
      .do();

    return result["applications"];
  }

  async applicationCreate(params: ApplicationCreateParams) {
    const cost = this.calculateAppCost(params);
    const accountInfo = await this.indexer.lookupAccountByID(params.from).do();

    invariant(
      cost.appCreate <= accountInfo["account"].amount,
      "not enough funds to create app"
    );

    return this.algosdk.makeApplicationCreateTxnFromObject({
      suggestedParams: await this.algod.getTransactionParams().do(),
      ...params,
    });
  }

  async applicationDelete(params: ApplicationDeleteParams) {
    return this.algosdk.makeApplicationDeleteTxnFromObject({
      suggestedParams: await this.algod.getTransactionParams().do(),
      ...params,
    });
  }

  async waitForConfirmation(txID: string, waitRounds = 5) {
    const result = await this.algosdk.waitForConfirmation(
      this.algod,
      txID,
      waitRounds
    );
    return result;
  }

  async sendRawTransaction(stxOrStxs: Uint8Array | Uint8Array[]) {
    return await this.algod.sendRawTransaction(stxOrStxs).do();
  }

  applicationAddress(appID: number) {
    return this.algosdk.getApplicationAddress(appID);
  }

  calculateAppCost(
    config: Pick<
      ApplicationCreateParams,
      | "extraPages"
      | "numGlobalByteSlices"
      | "numGlobalInts"
      | "numLocalByteSlices"
      | "numLocalInts"
    >
  ) {
    return {
      appCreate:
        100_000 * (1 + (config.extraPages ?? 0)) +
        (25000 + 3500) * (config.numGlobalInts ?? 0) +
        (25000 + 25000) * (config.numGlobalByteSlices ?? 0),
      appOptIn:
        100_000 +
        (25000 + 3500) * (config.numLocalInts ?? 0) +
        (25000 + 25000) * (config.numLocalByteSlices ?? 0),
    };
  }
}

export function useAlgorand(network: AlgorandNetwork): Algorand {
  const [algorand, setAlgorand] = useState<Algorand>();

  useEffect(() => {
    (async () => {
      const algosdk = await import("algosdk");
      setAlgorand(new Algorand(network, algosdk));
    })();
  }, [network]);

  return algorand!;
}
