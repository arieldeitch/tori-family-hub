import { createFileRoute } from "@tanstack/react-router";
import { ShoppingListsScreen } from "@/features/shopping/ShoppingListsScreen";

export const Route = createFileRoute("/shopping/")({
  component: ShoppingListsScreen,
});
