import type { PeraWalletConnect } from "@perawallet/connect";
import type { SignerTransaction } from "@perawallet/connect/dist/util/model/peraWalletModels";
import type { TransactionSigner } from "algosdk";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { invariant } from "../utils/invariant";

async function loadPeraWalletConnect() {
  const { PeraWalletConnect } = await import("@perawallet/connect");
  return new PeraWalletConnect();
}

export function usePeraWallet() {
  const peraWalletRef = useRef<PeraWalletConnect>();
  const [accountAddress, setAccountAddress] = useState("");

  const disconnect = useCallback(async () => {
    await peraWalletRef.current?.disconnect();
    setAccountAddress("");
  }, []);

  const connect = useCallback(async () => {
    const peraWallet =
      peraWalletRef.current ??
      (peraWalletRef.current = await loadPeraWalletConnect());

    const [account] = await peraWallet.connect();
    invariant(account, "no account returned while connecting");
    setAccountAddress(account);

    peraWallet.connector?.on("disconnect", disconnect);
  }, []);

  const signTransaction = useCallback(
    async (
      txGroups: SignerTransaction[][],
      signerAddress?: string
    ): Promise<Uint8Array[]> => {
      const peraWallet =
        peraWalletRef.current ??
        (peraWalletRef.current = await loadPeraWalletConnect());

      return await peraWallet.signTransaction(txGroups, signerAddress);
    },
    []
  );

  const getSigner = useCallback((): TransactionSigner => {
    return (txnGroup) => {
      return signTransaction([txnGroup.map((txn) => ({ txn }))]);
    };
  }, [signTransaction]);

  useEffect(() => {
    (async () => {
      const peraWallet =
        peraWalletRef.current ??
        (peraWalletRef.current = await loadPeraWalletConnect());

      try {
        const [account] = await peraWallet.reconnectSession();
        invariant(account, "no account returned while reconnecting");
        setAccountAddress(account);
      } catch (error) {
        console.error(error);
        // TODO: handle error better
      }
    })();
  }, []);

  return useMemo(
    () => ({
      accountAddress,
      connect,
      disconnect,
      signTransaction,
      getSigner,
    }),
    [connect, disconnect, getSigner, accountAddress, signTransaction]
  );
}
