import { useSession, signOut } from "next-auth/react";
import LoadingDots from "./LoadingDots";

const Navigation = () => {
  const { data: session, status } = useSession({ required: true });
  // console.log({ session, status });

  const callWebhook = async () => {
    const response = await fetch("/api/shopify-webhook");
  };
  return (
    <div>
      {status === "loading" ? (
        <div>
          <LoadingDots />
        </div>
      ) : (
        <div>
          <button onClick={() => signOut()}>Sign Out</button>
          <div>
            <button onClick={callWebhook}>Call Webhook</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Navigation;
