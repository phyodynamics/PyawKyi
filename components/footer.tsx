"use client";

import { motion } from "framer-motion";

export function Footer() {
  return (
    <motion.footer
      className="w-full py-4 text-center mt-auto shrink-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.5 }}
    >
      <p className="text-sm text-muted-foreground">
        Built by{" "}
        <a
          href="https://phyodynamic.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-foreground hover:underline underline-offset-4 transition-colors"
        >
          Phyo Zin Ko
        </a>
      </p>
    </motion.footer>
  );
}
