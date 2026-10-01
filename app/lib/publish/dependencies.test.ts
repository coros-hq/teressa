import assert from "node:assert/strict";
import { test } from "node:test";

import { classifyImports, detectImports, normalizeImportAlias } from "./dependencies.ts";

const CODE = `
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { cn } from "@/lib/utils";
import { Bell } from "lucide-react";
import { motion } from "framer-motion/dom";
import { Slot } from "@radix-ui/react-slot";
import type { Foo } from "./local";
export { x } from "react";
`;

test("finds every import", () => {
  assert.deepEqual(detectImports(CODE).slice(0, 3), ["react", "@/components/ui/button", "~/components/ui/card"]);
});

test("splits npm packages from UI components", () => {
  const d = classifyImports(CODE);
  assert.deepEqual(d.registryDependencies, ["button", "card"]);
  assert.deepEqual(d.dependencies, ["@radix-ui/react-slot", "framer-motion", "lucide-react"]);
  assert.deepEqual(d.unsupported, ["./local"]);
});

test("rewrites the ~/ alias to @/ so the install command can place imports", () => {
  assert.equal(normalizeImportAlias(`import { A } from "~/components/ui/card";`), `import { A } from "@/components/ui/card";`);
});
