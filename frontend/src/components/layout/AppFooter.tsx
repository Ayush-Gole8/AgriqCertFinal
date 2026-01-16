import React from "react";
import { Link } from "react-router-dom";

export const AppFooter = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-background/80">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="font-medium text-foreground">AgriQCert</p>
          <p className="text-[11px]">
            © {year} AgriQCert. All rights reserved.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[11px]">
          <span className="inline-flex items-center rounded-full border border-border px-2 py-1">
            <span className="mr-1 h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Powered by INJI
          </span>
          <span className="inline-flex items-center rounded-full border border-border px-2 py-1">
            W3C Verifiable Credentials
          </span>
          <Link
            to="/developers"
            className="inline-flex items-center rounded-full border border-border px-2 py-1 hover:bg-accent hover:text-foreground transition-colors"
          >
            Developer Docs
          </Link>
        </div>
      </div>
    </footer>
  );
};

