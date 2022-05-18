import type { FC } from "react";
import { Route, Routes } from "react-router-dom";
import { usePeraWallet } from "../../hooks/usePeraWallet";
import { formatAddress } from "../../utils/formatters";
import { Home } from "../Home";
import { Layout } from "../Layout";
import {
  SmartContractCall,
  SmartContractList,
  SmartContractNew,
} from "../SmartContract";
import * as css from "./App.module.css";

export const App: FC = () => {
  const peraWallet = usePeraWallet();

  return (
    <>
      <header className={css["Header"]}>
        <span>Algorand Tools</span>

        <span className={css["Header-account"]}>
          <span>{formatAddress(peraWallet.accountAddress)}</span>

          <button
            type="button"
            onClick={
              peraWallet.accountAddress
                ? () => peraWallet.disconnect()
                : () => peraWallet.connect()
            }
          >
            {peraWallet.accountAddress ? "Disconnect wallet" : "Connect wallet"}
          </button>
        </span>
      </header>

      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="smart-contract" element={<SmartContractList />} />
          <Route path="smart-contract/new" element={<SmartContractNew />} />
          <Route
            path="smart-contract/call/:id"
            element={<SmartContractCall />}
          />
        </Route>
      </Routes>
    </>
  );
};
