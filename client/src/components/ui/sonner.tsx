import { useTheme } from "@/contexts/ThemeContext";
import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      style={
        {
          // Bound to this project's tokens. The stock shadcn names
          // (--popover, --popover-foreground, --border) are not declared by the
          // SAMPRAAN theme, so referencing them left every toast unpainted.
          "--normal-bg": "var(--panel)",
          "--normal-text": "var(--text)",
          "--normal-border": "var(--material-hairline-strong)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
