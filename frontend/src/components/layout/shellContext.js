import { createContext, useContext } from "react";

export const InShellContext = createContext(false);

/** True when the page already sits inside the sidebar layout, so it should skip its own navbar/footer. */
export const useInShell = () => useContext(InShellContext);
