

interface InputProps {
  user: { name: string; email: string; passkeys: string[] };
  account:any;
  isDeployed:boolean;
}

export function UserInfo({ user, account, isDeployed }: InputProps) {
  console.log(10)
  console.log(isDeployed)
  console.log(account?.address)
  return (
    <>
      <div>
        <p>Name: {user.name}</p>
        <p>Email: {user.email}</p>
        <p>Account <a href={'https://arb-blueberry.gelatoscout.com/address/' + account?.address} target="_blank">{account?.address} </a></p>
        <p>IsDeployed: {isDeployed ? "true" : "false"}</p>
        <p style={{fontWeight:'bold'}} >Registered Passkeys</p>
        {user.passkeys &&  user.passkeys.length >0 ? user.passkeys.map((passkey, index) => <p key={index}>{passkey}</p>): <p>NONE</p>}
      </div>
    </>
  );
}
