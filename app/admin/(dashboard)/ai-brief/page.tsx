import { AiBriefClient } from "./AiBriefClient";
import { GAME_AI_SPEC } from "@/lib/ai-brief/spec-text";

export default function AdminAiBriefPage() {
  return <AiBriefClient template={GAME_AI_SPEC} />;
}
