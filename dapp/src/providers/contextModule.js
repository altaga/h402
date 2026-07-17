/**
 * 🧠 ħ402 LABS - GLOBAL DATA CONTEXT (LEGACY CLASS PATTERN)
 * 
 * This module manages the global application state using the React Context API.
 * It primarily stores the 'chatGeneral' message history and provides synchronous/asynchronous 
 * methods for state updates (setValue and setValueAsync).
 */

import React, { useState, useCallback, useMemo } from "react";

// INITIALIZATION: Standard React Context.
const ContextModule = React.createContext();

/**
 * Global Context Provider Component
 * Holds the master application state and exposes update methods to all child components.
 */
const ContextProvider = ({ children }) => {
  const [state, setState] = useState({
    chatGeneral: [
      {
        message: `I'm ħ402 - an autonomous agent.

I can use APIs, pay per request, and execute tasks for you.
What would you like to do?`,
        type: "system",
        time: Date.now(),
        tool: "",
      },
    ],
  });

  /**
   * SET VALUE: Synchronous state update.
   * Merges the provided object into the existing global 'state'.
   */
  const setValue = useCallback((value, then = () => {}) => {
    setState((prev) => {
      const newState = { ...prev, ...value };
      // Simulate the callback of this.setState
      setTimeout(() => then(), 0);
      return newState;
    });
  }, []);

  /**
   * SET VALUE ASYNC: Promise-based state update.
   */
  const setValueAsync = useCallback(async (value, then = () => {}) => {
    return new Promise((resolve) => {
      setState((prev) => {
        const newState = { ...prev, ...value };
        setTimeout(() => {
          then();
          resolve();
        }, 0);
        return newState;
      });
    });
  }, []);

  const settleAllIntents = useCallback(() => {
    setState((prev) => ({
      ...prev,
      chatGeneral: prev.chatGeneral.map(msg => ({
        ...msg,
        settled: msg.receipt ? true : msg.settled
      }))
    }));
  }, []);

  const contextValue = useMemo(() => ({
    value: state,
    setValue,
    setValueAsync,
    settleAllIntents,
  }), [state, setValue, setValueAsync, settleAllIntents]);

  return (
    <ContextModule.Provider value={contextValue}>
      {children}
    </ContextModule.Provider>
  );
};

// EXPORT: Standard Context Consumer and default module export.
export { ContextProvider };
export const ContextConsumer = ContextModule.Consumer;
export default ContextModule;
