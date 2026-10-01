import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";

// Empty cards that show the spacing and grid rhythm. Delete once real content exists.
export function PlaceholderGrid() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <Card key={i}>
          <CardHeader>
            <CardTitle>Card title</CardTitle>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-24 w-full motion-reduce:animate-none" />
          </CardContent>
        </Card>
      ))}
      <Card className="md:col-span-3">
        <CardHeader>
          <CardTitle>Wide card title</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full motion-reduce:animate-none" />
        </CardContent>
      </Card>
    </div>
  );
}
