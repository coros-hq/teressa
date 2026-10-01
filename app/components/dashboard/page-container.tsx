import { cn } from "~/lib/utils";

// Centers page content at about 1200px with responsive padding.
export function PageContainer({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-[1200px] flex-col gap-6 p-4 sm:p-6 lg:p-8",
        className
      )}
      {...props}
    />
  );
}
