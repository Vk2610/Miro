"use client";

import { useEffect, useState } from "react";

import { RenameModal } from "@/components/modals/rename-modal";
import { Toaster } from "@/components/ui/sonner";

export const ModalProvider = () => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }
  
  return (
    <>
      <Toaster />
      <RenameModal />
    </>
  );
};
