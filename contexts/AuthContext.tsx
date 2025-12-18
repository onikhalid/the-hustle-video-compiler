"use client";
import React, { createContext, useContext, useEffect, useReducer } from "react";
import {
  deleteAxiosDefaultToken,
  gameAxios,
  setAxiosDefaultToken,
} from "@/lib/axios";
import { tokenStorage } from "@/lib/tokens";
import { useRouter } from "next/navigation";

interface User {
  user_id: number;
  username: string;
  email: string;
  phone_number: string;
  first_name: string;
  last_name: string;
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
        const updatedUser = state.user
          ? { ...state.user, ...action.payload }
          : null;
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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [authState, authDispatch] = useReducer(authReducer, initialState);
  const router = useRouter();
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
        if (token) {
          setAxiosDefaultToken(token, gameAxios);
          const res = await gameAxios.get("/api/accounts/user/details");
          console.log(res.data);
          authDispatch({ type: "LOGIN", payload: res.data?.data as User });
        } else {
          authDispatch({ type: "STOP_LOADING" });
          authDispatch({ type: "LOGOUT" });
          router.push("/login");
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
