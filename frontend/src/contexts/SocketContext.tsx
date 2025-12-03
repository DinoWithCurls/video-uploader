import React, { createContext, useEffect, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "../hooks/useAuth";
import logger from "../utils/logger";

interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
  subscribe: (event: string, handler: (...args: any[]) => void) => () => void;
}

export const SocketContext = createContext<SocketContextType | null>(null);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const { token } = useAuth();

  useEffect(() => {
    if (!token) {
      // Disconnect if no token
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setConnected(false);
      }
      return;
    }

    // Connect to Socket.io server
    const socketUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || "http://localhost:3001";
    const newSocket = io(socketUrl, {
      auth: { token },
      autoConnect: true,
    });

    newSocket.on("connect", () => {
      logger.info("[SocketContext] Socket.io connected");
      setConnected(true);
    });

    newSocket.on("disconnect", () => {
      logger.info("[SocketContext] Socket.io disconnected");
      setConnected(false);
    });

    newSocket.on("connect_error", (error) => {
      console.error("Socket.io connection error:", error);
      setConnected(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [token]);

  const subscribe = useCallback(
    (event: string, handler: (...args: any[]) => void) => {
      if (!socket) return () => {};

      socket.on(event, handler);

      // Return unsubscribe function
      return () => {
        socket.off(event, handler);
      };
    },
    [socket]
  );

  return (
    <SocketContext.Provider value={{ socket, connected, subscribe }}>
      {children}
    </SocketContext.Provider>
  );
};
