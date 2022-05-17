import { FC, useEffect } from "react";
import { config } from "../config";

export const App: FC = () => {
  useEffect(() => {
    (async () => {
      const { Algodv2 } = await import("algosdk");
      const algod = new Algodv2("", config.testnet.algod, "");

      console.log(await algod.getTransactionParams().do());
    })();
  }, []);

  return <h1>Algorand Tools</h1>;
};
