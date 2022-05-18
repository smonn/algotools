import type { FC } from "react";
import { Link, Outlet } from "react-router-dom";
import * as css from "./Layout.module.css";

export const Layout: FC = () => {
  return (
    <div className={css["Layout"]}>
      <nav>
        <ul>
          <li>
            <Link to="/">Home</Link>
          </li>
          <li>
            <Link to="/smart-contract">Created Smart Contracts</Link>
          </li>
          <li>
            <Link to="/smart-contract/new">Create New Smart Contract</Link>
          </li>
        </ul>
      </nav>

      <Outlet />
    </div>
  );
};
