import { Toaster as Sonner, type ToasterProps } from "sonner"

// Toasts follow the app's light/dark setting (the `dark` class on <html>) and use its tokens.
function Toaster(props: ToasterProps) {
  return (
    <Sonner
      position="bottom-right"
      closeButton
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
