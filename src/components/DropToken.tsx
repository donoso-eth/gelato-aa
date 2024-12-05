
import { CredentialResponse, GoogleLogin } from "@react-oauth/google";
import Loading from "../Loading";
import "./style.css";
import { Contract } from "ethers";
import { zeroAddress } from "viem";
import { KernelAccountClient } from "@zerodev/sdk";
import axios from "axios";
import { interval, Subject, takeUntil } from "rxjs";
import { TaskState } from "../types/Status";
import { useState } from "react";
const tokenDetails = {
  addrese:"0xad78b5C28070b69e6C8f144D4CBaF596d4C3CC92",
  abi:["function drop() external"]
}

let destroyFetchTask: Subject<void> = new Subject();

const fetchStatus = async (taskIdToQuery: string, setStatus:any) => {
  console.log(taskIdToQuery);

  const numbers = interval(1000);

  const takeFourNumbers = numbers.pipe(takeUntil(destroyFetchTask));

  takeFourNumbers.subscribe(async (x) => {
    try {
      // let status = await relay.getTaskStatus(taskIdToQuery);
      const res = await axios.get(
        `https://relay.gelato.digital/tasks/status/${taskIdToQuery}`
      );

      let status = res.data.task;

      let details = {
        txHash: status?.transactionHash || undefined,
        chainId: status?.chainId?.toString() || undefined,
        blockNumber: status?.blockNumber?.toString() || undefined,
        executionDate: status?.executionDate || undefined,
        creationnDate: status?.creationDate || undefined,
        taskState: (status?.taskState as TaskState) || undefined,
      };
      let body = ``;
      let header = ``;

      let txHash = details.txHash;

      switch (details.taskState!) {
        case TaskState.WaitingForConfirmation:
          header = `Transaction Relayed`;
          body = `Waiting for Confirmation`;
          break;
        case TaskState.Pending:
          header = `Transaction Relayed`;
          body = `Pending Status`;

          break;
        case TaskState.CheckPending:
          header = `Transaction Relayed`;
          body = `Simulating Transaction`;

          break;
        case TaskState.ExecPending:
          header = `Transaction Relayed`;
          body = `Pending Execution`;
          break;
        case TaskState.ExecSuccess:
          header = `Transaction Executed`;
          body = `Waiting to refresh...`;

          destroyFetchTask.next();
        

          break;
        case TaskState.Cancelled:
          header = `Canceled`;
          body = `TxHash: ${details.txHash}`;
          destroyFetchTask.next();
          break;
        case TaskState.ExecReverted:
          header = `Reverted`;
          body = `TxHash: ${details.txHash}`;
          destroyFetchTask.next();
          break;
        case TaskState.NotFound:
          header = `Not Found`;
          body = `TxHash: ${details.txHash}`;
          destroyFetchTask.next();
          break;
        case TaskState.Blacklisted:
          header = `BlackListed`;
          body = `TxHash: ${details.txHash}`;
          destroyFetchTask.next();
          break;
        default:
          // ExecSuccess = "ExecSuccess",
          // ExecReverted = "ExecReverted",
          // Blacklisted = "Blacklisted",
          // Cancelled = "Cancelled",
          // NotFound = "NotFound",
          // destroyFetchTask.next();
          break;
      }
      setStatus({message:header, taskId:details.txHash})
    
    } catch (error) {
      console.log(error);
    }
  });
};
const dropToken = async(signer:any, account:any, kernel: KernelAccountClient, setStatus:any)=> {
  setStatus({message:"", taskId:undefined})
  const tokenContract = new Contract(tokenDetails.addrese,tokenDetails.abi,signer)
  const {data} = await tokenContract.drop.populateTransaction()
  const userOpHash = await kernel.sendUserOperation({
    callData: await account.encodeCalls([
      {
        to: tokenDetails.addrese,
        value: BigInt(0),
        data:  data,
      },
    ]),
    // Gelato-specific configurations
    maxFeePerGas: BigInt(0),
    maxPriorityFeePerGas: BigInt(0),
  });
  console.log(userOpHash)
  await fetchStatus(userOpHash,setStatus)

} 

interface InputProps {
  signer:any, account:any, kernel: KernelAccountClient
}


export function DropToken({signer, account, kernel }:InputProps ) {
  const [status, setStatus]= useState<any>({});
  return (
    <>
  <div>
          <button onClick={()=>dropToken(signer,account,kernel,setStatus)} className="card passkey">
         Drop Token
      </button>
      <div style={{textAlign:'center'}}>
      <p>{status.message} {status.taskId? <a href={'https://arb-blueberry.gelatoscout.com/tx/' + status.taskId} target="_blank">{status.taskId} </a> : <></> } </p>
      </div>
      </div>
    </>
  )
}
