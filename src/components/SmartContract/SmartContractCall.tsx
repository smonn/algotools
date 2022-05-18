import type { ABIArgumentType, ABIInterface, ABIResult } from "algosdk";
import {
  FC,
  FormEventHandler,
  ReactElement,
  useCallback,
  useMemo,
  useState,
} from "react";
import { useParams } from "react-router-dom";
import { useAlgorand } from "../../hooks/useAlgorand";
import { usePeraWallet } from "../../hooks/usePeraWallet";
import { invariant } from "../../utils/invariant";
import { FileInput, IntegerInput, TextInput } from "../FormFields";
import { Select } from "../FormFields/Select";

type ABIArg = { type: ABIArgumentType; name?: string; description?: string };

type State =
  | "idle"
  | "validating"
  | "signing"
  | "submitting"
  | "confirming"
  | "cancelled"
  | "confirmed"
  | "error";

// TODO: add support for more ABI types
const SUPPORTED_TYPES = ["address", "uint64"];

const ABI_TYPE_INPUT_MAP: Record<
  string,
  (arg: ABIArg, index: number) => ReactElement
> = {
  address: (arg, index) => (
    <TextInput
      key={index}
      label={`${arg.name} (${arg.type})`}
      name={arg.name ?? `${arg.type}_${index}`}
      helpText={arg.description}
    />
  ),
  uint64: (arg, index) => (
    <IntegerInput
      key={index}
      label={`${arg.name} (${arg.type})`}
      name={arg.name ?? `${arg.type}_${index}`}
      min={0}
      helpText={arg.description}
    />
  ),
};

export const SmartContractCall: FC = () => {
  const params = useParams();
  const appID = useMemo(() => Number(params["id"]), [params]);
  const peraWallet = usePeraWallet();
  const algorand = useAlgorand("testnet");
  const [abi, setABI] = useState<ABIInterface>();
  const [methodName, setMethodName] = useState("");
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState("");
  const [results, setResults] = useState<ABIResult[]>([]);
  const method = useMemo(() => {
    if (!abi) return undefined;
    return algorand.getMethod(abi, methodName);
  }, [algorand, abi, methodName]);

  const onSetABI = useCallback(
    async (file: File | undefined) => {
      if (!file) {
        setABI(undefined);
        return;
      }

      const abi = algorand.makeABI(await file.text());
      const allowedMethods = abi.methods
        .slice()
        .filter((method) =>
          method.args.every((arg) => SUPPORTED_TYPES.includes(String(arg.type)))
        );
      setABI(abi);
      setMethodName(allowedMethods[0]?.name ?? "");
    },
    [algorand]
  );

  const onSubmit = useCallback<FormEventHandler<HTMLFormElement>>(
    async (event) => {
      setError("");
      setState("idle");
      event.preventDefault();
      if (!peraWallet.accountAddress || !method) return;

      try {
        setState("validating");
        const userInput = new FormData(event.currentTarget);

        setState("signing");
        const atc = new algorand.algosdk.AtomicTransactionComposer();
        atc.addMethodCall({
          appID,
          method,
          methodArgs: method.args.map((arg, index) => {
            const key = arg.name ?? `${arg.type}_${index}`;
            const value = userInput.get(key);
            invariant(value, `Missing value for ${key}`);

            switch (String(arg.type)) {
              case "address":
                return String(value);
              case "uint64":
                return Number(value);
              default:
                invariant(false, `Unsupported ABI argument type: ${arg.type}`);
            }
          }),
          sender: peraWallet.accountAddress,
          signer: peraWallet.getSigner(),
          suggestedParams: await algorand.suggestedParams(),
        });
        await atc.gatherSignatures();

        // setState("submitting");
        // const txIDs = await atc.submit(algorand.algod);

        setState("confirming");
        const result = await atc.execute(algorand.algod, 5);
        setResults(result.methodResults);
        setState("confirmed");
      } catch (error) {
        console.error(error);
        setState("error");
        setError((error as Error).message);
      }
    },
    [algorand, appID, method]
  );

  return (
    <>
      <h1>Smart Contract Call</h1>
      <p>For now, only supports address and uint64 ABI argument types.</p>
      {(state === "idle" || state === "error") && (
        <form onSubmit={onSubmit} noValidate>
          {error && <p>{error}</p>}

          <FileInput
            label="Application's ABI schema"
            name="abi"
            accept=".json"
            onFile={onSetABI}
          />
          {abi && (
            <>
              <Select
                label="Method"
                name="method_name"
                onSelect={setMethodName}
                defaultValue={methodName}
                options={abi.methods
                  .slice()
                  .filter((method) =>
                    method.args.every((arg) =>
                      SUPPORTED_TYPES.includes(String(arg.type))
                    )
                  )
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((method) => method.name)}
              />
              {method && (
                <>
                  {method.description && <p>{method.description}</p>}
                  <h3>Arguments</h3>
                  {method.args.map((arg, index) => {
                    const renderField = ABI_TYPE_INPUT_MAP[String(arg.type)];
                    invariant(renderField, `Unknown ABI type ${arg.type}`);
                    return renderField(arg, index);
                  })}
                </>
              )}
            </>
          )}

          <button disabled={!abi} type="submit">
            Call app
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
        <>
          <p>Transaction confirmed!</p>
          {results.map((result, index) => (
            <p key={index}>{String(result.returnValue)}</p>
          ))}
        </>
      )}
    </>
  );
};
