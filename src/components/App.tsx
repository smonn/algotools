import type { Algodv2 } from "algosdk";
import {
  FC,
  FormEventHandler,
  MouseEventHandler,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { config } from "../config";
import type { PeraWalletConnect } from "@perawallet/connect";

function isFile(formValue: FormDataEntryValue | null): formValue is File {
  return formValue instanceof File;
}

function toInteger(formValue: FormDataEntryValue | null): number {
  if (formValue === null) return NaN;
  if (typeof formValue !== "string") return NaN;
  return Number.parseInt(formValue, 10);
}

function isInteger(formValue: number): formValue is number {
  return (
    !isNaN(formValue) &&
    isFinite(formValue) &&
    Math.floor(formValue) === formValue
  );
}

function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error("Invariant failed: " + message);
  }
}

async function compileApp(
  client: Algodv2,
  source: string
): Promise<Uint8Array> {
  const compiledProgram = await client.compile(source).do();
  return new Uint8Array(Buffer.from(compiledProgram.result, "base64"));
}

async function loadPeraWalletConnect() {
  const { PeraWalletConnect } = await import("@perawallet/connect");
  return new PeraWalletConnect();
}

function formatAddress(address: string): string {
  return (
    address.substring(0, 6) + "..." + address.substring(address.length - 6)
  );
}

function calculateCost(config: {
  numGlobalByteSlices: number;
  numLocalByteSlices: number;
  numGlobalInts: number;
  numLocalInts: number;
  extraPages: number;
}) {
  return {
    appCreate:
      100_000 * (1 + config.extraPages) +
      (25000 + 3500) * config.numGlobalInts +
      (25000 + 25000) * config.numGlobalByteSlices,
    appOptIn:
      100_000 +
      (25000 + 3500) * config.numLocalInts +
      (25000 + 25000) * config.numLocalByteSlices,
  };
}

export const App: FC = () => {
  const peraWalletRef = useRef<PeraWalletConnect>();
  const [accountAddress, setAccountAddress] = useState("");

  const onSubmit = useCallback<FormEventHandler<HTMLFormElement>>(
    async (event) => {
      console.log("submitted form");
      event.preventDefault();

      if (!accountAddress) return;

      console.log("validating...");
      const formData = new FormData(event.currentTarget);
      const approvalFile = formData.get("approval");
      const clearStateFile = formData.get("clear_state");
      const numGlobalByteSlices = toInteger(
        formData.get("num_global_byte_slices")
      );
      const numGlobalInts = toInteger(formData.get("num_global_ints"));
      const numLocalByteSlices = toInteger(
        formData.get("num_local_byte_slices")
      );
      const numLocalInts = toInteger(formData.get("num_local_ints"));
      const extraPages = toInteger(formData.get("extra_pages"));

      invariant(isFile(approvalFile), "approval is not a file");
      invariant(isFile(clearStateFile), "clear_state is not a file");
      invariant(
        isInteger(numGlobalByteSlices),
        "num_global_byte_slices is not an integer"
      );
      invariant(isInteger(numGlobalInts), "num_global_ints is not an integer");
      invariant(
        isInteger(numLocalByteSlices),
        "num_local_byte_slices is not an integer"
      );
      invariant(isInteger(numLocalInts), "num_local_ints is not an integer");
      invariant(isInteger(extraPages), "extra_pages is not an integer");

      const approvalSource = await approvalFile.text();
      const clearStateSource = await clearStateFile.text();

      console.log("loading algosdk...");
      const {
        Indexer,
        Algodv2,
        makeApplicationCreateTxnFromObject,
        waitForConfirmation,
        OnApplicationComplete,
      } = await import("algosdk");

      console.log("checking account balance...");
      const indexer = new Indexer("", config.testnet.indexer, "");
      const cost = calculateCost({
        numGlobalByteSlices,
        numLocalByteSlices,
        numGlobalInts,
        numLocalInts,
        extraPages,
      });
      const accountInfo = await indexer.lookupAccountByID(accountAddress).do();
      console.log({ cost, account: accountInfo["account"] });
      invariant(
        cost.appCreate <= accountInfo["account"].amount,
        "not enough funds to create app"
      );

      console.log("compiling contracts...");
      const algod = new Algodv2("", config.testnet.algod, "");
      const approvalProgram = await compileApp(algod, approvalSource);
      const clearProgram = await compileApp(algod, clearStateSource);

      console.log("creating txn...");
      const suggestedParams = await algod.getTransactionParams().do();
      const txn = makeApplicationCreateTxnFromObject({
        approvalProgram,
        clearProgram,
        suggestedParams,
        from: accountAddress,
        onComplete: OnApplicationComplete.NoOpOC,
        numGlobalByteSlices,
        numGlobalInts,
        numLocalByteSlices,
        numLocalInts,
        extraPages,
      });

      console.log({ txn });

      console.log("signing txn...");
      const peraWallet =
        peraWalletRef.current ??
        (peraWalletRef.current = await loadPeraWalletConnect());

      let signedTxns: Uint8Array[];

      try {
        signedTxns = await peraWallet.signTransaction([
          [
            {
              txn,
            },
          ],
        ]);
      } catch (error) {
        // most likely user declined to sign txn
        console.error(error);
        return;
      }

      console.log("submitting txn...");
      await algod.sendRawTransaction(signedTxns).do();

      console.log("waiting for confirmation...");
      const result = await waitForConfirmation(algod, txn.txID(), 5);
      console.log("done", { result });
    },
    [accountAddress]
  );

  const onDisconnectWallet = useCallback(async () => {
    await peraWalletRef.current?.disconnect();
    setAccountAddress("");
  }, []);

  const onConnectWallet = useCallback<MouseEventHandler<HTMLButtonElement>>(
    async (event) => {
      event.preventDefault();

      const peraWallet =
        peraWalletRef.current ??
        (peraWalletRef.current = await loadPeraWalletConnect());

      const [account] = await peraWallet.connect();
      invariant(account, "no account returned while connecting");
      setAccountAddress(account);

      peraWallet.connector?.on("disconnect", onDisconnectWallet);
    },
    []
  );

  useEffect(() => {
    (async () => {
      const peraWallet =
        peraWalletRef.current ??
        (peraWalletRef.current = await loadPeraWalletConnect());

      try {
        const [account] = await peraWallet.reconnectSession();
        invariant(account, "no account returned while reconnecting");
        setAccountAddress(account);
      } catch {
        // ignore, user probably wasn't connected
      }
    })();
  }, []);

  return (
    <>
      <h1>Algorand Tools</h1>

      <p>Connected as {formatAddress(accountAddress)}</p>

      {accountAddress ? (
        <button key="connect-btn" type="button" onClick={onDisconnectWallet}>
          Disconnect wallet
        </button>
      ) : (
        <button key="disconnect-btn" type="button" onClick={onConnectWallet}>
          Connect wallet
        </button>
      )}

      <h2>Create app</h2>
      <p>
        Deploys a smart contract. Once deployed, the App ID and Address will be
        displayed.
      </p>
      <form onSubmit={onSubmit}>
        <label>
          <span>Approval TEAL</span>
          <input required type="file" name="approval" accept=".teal" />
        </label>
        <label>
          <span>Clear State TEAL</span>
          <input required type="file" name="clear_state" accept=".teal" />
        </label>
        <fieldset>
          <legend>State schema</legend>
          <p>
            Configure how many byte slices and integers are used by the app.
          </p>
          <label>
            <span>Global byte slices</span>
            <input
              defaultValue={0}
              type="number"
              min={0}
              step={1}
              name="num_global_byte_slices"
            />
          </label>
          <label>
            <span>Global integers</span>
            <input
              defaultValue={0}
              type="number"
              min={0}
              step={1}
              name="num_global_ints"
            />
          </label>
          <label>
            <span>Local byte slices</span>
            <input
              defaultValue={0}
              type="number"
              min={0}
              step={1}
              name="num_local_byte_slices"
            />
          </label>
          <label>
            <span>Local integers</span>
            <input
              defaultValue={0}
              type="number"
              min={0}
              step={1}
              name="num_local_ints"
            />
          </label>
          <label>
            <span>Extra pages</span>
            <input
              defaultValue={0}
              type="number"
              min={0}
              step={1}
              name="extra_pages"
            />
          </label>
        </fieldset>
        <button disabled={!accountAddress} type="submit">
          Deploy
        </button>
      </form>
    </>
  );
};
