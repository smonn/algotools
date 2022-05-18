import type { Transaction } from "algosdk";
import { FC, FormEventHandler, useCallback, useState } from "react";
import { validate } from "superstruct";
import { useAlgorand } from "../../hooks/useAlgorand";
import { usePeraWallet } from "../../hooks/usePeraWallet";
import { calculateCost } from "../../utils/algorand";
import type { DeepPartial, TextFile } from "../../utils/types";
import { CreateSmartContract, StateSchema } from "../../utils/validation";
import { FileInput, IntegerInput } from "../FormFields";

type State =
  | "idle"
  | "validating"
  | "signing"
  | "submitting"
  | "confirming"
  | "cancelled"
  | "confirmed"
  | "error";

export const SmartContractNew: FC = () => {
  const algorand = useAlgorand("testnet");
  const peraWallet = usePeraWallet();
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState("");
  const [appID, setAppID] = useState(0);
  const [approvalFile, setApprovalFile] = useState<TextFile>();
  const [clearStateFile, setClearStateFile] = useState<TextFile>();
  const [globalStateSchema, setGlobalStateSchema] = useState<StateSchema>({
    numByteSlices: 0,
    numInts: 0,
  });
  const [localStateSchema, setLocalStateSchema] = useState<StateSchema>({
    numByteSlices: 0,
    numInts: 0,
  });
  const [extraPages, setExtraPages] = useState(0);
  const cost = calculateCost({
    extraPages,
    globalState: {
      numByteSlices: globalStateSchema.numByteSlices,
      numInts: globalStateSchema.numInts,
    },
    localState: {
      numByteSlices: localStateSchema.numByteSlices,
      numInts: localStateSchema.numInts,
    },
  });

  const onSubmit = useCallback<FormEventHandler<HTMLFormElement>>(
    async (event) => {
      setError("");

      event.preventDefault();

      if (!peraWallet.accountAddress) {
        return;
      }

      setState("validating");

      const userInput: DeepPartial<CreateSmartContract> = {
        approvalSource: approvalFile?.content,
        clearStateSource: clearStateFile?.content,
        extraPages,
        globalState: globalStateSchema,
        localState: localStateSchema,
      };

      const [error, data] = validate(userInput, CreateSmartContract);

      if (error) {
        setError(error.message);
        setState("error");
        console.error(error);
        return;
      }

      let txn: Transaction;

      try {
        setState("signing");
        txn = await algorand.applicationCreate({
          approvalProgram: await algorand.compileApp(data.approvalSource),
          clearProgram: await algorand.compileApp(data.clearStateSource),
          from: peraWallet.accountAddress,
          numGlobalByteSlices: data.globalState.numByteSlices,
          numGlobalInts: data.globalState.numInts,
          numLocalByteSlices: data.localState.numByteSlices,
          numLocalInts: data.localState.numInts,
          extraPages: data.extraPages,
          onComplete: algorand.OnApplicationComplete.NoOpOC,
        });
      } catch (error) {
        setError((error as Error).message);
        setState("error");
        console.error(error);
        return;
      }

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
        setState("error");
        setError((error as Error).message);
        console.error(error);
        return;
      }

      try {
        setState("submitting");
        await algorand.sendRawTransaction(signedTxns);
      } catch (error) {
        setError((error as Error).message);
        setState("error");
        console.error(error);
        return;
      }

      let result: Record<string, unknown>;

      try {
        setState("confirming");
        result = await algorand.waitForConfirmation(txn.txID());
      } catch (error) {
        setError((error as Error).message);
        setState("error");
        console.error(error);
        return;
      }

      setState("confirmed");
      console.log(result);
      setAppID(result["application-index"] as number);
    },
    [
      peraWallet.accountAddress,
      peraWallet.signTransaction,
      approvalFile,
      clearStateFile,
      globalStateSchema,
      localStateSchema,
      extraPages,
      algorand,
    ]
  );

  return (
    <>
      <h1>Deploy new smart contract</h1>
      <p>
        Deploys a smart contract. Once deployed, the app ID and address will be
        displayed.
      </p>
      {(state === "idle" || state === "error") && (
        <form onSubmit={onSubmit} noValidate>
          {error && <p>{error}</p>}

          <FileInput
            label="Approval TEAL"
            name="approval"
            accept=".teal"
            onFile={async (file) =>
              setApprovalFile(
                file
                  ? {
                      name: file.name,
                      size: file.size,
                      lastModified: file.lastModified,
                      content: await file.text(),
                    }
                  : undefined
              )
            }
          />
          <FileInput
            label="Clear state TEAL"
            name="clear_state"
            accept=".teal"
            onFile={async (file) =>
              setClearStateFile(
                file
                  ? {
                      name: file.name,
                      size: file.size,
                      lastModified: file.lastModified,
                      content: await file.text(),
                    }
                  : undefined
              )
            }
          />
          <fieldset>
            <legend>State schema</legend>
            <p>
              Configure how many byte slices and integers are used by the app.
            </p>
            <p>
              Creator min. balance increase: {cost.appCreate.toLocaleString()}{" "}
              microAlgos
            </p>
            <p>
              Opt-in min. balance increase: {cost.appOptIn.toLocaleString()}{" "}
              microAlgos
            </p>
            <IntegerInput
              label="Global byte slices"
              name="num_global_byte_slices"
              min={0}
              max={64}
              onInteger={(numByteSlices) =>
                setGlobalStateSchema((s) => ({ ...s, numByteSlices }))
              }
            />
            <IntegerInput
              label="Global integers"
              name="num_global_ints"
              min={0}
              max={64}
              onInteger={(numInts) =>
                setGlobalStateSchema((s) => ({ ...s, numInts }))
              }
            />
            <IntegerInput
              label="Local byte slices"
              name="num_local_byte_slices"
              min={0}
              max={16}
              onInteger={(numByteSlices) =>
                setLocalStateSchema((s) => ({ ...s, numByteSlices }))
              }
            />
            <IntegerInput
              label="Local integers"
              name="num_local_ints"
              min={0}
              max={16}
              onInteger={(numInts) =>
                setLocalStateSchema((s) => ({ ...s, numInts }))
              }
            />
            <IntegerInput
              label="Extra pages"
              name="extra_pages"
              min={0}
              max={3}
              onInteger={setExtraPages}
            />
          </fieldset>
          <button disabled={!peraWallet.accountAddress} type="submit">
            Deploy
          </button>
        </form>
      )}

      {state === "validating" && <p>Validating form data...</p>}
      {state === "signing" && <p>Signing, open Pera Wallet...</p>}
      {state === "submitting" && <p>Submitting transaction to blockchain...</p>}
      {state === "confirming" && (
        <p>Waiting for transaction to be confirmed...</p>
      )}
      {state === "confirmed" && (
        <p>
          Transaction confirmed! Created app {appID} with address{" "}
          {algorand.applicationAddress(appID)}.
        </p>
      )}
    </>
  );
};
