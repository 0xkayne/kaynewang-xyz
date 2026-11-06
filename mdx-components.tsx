import type { MDXComponents } from "mdx/types";
import { Callout } from "@/components/callout";

const components: MDXComponents = {
  Callout,
};

export function useMDXComponents(): MDXComponents {
  return components;
}
