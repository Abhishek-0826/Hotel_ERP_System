import { AlertTriangle } from "../icons";
import Button from "./Button";

export default function ErrorState({ message = "Something went wrong.", onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-rose-100 bg-rose-50/60 px-6 py-14 text-center">
      <div className="grid h-11 w-11 place-items-center rounded-full bg-rose-100 text-rose-600">
        <AlertTriangle size={20} />
      </div>
      <p className="max-w-sm text-sm font-medium text-rose-700">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
