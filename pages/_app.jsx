import "../styles/globals.css";
import { SessionProvider as AuthProvider } from "next-auth/react";

function MyApp({ Component, pageProps, session }) {
  return (
    <AuthProvider session={session}>
      <Component {...pageProps} />
    </AuthProvider>
  );
}

export default MyApp;
