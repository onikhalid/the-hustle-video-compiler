"use client";

import {
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from "@tanstack/react-query";
import React from "react";
import { MQTTProvider } from "./MQTTProvider";
import { AuthProvider } from "./AuthContext";

const AllProviders = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MQTTProvider>{children}</MQTTProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default AllProviders;
