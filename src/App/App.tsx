import { useEffect, useState, useRef } from "react";

// Import Single Factor Auth SDK for no redirect flow
import { Web3Auth, decodeToken } from "@web3auth/single-factor-auth";
import { ADAPTER_EVENTS, CHAIN_NAMESPACES, IProvider, WEB3AUTH_NETWORK } from "@web3auth/base";
import { EthereumPrivateKeyProvider } from "@web3auth/ethereum-provider";
import { PasskeysPlugin } from "@web3auth/passkeys-sfa-plugin";
import { WalletServicesPlugin } from "@web3auth/wallet-services-plugin";
import { privateKeyToAccount , generatePrivateKey} from "viem/accounts";
import {
  entryPoint07Address,
  EntryPointVersion, entryPoint06Address
} from "viem/account-abstraction";
import { GoogleLogin, CredentialResponse, googleLogout } from "@react-oauth/google";

import {
  createKernelAccount,
  createZeroDevPaymasterClient,
  createKernelAccountClient,
  KernelAccountClient,
  KernelSmartAccountImplementation, KernelSmartAccountV1Implementation
} from "@zerodev/sdk";
import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator";

// RPC libraries for blockchain calls
// import RPC from "./evm.web3";
// import RPC from "./evm.viem";
import RPC from "../evm.ethers";

import Loading from "../Loading";
import "./App.css";
import { shouldSupportPasskey } from "../utils";
import { KERNEL_V2_4 } from "@zerodev/sdk/constants";
import { Address, createPublicClient, http, zeroAddress } from "viem";
import { ethers, Signer } from "ethers";
import { logoutView } from "../components/Logout";
import { DropToken } from "../components/DropToken";
import { UserInfo } from "../components/UserInfo";

const verifier = "w3a-sfa-web-google";

const clientId = "KEY"; // get from https://dashboard.web3auth.io
let blueberry ={
  id: 88153591557,
  network: "blueberry",
  name: "Arbitrum Orbit Blueberry",
  nativeCurrency: {
    name: "CGT",
    symbol: "CGT",
    decimals: 18,
  },
  rpcUrls: {
    public: {
      http: ["https://rpc.arb-blueberry.gelato.digital"],
    },
    default: {
      http: ["https://rpc.arb-blueberry.gelato.digital"],
    },
  },
  blockExplorers: {
    default: {
      name: "Block Scout",
      url: "https://arb-blueberry.gelatoscout.com/",
    },
  },
  contracts: {
  },
  testnet: true,
}
const chainConfig = {
  chainId: ethers.toBeHex(blueberry.id),
  displayName: "Ethereum Sepolia Testnet",
  chainNamespace: CHAIN_NAMESPACES.EIP155,
  tickerName: "Ethereum",
  ticker: "ETH",
  decimals: 18,
  rpcTarget: blueberry.rpcUrls.default.http[0],
  blockExplorerUrl:blueberry.blockExplorers.default.url,
  logo: "https://cryptologos.cc/logos/polygon-matic-logo.png",
 
};

function App() {
  const [isDeployed, setIsDeployed]= useState<boolean>(false);
  const [user,setUser] = useState<{name:string, email:string, passkeys:string[]}>({name:"", email:"", passkeys:[]})
  const [kernel, setKernel]= useState<KernelAccountClient | null>(null);
  const [smartAccount,setSmartAccount] = useState<any| null>(null)

  const [web3authSFAuth, setWeb3authSFAuth] = useState<Web3Auth | null>(null);
  const [provider, setProvider] = useState<IProvider | null>(null);
  const [signer, setSigner] = useState<any | null>(null);
  const [pkPlugin, setPkPlugin] = useState<PasskeysPlugin | null>(null);
  const [wsPlugin, setWsPlugin] = useState<WalletServicesPlugin | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isModal,setIsmodal] = useState(false)
  const [rpID, setRpID] = useState<string>("");
  const [rpName, setRpName] = useState<string>("");

  useEffect(() => {
    const init = async () => {
      if (window.location.hostname === "localhost") {
        setRpID("localhost");
        setRpName("localhost");
      } else {
        const hostnameParts = window.location.hostname.split(".");
        if (hostnameParts.length >= 2) {
          setRpID(hostnameParts.slice(-2).join("."));
          setRpName(window.location.hostname);
        } else {
          setRpID(window.location.hostname);
          setRpName(window.location.hostname);
        }
      }
      try {
        const ethereumPrivateKeyProvider = new EthereumPrivateKeyProvider({
          config: { chainConfig },
        });
        // Initialising Web3Auth Single Factor Auth SDK
        const web3authSfa = new Web3Auth({
          clientId, // Get your Client ID from Web3Auth Dashboard
          web3AuthNetwork: WEB3AUTH_NETWORK.SAPPHIRE_MAINNET, // ["sapphire_mainnet", "sapphire_devnet", "mainnet", "cyan", "aqua", and "testnet"]
          usePnPKey: false, // Setting this to true returns the same key as PnP Web SDK, By default, this SDK returns CoreKitKey.
          privateKeyProvider: ethereumPrivateKeyProvider,
        });
        const plugin = new PasskeysPlugin({
          rpID,
          rpName,
          buildEnv: "production",
        });
        web3authSfa?.addPlugin(plugin);
        setPkPlugin(plugin);
        const wsPlugin = new WalletServicesPlugin({
          walletInitOptions: {
            whiteLabel: {
              logoLight: "https://web3auth.io/images/web3auth-logo.svg",
              logoDark: "https://web3auth.io/images/web3auth-logo.svg",
            },
          },
        });
        web3authSfa?.addPlugin(wsPlugin);
        setWsPlugin(wsPlugin);
        web3authSfa.on(ADAPTER_EVENTS.CONNECTED, (data) => {
          console.log("sfa:connected", data);
          console.log("sfa:state", web3authSfa?.state);
          createKernelObject(web3authSfa,plugin)
          setProvider(web3authSfa.provider);
        });
        web3authSfa.on(ADAPTER_EVENTS.DISCONNECTED, () => {
          console.log("sfa:disconnected");
          setProvider(null);
        });
        await web3authSfa.init();
        setWeb3authSFAuth(web3authSfa);
       
        // (window as any).web3auth = web3authSfa;
      } catch (error) {
        console.error(error);
      }
    };

    init();
  }, []);

  const onSuccess = async (response: CredentialResponse) => {
    try {
      if (!web3authSFAuth) {
        uiConsole("Web3Auth Single Factor Auth SDK not initialized yet");
        return;
      }
      setIsLoggingIn(true);
      setIsmodal(false)
      const idToken = response.credential;
      // console.log(idToken);
      if (!idToken) {
        setIsLoggingIn(false);
        return;
      }
      const { payload } = decodeToken(idToken);
      await web3authSFAuth.connect({
        verifier,
        verifierId: (payload as any)?.email,
        idToken: idToken!,
      });

   

   
      setIsLoggingIn(false);
      setIsmodal(false)
    } catch (err) {
      // Single Factor Auth SDK throws an error if the user has already enabled MFA
      // One can use the Web3AuthNoModal SDK to handle this case
      setIsLoggingIn(false);
      setIsmodal(false)
      console.error(err);
    }
  };

  const loginWithPasskey = async () => {
    try {
      
      if (!pkPlugin) throw new Error("Passkey plugin not initialized");
      const result = shouldSupportPasskey();
      if (!result.isBrowserSupported) {
        uiConsole("Browser not supported");
        return;
      }
      await pkPlugin.loginWithPasskey();
      uiConsole("Passkey logged in successfully");
      setIsLoggingIn(true);
      setIsmodal(false)
    } catch (error) {
      console.error((error as Error).message);
      uiConsole((error as Error).message);
    } finally {
      setIsLoggingIn(false);
      setIsmodal(false)
    }
  };

  const listAllPasskeys = async (pkPlugin:PasskeysPlugin) => {
    console.log(221)
    if (!pkPlugin) {
      uiConsole("plugin not initialized yet");
      return;
    }
    const res = await pkPlugin.listAllPasskeys();

    let passkeys = res.map(object=> object.credential_id)
    return passkeys

  };

  const getUserInfo = async (web3authSFAuth:Web3Auth,pkPlugin:PasskeysPlugin) => {
  
    if (!web3authSFAuth) {
      uiConsole("Web3Auth Single Factor Auth SDK not initialized yet");
      return;
    }
    const getUserInfo = await web3authSFAuth.getUserInfo();
   let passkeys =  await listAllPasskeys(pkPlugin)

    return { name: getUserInfo.name!, email:getUserInfo.email!, passkeys:passkeys!}

  };

  const logout = async () => {
    if (!web3authSFAuth) {
      uiConsole("Web3Auth Single Factor Auth SDK not initialized yet");
      return;
    }
    googleLogout();
    web3authSFAuth.logout();
    return;
  };


  const createKernelObject = async (web3authSFAuth: Web3Auth, pkPlugin:PasskeysPlugin)=> {
    let privatekey = ("0x" +
      (await web3authSFAuth.provider?.request({
        method: "eth_private_key", // use "private_key" for other non-evm chains
      }))) as "0x${string}";
    const _signer = privateKeyToAccount(
      privatekey
    );

    setSigner(_signer)

    const publicClient = createPublicClient({
      transport: http("https://rpc.arb-blueberry.gelato.digital"),
      chain:{
        id: 88153591557,
        network: "blueberry",
        name: "Arbitrum Orbit Blueberry",
        nativeCurrency: {
          name: "CGT",
          symbol: "CGT",
          decimals: 18,
        },
        rpcUrls: {
          public: {
            http: ["https://rpc.arb-blueberry.gelato.digital"],
          },
          default: {
            http: ["https://rpc.arb-blueberry.gelato.digital"],
          },
        },
        blockExplorers: {
          default: {
            name: "Block Scout",
            url: "https://arb-blueberry.gelatoscout.com/",
          },
        },
        contracts: {
        },
        testnet: true,
      },
    });
 
   
    const entryPoint = {
      address: entryPoint06Address as Address,
      version: "0.6" as EntryPointVersion,
    };

    const kernelVersion = KERNEL_V2_4;
    const ecdsaValidator = await signerToEcdsaValidator(publicClient, {
      signer:_signer,
      entryPoint,
      kernelVersion,
    });
    const account = await createKernelAccount(publicClient, {
      plugins: {
        sudo: ecdsaValidator,
      },
      entryPoint,
      kernelVersion,
    });
     console.log("My account:", account.address);

    setSmartAccount(account)
    let deployed = await account.isDeployed()
    setIsDeployed(deployed)
    console.log(deployed, 324)
     const kernelClient = createKernelAccountClient({
      account,
      chain: {
        id: 88153591557,
        network: "blueberry",
        name: "Arbitrum Orbit Blueberry",
        nativeCurrency: {
          name: "CGT",
          symbol: "CGT",
          decimals: 18,
        },
        rpcUrls: {
          public: {
            http: ["https://rpc.arb-blueberry.gelato.digital"],
          },
          default: {
            http: ["https://rpc.arb-blueberry.gelato.digital"],
          },
        },
        blockExplorers: {
          default: {
            name: "Block Scout",
            url: "https://arb-blueberry.gelatoscout.com/",
          },
        },
        contracts: {
        },
        testnet: true,
      },
      bundlerTransport: http(
        "https://api.gelato.digital/bundlers/88153591557/rpc?sponsorApiKey=i8_8EpLHUrFGu4sSbFGHGlXtXcljIuv553g_ItudW4o_"
      ),
    });

    setKernel(kernelClient)

    let user = await getUserInfo(web3authSFAuth, pkPlugin)
    setUser(user!)

  }



  const openModal = async () => { 
    setIsmodal(true)
  }



  const registerPasskey = async () => {
    try {
      if (!pkPlugin || !web3authSFAuth) {
        uiConsole("plugin not initialized yet");
        return;
      }
      const result = shouldSupportPasskey();
      if (!result.isBrowserSupported) {
        uiConsole("Browser not supported");
        return;
      }
      const userInfo = await web3authSFAuth?.getUserInfo();
      const res = await pkPlugin.registerPasskey({
        username: `google|${userInfo?.email || userInfo?.name} - ${new Date().toLocaleDateString("en-GB")}`,
      });
      console.log("res", res);
      if (res) uiConsole("Passkey saved successfully");
    } catch (error: unknown) {
      uiConsole((error as Error).message);
    }
  };

  


  function uiConsole(...args: any[]): void {
    const el = document.querySelector("#console>p");
    if (el) {
      el.innerHTML = JSON.stringify(args || {}, null, 2);
    }
  }

  const closeModal = async() => {
    setIsmodal(false)
    
  }

  const loginView = (
    <>
    <UserInfo user={user} account={smartAccount} isDeployed={isDeployed} />
      <div className="">
     
     
    
        <div>
          <button onClick={registerPasskey} className="card">
            Register passkey
          </button>
        </div>
        <div>
        <DropToken signer={signer} account={smartAccount} kernel={kernel!}/>
        </div>
        <div>
          <button onClick={logout} className="card">
            Log Out
          </button>
        </div>
      </div>

      <div id="console" style={{ whiteSpace: "pre-line" }}>
        <p style={{ whiteSpace: "pre-line" }}></p>
      </div>
    </>
  );


  return (
    <div className="container">
      <h1 className="title">
        Gelato AA
      </h1>
   
   

      {isLoggingIn ? <Loading /> : <div className="grid">{web3authSFAuth ? (provider ? loginView : logoutView({isModal,onSuccess,loginWithPasskey,closeModal, openModal})) : null}</div>}

   
    </div>
  );
}

export default App;
