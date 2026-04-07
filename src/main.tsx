import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { installApiAuthFetch } from "@/lib/apiAuthFetch";

installApiAuthFetch();

createRoot(document.getElementById("root")!).render(<App />);
