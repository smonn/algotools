import { FC, useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAlgorand } from "../../hooks/useAlgorand";
import { usePeraWallet } from "../../hooks/usePeraWallet";

type State = "idle" | "deleting" | "error";

export const SmartContractList: FC = () => {
  const peraWallet = usePeraWallet();
  const algorand = useAlgorand("testnet");
  const [apps, setApps] = useState([]);
  const [error, setError] = useState("");
  const [state, setState] = useState<State>("idle");

  useEffect(() => {
    (async () => {
      if (peraWallet.accountAddress) {
        setApps((await algorand.applications(peraWallet.accountAddress)) ?? []);
      }
    })();
  }, [peraWallet.accountAddress, algorand]);

  const deleteApp = useCallback(
    async (appID: number) => {
      try {
        setState("deleting");
        const txn = await algorand.applicationDelete({
          appIndex: appID,
          from: peraWallet.accountAddress,
        });

        const signedTxn = await peraWallet.signTransaction([[{ txn }]]);
        await algorand.sendRawTransaction(signedTxn);
        await algorand.waitForConfirmation(txn.txID());

        setApps((await algorand.applications(peraWallet.accountAddress)) ?? []);
        setState("idle");
      } catch (error) {
        setState("error");
        setError((error as Error).message);
        console.error(error);
      }
    },
    [algorand, peraWallet]
  );

  return (
    <div>
      <h1>Created Smart Contracts</h1>
      {error && <p>{error}</p>}
      {apps.length ? (
        <ul>
          {apps.map((app) => (
            <li key={app["id"]}>
              {app["id"]}{" "}
              <Link to={`/smart-contract/call/${app["id"]}`}>Call</Link>
              <button
                disabled={state === "deleting"}
                type="button"
                onClick={() => deleteApp(app["id"])}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p>You have not created any apps with this account.</p>
      )}
    </div>
  );
};
