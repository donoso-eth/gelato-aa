import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App/App";
import reportWebVitals from "./reportWebVitals";
import { GoogleOAuthProvider } from "@react-oauth/google";

const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);
root.render(
  <GoogleOAuthProvider clientId="519228911939-cri01h55lsjbsia1k7ll6qpalrus75ps.apps.googleusercontent.com">
    <App />
  </GoogleOAuthProvider>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
