"use client";
import React, { createContext, useContext, useEffect, useReducer } from "react";
import {  deleteAxiosDefaultToken, gameAxios, setAxiosDefaultToken } from "@/lib/axios";
import { tokenStorage } from "@/lib/tokens";

export interface User {
  account_name: string;
  account_number: string;
  bank_name: string;
  token_units: number;
  earnings_balance: number;
  current_balance: number;
  overall_wallet_balance: number;
  player_name: string;
  contestant_id: number;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
}

type AuthAction =
  | { type: "LOGIN"; payload: User }
  | { type: "LOGOUT" }
  | { type: "STOP_LOADING" }
  | { type: "UPDATE_USER"; payload: Partial<User> };

interface AuthContextType {
  authState: AuthState;
  authDispatch: React.Dispatch<AuthAction>;
  ensureToken: () => string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  isLoading: true,
};

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  try {
    switch (action.type) {
      case "LOGIN":
        tokenStorage.setUser(action.payload);
        return {
          ...state,
          isAuthenticated: true,
          user: action.payload,
          isLoading: false,
        };
      case "UPDATE_USER":
        const updatedUser = state.user ? { ...state.user, ...action.payload } : null;
        if (updatedUser) tokenStorage.setUser(updatedUser);
        return { ...state, user: updatedUser };
      case "LOGOUT":
        try {
          tokenStorage.clearToken();
          deleteAxiosDefaultToken();
        } catch (error) {
          console.error("❌ Error during logout:", error);
        }
        return {
          ...state,
          isAuthenticated: false,
          user: null,
          isLoading: false,
        };
      case "STOP_LOADING":
        return { ...state, isLoading: false };
      default:
        return state;
    }
  } catch (error) {
    console.error("❌ Auth reducer error:", error);
    return { ...state, isLoading: false };
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, authDispatch] = useReducer(authReducer, initialState);

  const ensureToken = (): string | null => {
    const token = tokenStorage.getToken();
    if (token) {
      setAxiosDefaultToken(token, gameAxios);
      return token;
    }
    return null;
  };

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const token = tokenStorage.getToken();
        const storedUser = tokenStorage.getUser();
        if (token) {
          setAxiosDefaultToken(token, gameAxios);
        }
        if (storedUser) {
          authDispatch({ type: "LOGIN", payload: storedUser });
        }
      } finally {
        authDispatch({ type: "STOP_LOADING" });
      }
    };
    initializeAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ authState, authDispatch, ensureToken }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
