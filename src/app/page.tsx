import { ReviewWorkspace } from "@/components/ReviewWorkspace";
import { toCallView } from "@/lib/callView";
import { listCalls } from "@/lib/calls";

export default function Home() {
  const calls = listCalls().map(toCallView);
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="border-b border-slate-200 px-4 py-3 lg:px-6">
        <h1 className="text-lg font-semibold text-slate-900">
          Call Summary QA Review
        </h1>
        <p className="text-sm text-slate-600">
          Check whether each summary reflects its transcript and the summary
          rules. All calls are synthetic.
        </p>
      </header>
      <ReviewWorkspace calls={calls} />
    </div>
  );
}
