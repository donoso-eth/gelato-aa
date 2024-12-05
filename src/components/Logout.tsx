
import { CredentialResponse, GoogleLogin } from "@react-oauth/google";
import Loading from "../Loading";
import "./style.css";
import { useState } from "react";

interface InputProps {
  isModal:boolean;
  onSuccess:(response: CredentialResponse)=>void,
  loginWithPasskey:()=>void, 
  closeModal:()=>void,
  openModal:()=>{} 
}


export function logoutView({isModal,onSuccess,loginWithPasskey, closeModal,openModal  }:InputProps ) {

  return (
    <>
    {isModal ?  <>
      <GoogleLogin onSuccess={onSuccess} useOneTap />
      <p className="grid">Sign in with Google and register passkeys before doing Login with Passkey</p>
      <button onClick={loginWithPasskey} className="card passkey">
        Login with Passkey
      </button>
      <button id="closeModal"onClick={closeModal}  className="modal-close-btn">Close</button>
      </>
     :<div>
          <button onClick={openModal} className="card passkey">
          Login 
      </button>
      </div>
    }
    </>
  )
}
