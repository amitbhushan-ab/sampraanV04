import { trpc } from "@/lib/trpc";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import "./index.css";
import "./styles/landing.css";
import "./styles/workspace.css";

// Presentation reliability: the session cookie is browser-wide (one cookie per
// browser profile, shared by every tab). When the server-side identity
// changes (login/logout in any tab), ALL cached domain data in this tab must
// be dropped — otherwise a tab can briefly render the previous user's rows.
// auth.me is the identity source of truth; every other query hangs below it
// via useQuery enabled:isAuthenticated in useSampraanData.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Refetch when the tab regains focus (presentation switching between
      // browser windows) so identities/dashboards never sit stale.
      refetchOnWindowFocus: true,
    },
  },
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      headers() {
        return {};
      },
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>
);
