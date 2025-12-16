import { Navigate, createFileRoute } from "@tanstack/react-router";

function IndexComponent() {
  return <Navigate to="/dashboard" />;
}

export const Route = createFileRoute("/")({
  component: IndexComponent,
});
